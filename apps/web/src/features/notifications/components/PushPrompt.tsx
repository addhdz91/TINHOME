import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { enablePush, pushState, type PushState } from '../lib/push';
import { IosInstallGuide } from './IosInstallGuide';

const ASKED_KEY = 'tinhome-push-prompt';

function alreadyAsked(): boolean {
  try {
    return window.localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return true;
  }
}

function rememberAsked(): void {
  try {
    window.localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // Offered again next time.
  }
}

/**
 * FR-70 / BR-44 — never asks on entry: `offer()` is called after the first match or the first
 * message, opens our own sheet first and only then the browser permission. Asked once per device.
 */
export function usePushPrompt(): { offer: () => void; element: ReactNode } {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  const offer = useCallback(() => {
    if (alreadyAsked()) return;
    void pushState().then((current) => {
      if (current === 'default' || current === 'needs-install') setState(current);
    });
  }, []);

  const close = () => {
    rememberAsked();
    setState(null);
  };

  const element = (
    <Dialog open={state !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        title={state === 'needs-install' ? t('push.ios.title') : t('push.title')}
        description={t('push.body')}
        closeLabel={t('common.close')}
      >
        {state === 'needs-install' ? (
          <IosInstallGuide />
        ) : (
          <Button
            size="lg"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              enablePush()
                .then((result) => {
                  if (result === 'granted') toast.success(t('push.enabled'));
                  else if (result === 'denied') toast.info(t('push.denied'));
                })
                .catch(() => toast.error(t('push.error')))
                .finally(() => {
                  setBusy(false);
                  close();
                });
            }}
          >
            {t('push.enable')}
          </Button>
        )}
        <Button variant="ghost" onClick={close}>
          {t('push.later')}
        </Button>
      </DialogContent>
    </Dialog>
  );
  return { offer, element };
}
