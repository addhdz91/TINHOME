import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileDown,
  Info,
  MessageCircle,
  MoreVertical,
  Phone,
  ShieldAlert,
  UserX,
  Ban,
  Home as HomeIcon,
} from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useLegalDoc } from '@/features/legal';
import { toAppError, toUserMessage } from '@/lib/app-error';
import {
  blockUser,
  getMatchContact,
  markConversationRead,
  markMatchSeen,
  sendMessage,
  sharePhoneInChat,
  unmatch,
} from '@/lib/callables';
import { useMatch, useMessages } from '../api/use-chat-data';
import { ChatThread, type PendingMessage } from '../components/ChatThread';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MessageComposer } from '../components/MessageComposer';
import { buildAgreementPdf, downloadBlob } from '../lib/agreement-pdf';
import { otherOf } from '../lib/types';

const SAFETY_KEY = 'tinhome-chat-safety-seen';

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

function seenSafety(): boolean {
  try {
    return window.localStorage.getItem(SAFETY_KEY) === '1';
  } catch {
    return false;
  }
}

/** S-08 — conversation: header with menu, next step, phone card, thread and composer. */
export function ConversationPage() {
  const { t } = useTranslation();
  const { matchId = '' } = useParams();
  const [params] = useSearchParams();
  const me = useMe();
  const navigate = useNavigate();
  const match = useMatch(matchId);
  const active = match.status === 'ready' && match.data?.status === 'ACTIVE';
  const messages = useMessages(matchId, active);
  const online = useOnline();
  const agreementTemplate = useLegalDoc('acuerdo-intercambio');
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [confirm, setConfirm] = useState<'phone' | 'unmatch' | 'block' | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(() => !seenSafety());
  const [nextStepOpen, setNextStepOpen] = useState(true);
  const lastRead = useRef(0);

  const data = match.status === 'ready' ? match.data : null;
  const otherUid = data ? otherOf(data, me.uid) : '';
  const other = data?.people[otherUid];
  const otherShared = data?.phoneSharedBy.includes(otherUid) ?? false;
  const iShared = data?.phoneSharedBy.includes(me.uid) ?? false;
  const contact = useQuery({
    queryKey: ['match-contact', matchId],
    enabled: active && otherShared,
    queryFn: () => getMatchContact({ matchId }),
  });
  const textCount =
    messages.status === 'ready' ? messages.data.filter((m) => m.type === 'TEXT').length : 0;

  // Mark as read on open and whenever new messages arrive while the conversation is open.
  const unread = data?.unread[me.uid] ?? 0;
  const unseen = data?.unseenBy.includes(me.uid) ?? false;
  useEffect(() => {
    if (!active) return;
    if (unseen) void markMatchSeen({ matchId }).catch(() => undefined);
    if (unread > 0 && Date.now() - lastRead.current > 1000) {
      lastRead.current = Date.now();
      void markConversationRead({ matchId }).catch(() => undefined);
    }
  }, [active, unread, unseen, matchId]);

  const send = useCallback(
    (text: string, id: string = crypto.randomUUID()) => {
      setPending((list) => [...list.filter((p) => p.id !== id), { id, text, status: 'sending' }]);
      sendMessage({ matchId, text, clientRequestId: id })
        .then(() => setPending((list) => list.filter((p) => p.id !== id)))
        .catch((error: unknown) => {
          setPending((list) => list.map((p) => (p.id === id ? { ...p, status: 'failed' } : p)));
          const code = toAppError(error).code;
          toast.error(code === 'E_RATE_LIMIT' ? t('chat.tooFast') : toUserMessage(t, error));
        });
    },
    [matchId, t],
  );

  const sharePhone = useMutation({
    mutationFn: () => sharePhoneInChat({ matchId }),
    onSuccess: () => setConfirm(null),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const close = useMutation({
    mutationFn: (kind: 'unmatch' | 'block') =>
      kind === 'unmatch' ? unmatch({ matchId }) : blockUser({ targetUid: otherUid }),
    onSuccess: (_, kind) => {
      toast.success(kind === 'unmatch' ? t('chat.unmatched') : t('chat.blocked'));
      void navigate('/app/chats', { replace: true });
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  const downloadAgreement = useCallback(async () => {
    if (!data || !other) return;
    const mine = data.people[me.uid];
    const blob = await buildAgreementPdf({
      parties: [
        {
          name: mine?.displayName ?? me.firstName,
          homeTitle: mine?.homeTitle ?? '',
          cityName: mine?.cityName ?? '',
        },
        { name: other.displayName, homeTitle: other.homeTitle, cityName: other.cityName },
      ],
      templateMarkdown: agreementTemplate.data?.markdown ?? '',
      templateVersion: agreementTemplate.data?.version ?? 'provisional',
      labels: {
        title: t('agreement.title'),
        notParty: t('agreement.notParty'),
        partiesTitle: t('agreement.parties'),
        homesTitle: t('agreement.details'),
        fields: [
          t('agreement.fields.dates'),
          t('agreement.fields.people'),
          t('agreement.fields.pets'),
          t('agreement.fields.rules'),
          t('agreement.fields.handover'),
          t('agreement.fields.emergency'),
        ],
        checklistTitle: t('agreement.checklistTitle'),
        checklist: [
          t('agreement.checklist.keys'),
          t('agreement.checklist.photos'),
          t('agreement.checklist.inventory'),
          t('agreement.checklist.meters'),
          t('agreement.checklist.contacts'),
        ],
        footer: t('agreement.footer'),
      },
    });
    downloadBlob(blob, 'acuerdo-intercambio-tinhome.pdf');
  }, [agreementTemplate.data, data, me.firstName, me.uid, other, t]);

  // «Descargar acuerdo» from the match celebration (`?acuerdo=1`).
  const askedAgreement = params.get('acuerdo') === '1';
  useEffect(() => {
    if (askedAgreement && data && agreementTemplate.isSuccess) void downloadAgreement();
  }, [askedAgreement, data, agreementTemplate.isSuccess, downloadAgreement]);

  if (match.status === 'loading') return <Skeleton className="h-[60vh]" />;
  if (match.status === 'error') return <ErrorState />;
  if (data?.status !== 'ACTIVE' || !other) {
    return (
      <EmptyState
        headingLevel={1}
        icon={<MessageCircle />}
        title={t('chat.closed')}
        action={
          <Button asChild variant="secondary">
            <Link to="/app/chats">{t('chat.backToList')}</Link>
          </Button>
        }
      />
    );
  }
  const maskedPhone = me.verification.phoneVerified ? t('chat.phoneMasked') : '';

  return (
    <section className="flex h-[calc(100dvh-9rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      <Seo title={`${other.displayName} — ${t('nav.chats')}`} />
      <header className="flex items-center gap-2 border-b border-border pb-2">
        <Link
          to="/app/chats"
          aria-label={t('chat.backToList')}
          className="inline-flex size-11 items-center justify-center rounded-md lg:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <Link to={`/app/casa/${otherUid}`} className="flex min-w-0 flex-1 items-center gap-2">
          {other.photoUrl ? (
            <img src={other.photoUrl} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft">
              <HomeIcon aria-hidden="true" className="size-5" />
            </span>
          )}
          <span className="min-w-0">
            <h1 className="truncate font-display text-h3 font-extrabold">{other.displayName}</h1>
            <span className="block truncate text-xs text-muted">
              {other.cityName}
              {data.perfectFit ? ` · ${t('compat.perfectFit')}` : ''}
            </span>
          </span>
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-muted"
            aria-label={t('chat.menu')}
          >
            <MoreVertical aria-hidden="true" className="size-5" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-50 min-w-56 rounded-md border border-border bg-surface p-1 text-text shadow-sheet"
            >
              <DropdownMenu.Item
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-3 outline-none data-[highlighted]:bg-surface-muted"
                onSelect={() => void navigate(`/app/casa/${otherUid}`)}
              >
                <HomeIcon aria-hidden="true" className="size-4" />
                {t('chat.viewHome')}
              </DropdownMenu.Item>
              {!iShared ? (
                <DropdownMenu.Item
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-3 outline-none data-[highlighted]:bg-surface-muted"
                  onSelect={() => setConfirm('phone')}
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {t('chat.sharePhone')}
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Item
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-3 outline-none data-[highlighted]:bg-surface-muted"
                onSelect={() => void downloadAgreement()}
              >
                <FileDown aria-hidden="true" className="size-4" />
                {t('chat.agreement')}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-3 outline-none data-[highlighted]:bg-surface-muted"
                onSelect={() => setConfirm('unmatch')}
              >
                <UserX aria-hidden="true" className="size-4" />
                {t('chat.unmatch')}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-3 text-danger outline-none data-[highlighted]:bg-surface-muted"
                onSelect={() => setConfirm('block')}
              >
                <Ban aria-hidden="true" className="size-4" />
                {t('chat.block')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </header>

      {nextStepOpen ? (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-brand-soft p-3 text-sm text-brand-text">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1">{t('chat.nextStep')}</p>
          <button
            type="button"
            className="min-h-11 px-2 text-xs font-semibold underline"
            onClick={() => setNextStepOpen(false)}
          >
            {t('common.close')}
          </button>
        </div>
      ) : null}
      {safetyOpen ? (
        <div
          role="note"
          className="mt-2 flex items-start gap-2 rounded-md border border-warning p-3 text-sm"
        >
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1">{t('chat.paymentWarning')}</p>
          <button
            type="button"
            className="min-h-11 px-2 text-xs font-semibold underline"
            onClick={() => {
              setSafetyOpen(false);
              try {
                window.localStorage.setItem(SAFETY_KEY, '1');
              } catch {
                // Shown again next time.
              }
            }}
          >
            {t('chat.understood')}
          </button>
        </div>
      ) : null}
      {otherShared && contact.data ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
          <span className="flex-1 font-semibold">
            {t('chat.contact', { name: contact.data.displayName, phone: contact.data.phoneE164 })}
          </span>
          <Button asChild size="sm" variant="secondary">
            <a href={`tel:${contact.data.phoneE164}`}>{t('chat.call')}</a>
          </Button>
          <Button asChild size="sm">
            <a href={contact.data.whatsappUrl} target="_blank" rel="noopener noreferrer">
              {t('chat.whatsapp')}
            </a>
          </Button>
        </div>
      ) : null}
      {!online ? (
        <p role="status" className="mt-2 rounded-md bg-surface-muted p-2 text-center text-sm">
          {t('chat.offline')}
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto py-3">
        {messages.status === 'loading' ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : messages.status === 'error' ? (
          <ErrorState />
        ) : (
          <ChatThread
            uid={me.uid}
            otherName={other.displayName}
            messages={messages.data}
            pending={pending}
            otherReadAt={data.lastReadAt[otherUid] ?? null}
            onRetry={(message) => send(message.text, message.id)}
          />
        )}
      </div>
      <MessageComposer
        onSend={(text) => send(text)}
        showSuggestions={textCount === 0}
        disabled={false}
      />

      <ConfirmDialog
        open={confirm === 'phone'}
        onOpenChange={(open) => setConfirm(open ? 'phone' : null)}
        title={t('chat.sharePhone')}
        body={t('chat.sharePhoneBody', { name: other.displayName, phone: maskedPhone })}
        confirmLabel={t('chat.sharePhoneConfirm')}
        cancelLabel={t('common.cancel')}
        busy={sharePhone.isPending}
        onConfirm={() => sharePhone.mutate()}
      />
      <ConfirmDialog
        open={confirm === 'unmatch'}
        onOpenChange={(open) => setConfirm(open ? 'unmatch' : null)}
        title={t('chat.unmatch')}
        body={t('chat.unmatchBody', { name: other.displayName })}
        confirmLabel={t('chat.unmatch')}
        cancelLabel={t('common.cancel')}
        danger
        busy={close.isPending}
        onConfirm={() => close.mutate('unmatch')}
      />
      <ConfirmDialog
        open={confirm === 'block'}
        onOpenChange={(open) => setConfirm(open ? 'block' : null)}
        title={t('chat.block')}
        body={t('chat.blockBody', { name: other.displayName })}
        confirmLabel={t('chat.block')}
        cancelLabel={t('common.cancel')}
        danger
        busy={close.isPending}
        onConfirm={() => close.mutate('block')}
      />
    </section>
  );
}
