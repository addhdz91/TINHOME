import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONSENT_DOCS,
  LEGAL_DOC_SLUGS,
  type ConsentDoc,
  type LegalDocSlug,
} from '@tinhome/shared/constants';
import type { Me } from '@tinhome/shared/schemas';
import { useAuth } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { acceptLegalDocs } from '@/lib/callables';
import { useLegalDoc } from '../api/use-legal-doc';
import { ConsentCheckbox } from './ConsentCheckbox';

function isLegalSlug(value: string): value is LegalDocSlug {
  return LEGAL_DOC_SLUGS.some((slug) => slug === value);
}

function isConsentDoc(value: string): value is ConsentDoc {
  return CONSENT_DOCS.some((slug) => slug === value);
}

/** One pending text: its own checkbox and «Leer» (FR-58), plus what changed. */
function PendingDoc({
  slug,
  checked,
  onChange,
}: {
  slug: LegalDocSlug;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const doc = useLegalDoc(slug);
  const title = t(`legal.docs.${slug}`);
  return (
    <li className="flex flex-col gap-1 rounded-md border border-border p-3">
      {isConsentDoc(slug) ? (
        <ConsentCheckbox
          id={`reaccept-${slug}`}
          slug={slug}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      ) : (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-primary"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{t('legalReaccept.read', { title })}</span>
        </label>
      )}
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
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const allTicked = slugs.every((slug) => ticked.has(slug));

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
            <PendingDoc
              key={slug}
              slug={slug}
              checked={ticked.has(slug)}
              onChange={(on) =>
                setTicked((current) => {
                  const next = new Set(current);
                  if (on) next.add(slug);
                  else next.delete(slug);
                  return next;
                })
              }
            />
          ))}
        </ul>
        {accept.isError ? (
          <p role="alert" className="text-danger">
            {toUserMessage(t, accept.error)}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={() => accept.mutate()} disabled={!allTicked || accept.isPending}>
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
