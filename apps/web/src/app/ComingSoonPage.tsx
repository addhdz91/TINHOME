import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { Seo } from '@/components/Seo';

type Section = 'discover' | 'explore' | 'likes' | 'chats';

/** Placeholder for app sections that arrive in later milestones (M5–M6). */
export function ComingSoonPage({ section }: { section: Section }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4 py-6">
      <Seo title={`${t(`nav.${section}`)} — TinHome`} />
      <h1 className="text-h1">{t(`nav.${section}`)}</h1>
      <EmptyState
        icon={<Sparkles />}
        title={t('common.comingSoon')}
        body={t('appShell.comingSoonBody')}
      />
    </section>
  );
}
