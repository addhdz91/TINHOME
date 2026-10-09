import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { shareLink } from '../lib/share';

/** FR-17 «Invita a alguien»: shares the landing so more homes join the city. */
export function useInvite(): () => void {
  const { t } = useTranslation();
  return useCallback(() => {
    void shareLink({
      title: t('app.name'),
      text: t('cities.shareText'),
      url: window.location.origin,
    }).then((result) => {
      if (result === 'copied') toast.success(t('cities.linkCopied'));
      if (result === 'failed') toast.error(t('errors.E_INTERNAL'));
    });
  }, [t]);
}
