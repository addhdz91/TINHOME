import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { authErrorCode, authErrorKey } from '@/lib/auth-errors';
import { PasswordField } from './PasswordField';

/**
 * Sensitive actions (05 §2.1: sign-in in the last 5 minutes) — re-authenticate with the
 * password or Google, refresh the token and then run `action`.
 */
export function ReauthForm({
  confirmLabel,
  danger = false,
  action,
}: {
  confirmLabel: string;
  danger?: boolean;
  action: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { state } = useAuth();
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
      await action();
    } catch (err) {
      setError(authErrorCode(err) ? t(`authErrors.${authErrorKey(err)}`) : toUserMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
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
        variant={danger ? 'danger' : 'primary'}
        disabled={busy || (usesPassword && password.length === 0)}
      >
        {usesPassword ? confirmLabel : t('profile.reauthGoogle')}
      </Button>
    </form>
  );
}
