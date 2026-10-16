import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  MANDATORY_NOTIFICATION_CATEGORIES,
  MARKETING_CONSENT_TEXT,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  type NotificationCategory,
  type NotificationChannel,
} from '@tinhome/shared/constants';
import { wantsChannel } from '@tinhome/shared/domain';
import type { NotificationPreferencesInput } from '@tinhome/shared/schemas';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { updateSettings } from '@/lib/callables';
import { disablePush, enablePush, pushState } from '../lib/push';
import { IosInstallGuide } from './IosInstallGuide';

type Editable = keyof NotificationPreferencesInput;
const EDITABLE = NOTIFICATION_CATEGORIES.filter(
  (category): category is Editable =>
    !(MANDATORY_NOTIFICATION_CATEGORIES as readonly NotificationCategory[]).includes(category),
);

/** FR-46 / FR-70 — e-mail and push by category, push preview and this device's permission. */
export function NotificationSettings() {
  const { t } = useTranslation();
  const me = useMe();
  const { refreshMe } = useAuth();
  const push = useQuery({ queryKey: ['push-state'], queryFn: pushState, staleTime: Infinity });
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => refreshMe(),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const toggleDevice = useMutation({
    mutationFn: async (on: boolean) => {
      if (on) return enablePush();
      await disablePush();
      return 'default' as const;
    },
    onSettled: () => void push.refetch(),
    onError: () => toast.error(t('push.error')),
  });

  const set = (category: Editable, channel: NotificationChannel, value: boolean) =>
    save.mutate({ notifications: { [category]: { [channel]: value } } });

  return (
    <section
      id="avisos"
      aria-labelledby="profile-notifications"
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
    >
      <h2 id="profile-notifications" className="text-h3">
        {t('notifications.settings.title')}
      </h2>
      <table className="w-full text-left">
        <caption className="sr-only">{t('notifications.settings.title')}</caption>
        <thead>
          <tr className="text-sm text-muted">
            <th scope="col" className="py-1 font-semibold">
              {t('notifications.settings.category')}
            </th>
            {NOTIFICATION_CHANNELS.map((channel) => (
              <th key={channel} scope="col" className="w-20 py-1 text-center font-semibold">
                {t(`notifications.settings.channels.${channel}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EDITABLE.map((category) => (
            <tr key={category} className="border-t border-border">
              <th scope="row" className="py-2 font-normal">
                {t(`notifications.settings.categories.${category}`)}
              </th>
              {NOTIFICATION_CHANNELS.map((channel) => (
                <td key={channel} className="py-2 text-center">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    aria-label={t('notifications.settings.toggle', {
                      category: t(`notifications.settings.categories.${category}`),
                      channel: t(`notifications.settings.channels.${channel}`),
                    })}
                    checked={wantsChannel(me.settings.notifications, category, channel)}
                    disabled={save.isPending}
                    onChange={(event) => set(category, channel, event.target.checked)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-muted">{t('notifications.settings.mandatory')}</p>
      <div className="flex items-start gap-3">
        <input
          id="push-preview"
          type="checkbox"
          className="mt-1 size-5 accent-primary"
          checked={me.settings.pushPreview}
          disabled={save.isPending}
          aria-describedby="push-preview-hint"
          onChange={(event) => save.mutate({ pushPreview: event.target.checked })}
        />
        <div>
          <label htmlFor="push-preview" className="font-semibold">
            {t('notifications.settings.preview')}
          </label>
          <p id="push-preview-hint" className="text-sm text-muted">
            {t('notifications.settings.previewHint')}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 border-t border-border pt-3">
        <input
          id="marketing-opt-in"
          type="checkbox"
          className="mt-1 size-5 accent-primary"
          checked={me.settings.marketingOptIn}
          disabled={save.isPending}
          aria-describedby="marketing-opt-in-hint"
          onChange={(event) => save.mutate({ marketingOptIn: event.target.checked })}
        />
        <div>
          <label htmlFor="marketing-opt-in" className="font-semibold">
            {MARKETING_CONSENT_TEXT}
          </label>
          <p id="marketing-opt-in-hint" className="text-sm text-muted">
            {t('notifications.settings.marketingHint')}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="font-semibold">{t('push.device')}</p>
        {push.data === 'needs-install' ? <IosInstallGuide /> : null}
        {push.data === 'unavailable' ? (
          <p className="text-sm text-muted">{t('push.unavailable')}</p>
        ) : null}
        {push.data === 'denied' ? <p className="text-sm text-muted">{t('push.blocked')}</p> : null}
        {push.data === 'default' ? (
          <Button
            variant="secondary"
            className="self-start"
            disabled={toggleDevice.isPending}
            onClick={() => toggleDevice.mutate(true)}
          >
            {t('push.enable')}
          </Button>
        ) : null}
        {push.data === 'granted' ? (
          <Button
            variant="ghost"
            className="self-start"
            disabled={toggleDevice.isPending}
            onClick={() => toggleDevice.mutate(false)}
          >
            {t('push.disable')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
