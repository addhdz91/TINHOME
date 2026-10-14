import { BellRing, Share, SquarePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** iPhone/iPad: web push needs the PWA on the home screen (03 §17). */
export function IosInstallGuide() {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col gap-2 text-sm">
      <li className="flex items-center gap-2">
        <Share aria-hidden="true" className="size-5 shrink-0" />
        {t('push.ios.step1')}
      </li>
      <li className="flex items-center gap-2">
        <SquarePlus aria-hidden="true" className="size-5 shrink-0" />
        {t('push.ios.step2')}
      </li>
      <li className="flex items-center gap-2">
        <BellRing aria-hidden="true" className="size-5 shrink-0" />
        {t('push.ios.step3')}
      </li>
    </ol>
  );
}
