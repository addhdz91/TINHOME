import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  daysBetween,
  isIsoDate,
  toIsoDate,
  validateExchangeProposal,
} from '@tinhome/shared/domain';
import { useMe } from '@/app/auth/auth-context';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useActiveWindows } from '@/features/cities';
import { useMyHome } from '@/features/home';
import { usePublicConfig } from '@/hooks/use-public-config';
import { toUserMessage } from '@/lib/app-error';
import { getHomeDetail, proposeExchange } from '@/lib/callables';
import { formatIsoDate } from '@/lib/format';

const NOTE_MAX = 300;

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold" id={`${label}-label`}>
        {label}
      </span>
      <div className="flex items-center gap-3" role="group" aria-labelledby={`${label}-label`}>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={t('exchange.propose.less', { label })}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </Button>
        <output aria-live="polite" className="min-w-8 text-center text-h3 tabular-nums">
          {value}
        </output>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={t('exchange.propose.more', { label })}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </div>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </div>
  );
}

/**
 * S-09 / FR-30 — declare an exchange from the match: dates (with window shortcuts), people and
 * pets of each side within the destination home (BR-15, also checked by the server), note.
 */
export function ProposeExchangeSheet({
  open,
  onOpenChange,
  matchId,
  otherUid,
  otherName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  otherUid: string;
  otherName: string;
}) {
  const { t } = useTranslation();
  const me = useMe();
  const navigate = useNavigate();
  const myHome = useMyHome();
  const theirHome = useQuery({
    queryKey: ['home-detail', otherUid],
    queryFn: () => getHomeDetail({ homeId: otherUid }),
    enabled: open,
  });
  const windows = useActiveWindows();
  const config = usePublicConfig();
  const today = toIsoDate(new Date());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [myGuests, setMyGuests] = useState(1);
  const [theirGuests, setTheirGuests] = useState(1);
  const [myPets, setMyPets] = useState(0);
  const [theirPets, setTheirPets] = useState(0);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      proposeExchange({
        matchId,
        startDate,
        endDate,
        guests: { [me.uid]: myGuests, [otherUid]: theirGuests },
        pets: { [me.uid]: myPets, [otherUid]: theirPets },
        note,
      }),
    onSuccess: ({ exchange }) => {
      toast.success(t('exchange.propose.sent', { name: otherName }));
      onOpenChange(false);
      void navigate(`/app/intercambios/${exchange.id}`);
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  let content;
  if (myHome.isPending || theirHome.isPending) content = <Skeleton className="h-80" />;
  else if (myHome.isError || theirHome.isError || !myHome.data)
    content = <ErrorState onRetry={() => void theirHome.refetch()} />;
  else {
    const mine = {
      maxGuests: myHome.data.maxGuests ?? 1,
      petsAllowed: myHome.data.petsAllowed === true,
    };
    const theirs = theirHome.data.home;
    const maxNights = config.data?.exchangeMaxNights ?? 60;
    const datesValid = isIsoDate(startDate) && isIsoDate(endDate);
    const check = datesValid
      ? validateExchangeProposal({
          today,
          startDate,
          endDate,
          maxNights,
          sides: [
            { uid: me.uid, guests: myGuests, pets: myPets },
            { uid: otherUid, guests: theirGuests, pets: theirPets },
          ],
          destinations: {
            [me.uid]: { maxGuests: theirs.maxGuests, petsAllowed: theirs.petsAllowed },
            [otherUid]: { maxGuests: mine.maxGuests, petsAllowed: mine.petsAllowed },
          },
        })
      : null;
    const nights = datesValid ? daysBetween(startDate, endDate) : 0;
    const dateError =
      touched && (!datesValid || (check && !check.ok && check.error === 'E_EXCHANGE_DATES'))
        ? t('exchange.propose.datesError', { max: maxNights })
        : undefined;
    const shortcuts = (windows.data ?? []).filter((w) => w.endDate > today);
    content = (
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (check?.ok) submit.mutate();
        }}
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-semibold">{t('exchange.propose.dates')}</legend>
          {shortcuts.length ? (
            <ul className="flex flex-wrap gap-2" aria-label={t('exchange.propose.shortcuts')}>
              {shortcuts.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className="min-h-11 rounded-full border border-border px-3 text-sm hover:bg-surface-muted"
                    onClick={() => {
                      setStartDate(w.startDate > today ? w.startDate : today);
                      setEndDate(w.endDate);
                    }}
                  >
                    {w.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <TextField
              type="date"
              label={t('exchange.propose.start')}
              value={startDate}
              min={today}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <TextField
              type="date"
              label={t('exchange.propose.end')}
              value={endDate}
              min={startDate || today}
              onChange={(event) => setEndDate(event.target.value)}
              error={dateError}
            />
          </div>
          {nights > 0 ? (
            <p className="text-sm text-muted">{t('exchange.nights', { count: nights })}</p>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stepper
            label={t('exchange.propose.myGuests', { name: otherName })}
            value={myGuests}
            min={1}
            max={theirs.maxGuests}
            onChange={setMyGuests}
            hint={t('exchange.propose.capacity', { count: theirs.maxGuests })}
          />
          <Stepper
            label={t('exchange.propose.theirGuests', { name: otherName })}
            value={theirGuests}
            min={1}
            max={mine.maxGuests}
            onChange={setTheirGuests}
            hint={t('exchange.propose.capacity', { count: mine.maxGuests })}
          />
          {theirs.petsAllowed ? (
            <Stepper
              label={t('exchange.propose.myPets')}
              value={myPets}
              min={0}
              max={5}
              onChange={setMyPets}
            />
          ) : (
            <p className="text-sm text-muted">
              {t('exchange.propose.noPetsThere', { name: otherName })}
            </p>
          )}
          {mine.petsAllowed ? (
            <Stepper
              label={t('exchange.propose.theirPets', { name: otherName })}
              value={theirPets}
              min={0}
              max={5}
              onChange={setTheirPets}
            />
          ) : (
            <p className="text-sm text-muted">{t('exchange.propose.noPetsHere')}</p>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">{t('exchange.propose.note')}</span>
          <textarea
            className="min-h-24 rounded-md border border-border bg-surface p-3"
            maxLength={NOTE_MAX}
            value={note}
            placeholder={t('exchange.propose.notePlaceholder')}
            onChange={(event) => setNote(event.target.value)}
          />
          <span className="text-right text-xs text-muted">
            {t('chat.counter', { count: note.length, max: NOTE_MAX })}
          </span>
        </label>

        {check?.ok ? (
          <p className="rounded-md bg-brand-soft p-3 text-sm text-brand-text">
            {t('exchange.propose.summary', {
              start: formatIsoDate(startDate),
              end: formatIsoDate(endDate),
              count: nights,
            })}
          </p>
        ) : null}
        <p className="text-xs text-muted">{t('exchange.propose.disclaimer')}</p>
        <Button type="submit" size="lg" disabled={submit.isPending}>
          {t('exchange.propose.submit', { name: otherName })}
        </Button>
      </form>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t('exchange.propose.title', { name: otherName })}
        description={t('exchange.propose.body')}
        closeLabel={t('common.close')}
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
