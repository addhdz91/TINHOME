import { PartyPopper } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

const SEEN_KEY = 'tinhome-founder-welcome';

function seen(uid: string): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === uid;
  } catch {
    return false;
  }
}

/** FR-40 — special welcome the first time a founding member opens the app (per device). */
export function FounderWelcome() {
  const { t } = useTranslation();
  const me = useMe();
  const [open, setOpen] = useState(() => me.foundingMember && !seen(me.uid));
  if (!me.foundingMember) return null;
  const close = (next: boolean) => {
    setOpen(next);
    if (next) return;
    try {
      window.localStorage.setItem(SEEN_KEY, me.uid);
    } catch {
      // Without storage the welcome may show again on the next visit.
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title={t('founder.title')} description={t('founder.body')}>
        <PartyPopper aria-hidden="true" className="size-12 text-brand-text" />
        <DialogClose asChild>
          <Button variant="gradient" size="lg">
            {t('founder.close')}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
