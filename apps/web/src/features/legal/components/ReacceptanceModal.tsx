import { useMutation } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LEGAL_DOC_SLUGS, type LegalDocSlug } from '@tinhome/shared/constants';
import type { Me } from '@tinhome/shared/schemas';
import { useAuth } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { acceptLegalDocs } from '@/lib/callables';
import { useLegalDoc } from '../api/use-legal-doc';

function isLegalSlug(value: string): value is LegalDocSlug {
  return LEGAL_DOC_SLUGS.some((slug) => slug === value);
}

function PendingDoc({ slug }: { slug: LegalDocSlug }) {
  const { t } = useTranslation();
  const doc = useLegalDoc(slug);
  const title = t(`legal.docs.${slug}`);
  return (
    <li className="flex flex-col gap-1 rounded-md border border-border p-3">
      <a
        href={`/legal/${slug}`}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-2 font-semibold text-link underline"
      >
        {t('legalReaccept.read', { title })}
        <ExternalLink aria-hidden="true" className="size-4" />
      </a>
      {doc.data?.changeSummary ? (
        <p className="text-sm text-muted">
          {t('legalReaccept.changes', { summary: doc.data.changeSummary })}
        </p>
      ) : null}
    </li>
  );
}

/**
 * FR-58 — blocking modal when a legal text the user accepted has a new version that requires
 * re-acceptance (or was never accepted). It cannot be dismissed; the only alternative is to
 * sign out.
 */
export function ReacceptanceModal({ pending }: { pending: Me['legalPending'] }) {
  const { t } = useTranslation();
  const { refreshMe, signOut } = useAuth();
  const accept = useMutation({
    mutationFn: () =>
      acceptLegalDocs({ items: pending.map(({ slug, version }) => ({ slug, version })) }),
    onSuccess: () => refreshMe(),
  });
  const slugs = pending.map((doc) => doc.slug).filter(isLegalSlug);

  return (
    <Dialog open>
      <DialogContent
        title={t('legalReaccept.title')}
        description={t('legalReaccept.body')}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <ul className="flex flex-col gap-2">
          {slugs.map((slug) => (
            <PendingDoc key={slug} slug={slug} />
          ))}
        </ul>
        {accept.isError ? (
          <p role="alert" className="text-danger">
            {toUserMessage(t, accept.error)}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
            {accept.isPending ? t('legalReaccept.accepting') : t('legalReaccept.accept')}
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            {t('legalReaccept.signOut')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
