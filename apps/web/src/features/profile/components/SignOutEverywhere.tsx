import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ReauthForm } from '@/features/auth';
import { signOutEverywhere } from '@/lib/callables';

/**
 * FR-71 — «Cerrar sesión en todos los dispositivos»: confirm (C-19), re-authenticate (password
 * or Google), revoke every refresh token on the server (N-27 by e-mail) and sign out here.
 */
export function SignOutEverywhere() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, signOut } = useAuth();
  if (state.status !== 'signedIn') return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="justify-start">
          {t('profile.signOutEverywhere')}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={t('profile.signOutEverywhereTitle')}
        description={t('profile.signOutEverywhereBody')}
        closeLabel={t('common.close')}
      >
        <ReauthForm
          danger
          confirmLabel={t('profile.reauthConfirm')}
          action={async () => {
            await signOutEverywhere({});
            await signOut();
            toast.success(t('profile.signedOutEverywhere'));
            void navigate('/entrar', { replace: true });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
