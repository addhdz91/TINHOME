import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AppErrorCode } from '@tinhome/shared/constants';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { BlockerSheet } from '@/components/BlockerSheet';
import { PaywallSheet } from '@/components/PaywallSheet';
import { useMyHome } from '@/features/home';
import { usePublicConfig } from '@/hooks/use-public-config';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { likeHome } from '@/lib/callables';
import { MatchCelebration, type CelebrationData } from '../components/MatchCelebration';
import { MessageLikeSheet } from '../components/MessageLikeSheet';

/** Errors that mean «a requirement of BR-05 is missing»: the BlockerSheet explains them. */
const BLOCKER_CODES: readonly AppErrorCode[] = [
  'E_ACCOUNT_SUSPENDED',
  'E_EMAIL_NOT_VERIFIED',
  'E_PHONE_NOT_VERIFIED',
  'E_HOME_INCOMPLETE',
  'E_NO_AVAILABILITY',
  'E_IDENTITY_NOT_APPROVED',
  'E_DECLARATION_REQUIRED',
  'E_HOME_NOT_PUBLISHED',
  'E_CITY_NOT_OPEN',
  'E_LEGAL_OUTDATED',
];

export interface LikeTarget {
  homeId: string;
  ownerName: string;
  photoUrl: string | null;
  perfectFit: boolean;
}

/**
 * FR-23/24 — like with the three outcomes of the UX spec: match → celebration (C-05), daily
 * limit → PaywallSheet, missing requirement → BlockerSheet. Render `element` once.
 */
export function useLikeFlow(): {
  like: (target: LikeTarget, message?: string) => Promise<boolean>;
  likeWithMessage: (target: LikeTarget, onDone?: () => void) => void;
  element: ReactNode;
} {
  const { t } = useTranslation();
  const me = useMe();
  const { refreshMe } = useAuth();
  const queryClient = useQueryClient();
  const myHome = useMyHome();
  const config = usePublicConfig();
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{
    target: LikeTarget;
    onDone?: () => void;
  } | null>(null);
  const [messagePaywall, setMessagePaywall] = useState(false);

  const like = async (target: LikeTarget, message?: string): Promise<boolean> => {
    if (!me.canLike) {
      setBlockerOpen(true);
      return false;
    }
    try {
      const result = await likeHome({ homeId: target.homeId, ...(message ? { message } : {}) });
      void queryClient.invalidateQueries({ queryKey: ['home-detail', target.homeId] });
      if (result.matched && result.matchId) {
        setCelebration({
          matchId: result.matchId,
          otherName: target.ownerName,
          otherPhoto: target.photoUrl,
          myPhoto: myHome.data?.photos[0]?.thumbUrl ?? null,
          perfectFit: target.perfectFit,
        });
      }
      if (result.likesRemaining !== null) void refreshMe();
      return true;
    } catch (error) {
      const code = toAppError(error).code;
      if (code === 'E_LIKE_LIMIT') setPaywallOpen(true);
      else if (code === 'E_PREMIUM_REQUIRED') setMessagePaywall(true);
      else if (BLOCKER_CODES.includes(code)) {
        await refreshMe();
        setBlockerOpen(true);
      } else toast.error(toUserMessage(t, error));
      return false;
    }
  };

  const likeWithMessage = (target: LikeTarget, onDone?: () => void) => {
    if (!me.premium.active) {
      setMessagePaywall(true);
      return;
    }
    if (!me.canLike) {
      setBlockerOpen(true);
      return;
    }
    setMessageTarget({ target, ...(onDone ? { onDone } : {}) });
  };

  const element = (
    <>
      <MessageLikeSheet
        open={messageTarget !== null}
        onOpenChange={(open) => !open && setMessageTarget(null)}
        targetName={messageTarget?.target.ownerName ?? ''}
        onSend={async (message) => {
          const current = messageTarget;
          if (!current) return;
          if (await like(current.target, message)) {
            setMessageTarget(null);
            current.onDone?.();
          }
        }}
      />
      <PaywallSheet
        open={messagePaywall}
        onOpenChange={setMessagePaywall}
        title={t('paywall.messageTitle')}
      />
      <MatchCelebration data={celebration} onClose={() => setCelebration(null)} />
      <BlockerSheet open={blockerOpen} onOpenChange={setBlockerOpen} blockers={me.blockers} />
      <PaywallSheet
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title={t('paywall.likesTitle')}
        body={t('paywall.likesBody', { count: config.data?.freeDailyLikes ?? 10 })}
      />
    </>
  );
  return { like, likeWithMessage, element };
}
