import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BLOCKERS, type Blocker } from '@tinhome/shared/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/** Where each requirement of BR-05 is solved. */
const FIX: Partial<Record<Blocker, string>> = {
  EMAIL: '/verifica-email',
  PHONE: '/app/onboarding/2',
  HOME_INCOMPLETE: '/app/mi-casa/editar',
  NO_AVAILABILITY: '/app/viaje',
  IDENTITY_MISSING: '/app/verificacion',
  IDENTITY_REJECTED: '/app/verificacion',
  IDENTITY_PENDING: '/app/verificacion',
  DECLARATION: '/app/onboarding/6',
  HOME_NOT_PUBLISHED: '/app/onboarding/6',
  ACCOUNT_RESTRICTED: '/ayuda',
};

/** The checklist groups the identity states into one row. */
const ROWS = [
  'EMAIL',
  'PHONE',
  'HOME_INCOMPLETE',
  'NO_AVAILABILITY',
  'IDENTITY_MISSING',
  'DECLARATION',
  'HOME_NOT_PUBLISHED',
  'CITY_WAITLIST',
] as const satisfies readonly Blocker[];

/** C-09 — why the action is not possible yet, with a button to the first pending step. */
export function BlockerSheet({
  open,
  onOpenChange,
  blockers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockers: Blocker[];
}) {
  const { t } = useTranslation();
  const pending = new Set<Blocker>(
    blockers.map((b) =>
      b === 'IDENTITY_PENDING' || b === 'IDENTITY_REJECTED' ? 'IDENTITY_MISSING' : b,
    ),
  );
  const first = BLOCKERS.find((b) => blockers.includes(b) && FIX[b]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t('blockers.title')}
        description={t('blockers.body')}
        closeLabel={t('common.close')}
      >
        <ul className="flex flex-col gap-2">
          {ROWS.filter((row) => row !== 'CITY_WAITLIST' || pending.has(row)).map((row) => {
            const ok = !pending.has(row);
            return (
              <li key={row} className="flex items-center gap-2">
                {ok ? (
                  <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
                ) : (
                  <Circle aria-hidden="true" className="size-5 text-muted" />
                )}
                <span className={ok ? '' : 'font-semibold'}>{t(`blockers.items.${row}`)}</span>
                <span className="sr-only">{ok ? t('blockers.done') : t('blockers.pending')}</span>
              </li>
            );
          })}
          {blockers.includes('IDENTITY_PENDING') ? (
            <li className="text-sm text-muted">{t('blockers.identityPending')}</li>
          ) : null}
          {blockers.includes('LEGAL_OUTDATED') ? (
            <li className="text-sm text-muted">{t('blockers.items.LEGAL_OUTDATED')}</li>
          ) : null}
        </ul>
        {first ? (
          <Button asChild size="lg">
            <Link to={FIX[first] ?? '/app'}>{t(`blockers.fix.${first}`)}</Link>
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
