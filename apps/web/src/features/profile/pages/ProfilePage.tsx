import { ChevronRight, HelpCircle, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { useTheme } from '@/app/theme-context';
import { Seo } from '@/components/Seo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { updateSettings } from '@/lib/callables';
import { SignOutEverywhere } from '../components/SignOutEverywhere';

/** S-11 (M2 subset) — status, theme, help and session. Home, trip and Premium arrive later. */
export function ProfilePage() {
  const { t } = useTranslation();
  const me = useMe();
  const { signOut } = useAuth();
  const { setPreference } = useTheme();
  const navigate = useNavigate();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <Seo title={t('seo.profile.title')} />
      <header className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h1 className="text-h1">{me.firstName}</h1>
        <p className="text-sm text-muted">{me.email}</p>
        <div
          role="progressbar"
          aria-label={t('profile.completed', { percent: me.onboarding.percent })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={me.onboarding.percent}
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${String(me.onboarding.percent)}%` }}
          />
        </div>
        <p className="text-sm font-semibold">
          {t('profile.completed', { percent: me.onboarding.percent })}
        </p>
        {!me.onboarding.completed ? (
          <Button asChild variant="secondary" size="sm" className="self-start">
            <Link to={`/app/onboarding/${String(me.onboarding.step)}`}>
              {t('profile.continueOnboarding')}
            </Link>
          </Button>
        ) : null}
      </header>

      <section
        aria-labelledby="profile-theme"
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
      >
        <h2 id="profile-theme" className="text-h3">
          {t('profile.theme')}
        </h2>
        <ThemeSwitcher
          onChange={(theme) => {
            setPreference(theme);
            updateSettings({ theme }).catch(() => toast.error(t('profile.themeSaveError')));
          }}
        />
      </section>

      <nav aria-label={t('profile.account')} className="flex flex-col gap-2">
        <Link
          to="/ayuda"
          className="flex min-h-11 items-center justify-between rounded-md border border-border bg-surface px-4 font-semibold hover:bg-surface-muted"
        >
          <span className="flex items-center gap-3">
            <HelpCircle aria-hidden="true" className="size-5" />
            {t('profile.help')}
          </span>
          <ChevronRight aria-hidden="true" className="size-5 text-muted" />
        </Link>
        <SignOutEverywhere />
        <Button
          variant="ghost"
          className="justify-start"
          onClick={() => {
            void signOut().then(() => navigate('/', { replace: true }));
          }}
        >
          <LogOut aria-hidden="true" />
          {t('profile.signOut')}
        </Button>
      </nav>
    </section>
  );
}
