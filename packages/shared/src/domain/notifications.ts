import {
  MANDATORY_NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationType,
} from '../constants/enums.js';

/** 02 §8 — preference category of each in-app notification type. */
export const NOTIFICATION_CATEGORY_OF: Record<NotificationType, NotificationCategory> = {
  'N-02': 'SERVICE',
  'N-03': 'SERVICE',
  'N-04': 'SERVICE',
  'N-06': 'LIKES',
  'N-07': 'MATCHES',
  'N-08': 'EXCHANGES',
  'N-09': 'EXCHANGES',
  'N-10': 'REVIEWS',
  'N-11': 'REVIEWS',
  'N-12': 'SERVICE',
  'N-13': 'SERVICE',
  'N-20': 'MESSAGES',
  'N-21': 'LIKES',
  'N-22': 'SERVICE',
  'N-23': 'SERVICE',
  'N-15': 'SERVICE',
  'N-16': 'SERVICE',
  'N-24': 'SERVICE',
  'N-25': 'SERVICE',
  'N-28': 'MATCHES',
};

export type NotificationPreferences = Partial<
  Record<
    NotificationCategory,
    Partial<Record<NotificationChannel, boolean | undefined>> | undefined
  >
>;

/**
 * FR-46 / BR-44 — channels are on unless the user turned them off; SERVICE and LEGAL notices
 * cannot be turned off. Push still needs the browser permission (a registered token).
 */
export function wantsChannel(
  preferences: NotificationPreferences | undefined,
  category: NotificationCategory,
  channel: NotificationChannel,
): boolean {
  if ((MANDATORY_NOTIFICATION_CATEGORIES as readonly NotificationCategory[]).includes(category))
    return true;
  return preferences?.[category]?.[channel] !== false;
}
