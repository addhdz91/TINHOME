import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PasswordField } from '@/features/auth';
import { toUserMessage } from '@/lib/app-error';
import { authErrorCode, authErrorKey } from '@/lib/auth-errors';
import { signOutEverywhere } from '@/lib/callables';

/**
 * FR-71 — «Cerrar sesión en todos los dispositivos»: confirm (C-19), re-authenticate (password
 * or Google), revoke every refresh token on the server (N-27 by e-mail) and sign out here.
 */
export function SignOutEverywhere() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (state.status !== 'signedIn') return null;
  const { user } = state;
  const usesPassword = user.providerData.some((p) => p.providerId === 'password');

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      if (usesPassword) {
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email ?? '', password),
        );
      } else {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      }
      await user.getIdToken(true);
      await signOutEverywhere({});
      await signOut();
      toast.success(t('profile.signedOutEverywhere'));
      void navigate('/entrar', { replace: true });
    } catch (err) {
      setError(authErrorCode(err) ? t(`authErrors.${authErrorKey(err)}`) : toUserMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

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
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <p className="font-semibold">{t('profile.reauthTitle')}</p>
          {usesPassword ? (
            <PasswordField
              label={t('auth.fields.password')}
              hint={t('profile.reauthBody')}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={error ?? undefined}
            />
          ) : error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="danger"
            disabled={busy || (usesPassword && password.length === 0)}
          >
            {usesPassword ? t('profile.reauthConfirm') : t('profile.reauthGoogle')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
