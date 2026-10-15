import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { registerPushToken, unregisterPushToken } from '@/lib/callables';
import { firebaseApp } from '@/lib/firebase-app';

const SW_URL = '/firebase-messaging-sw.js';
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

export type PushState =
  /** No VAPID key configured or the browser has no web push. */
  | 'unavailable'
  /** iPhone/iPad Safari: web push only works once the PWA is installed (03 §17). */
  | 'needs-install'
  | 'default'
  | 'granted'
  | 'denied';

const vapidKey = (): string => import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

export function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** FR-70 / BR-44 — what can be offered in this browser right now. */
export async function pushState(): Promise<PushState> {
  if (!vapidKey() || typeof Notification === 'undefined') {
    return isIos() && !isStandalone() ? 'needs-install' : 'unavailable';
  }
  if (isIos() && !isStandalone()) return 'needs-install';
  if (!(await isSupported().catch(() => false))) return 'unavailable';
  return Notification.permission;
}

async function messagingToken(): Promise<string> {
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  // FCM registration tokens are what the server sends to (`sendEach`, 04 §2.24b); the newer
  // Installation-ID API is a migration of its own (10_DECISIONS §5, M10).
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return getToken(getMessaging(firebaseApp()), {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: registration,
  });
}

/** Asks the browser permission (only after an explicit tap) and registers this device. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  await registerPushToken({ token: await messagingToken() });
  return 'granted';
}

/** 03 §17 — refreshes the token on every sign-in when permission was already granted. */
export async function refreshPushToken(): Promise<void> {
  if ((await pushState()) !== 'granted') return;
  await registerPushToken({ token: await messagingToken() });
}

export async function disablePush(): Promise<void> {
  const token = await messagingToken();
  await unregisterPushToken({ token });
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- see messagingToken()
  await deleteToken(getMessaging(firebaseApp()));
}
