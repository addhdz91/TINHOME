import { useTranslation } from 'react-i18next';
import { useNavigation } from 'react-router';

/**
 * Thin top bar while a lazy route loads: React Router keeps the previous screen until the new
 * chunk arrives, so without it slow networks feel unresponsive (UX-7).
 */
export function NavigationProgress() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label={t('common.loading')}
      className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-surface-muted"
    >
      <div className="h-full w-1/3 animate-navigation-progress rounded-full bg-primary" />
    </div>
  );
}
