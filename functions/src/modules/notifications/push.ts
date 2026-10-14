import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '../../core/logger.js';

export interface PushPayload {
  title: string;
  body: string;
  /** Internal route opened by a click on the notification (03 §17). */
  link: string;
}

/** FR-70 — sends a web push to the tokens of one person; returns the tokens FCM rejected. */
export interface PushSender {
  readonly name: string;
  send(tokens: readonly string[], payload: PushPayload): Promise<{ invalidTokens: string[] }>;
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export function fcmPushSender(publicUrl: string): PushSender {
  return {
    name: 'fcm',
    async send(tokens, payload) {
      if (tokens.length === 0) return { invalidTokens: [] };
      const response = await getMessaging().sendEach(
        tokens.map((token) => ({
          token,
          // Data-only message: the service worker shows it (same look in every browser).
          data: { title: payload.title, body: payload.body, link: payload.link },
          webpush: { fcmOptions: { link: `${publicUrl}${payload.link}` } },
        })),
      );
      const invalidTokens = response.responses.flatMap((result, index) =>
        !result.success && INVALID_TOKEN_CODES.has(result.error?.code ?? '')
          ? [tokens[index] ?? '']
          : [],
      );
      return { invalidTokens };
    },
  };
}

/**
 * The emulator suite has no FCM: pushes are only logged (no text, only the route), so the flow
 * can be followed without sending anything (10_DECISIONS §5, M8).
 */
export const emulatorPushSender: PushSender = {
  name: 'emulator',
  send(tokens, payload) {
    logger.info('push (emulator)', { tokens: tokens.length, link: payload.link });
    return Promise.resolve({ invalidTokens: [] });
  },
};

export function resolvePushSender(publicUrl: string): PushSender {
  return process.env.FUNCTIONS_EMULATOR === 'true' ? emulatorPushSender : fcmPushSender(publicUrl);
}
