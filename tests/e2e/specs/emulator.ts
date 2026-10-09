/** Reads documents straight from the Firestore emulator REST API (admin bypass with `owner`). */
const BASE = 'http://127.0.0.1:8080/v1/projects/demo-tinhome/databases/(default)/documents';

interface FirestoreValue {
  stringValue?: string;
  mapValue?: { fields: Record<string, FirestoreValue> };
}

/** Confirmation link of the last N-19 e-mail queued for `email` (the console provider prints it too). */
export async function confirmUrlFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await fetch(`${BASE}:runQuery`, {
      method: 'POST',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'mailQueue' }],
          where: {
            fieldFilter: { field: { fieldPath: 'to' }, op: 'EQUAL', value: { stringValue: email } },
          },
        },
      }),
    });
    const rows = (await res.json()) as { document?: { fields: Record<string, FirestoreValue> } }[];
    const url = rows.find((row) => row.document)?.document?.fields.data?.mapValue?.fields.confirmUrl
      ?.stringValue;
    if (url) return url;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No confirmation e-mail queued for ${email}`);
}

const AUTH = 'http://127.0.0.1:9099/emulator/v1/projects/demo-tinhome';

/** Applies the e-mail verification link the Auth emulator "sent" to `email`. */
export async function verifyEmailInEmulator(email: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await fetch(`${AUTH}/oobCodes`);
    const { oobCodes } = (await res.json()) as {
      oobCodes: { email: string; requestType: string; oobLink: string }[];
    };
    const link = oobCodes.findLast(
      (code) => code.email === email && code.requestType === 'VERIFY_EMAIL',
    )?.oobLink;
    if (link) {
      const applied = await fetch(link, { redirect: 'manual' });
      if (applied.status >= 400)
        throw new Error(`verification link failed: ${String(applied.status)}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No verification e-mail for ${email}`);
}

/** Last SMS code the Auth emulator generated for `phoneNumber` (E.164). */
export async function smsCodeFor(phoneNumber: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await fetch(`${AUTH}/verificationCodes`);
    const { verificationCodes } = (await res.json()) as {
      verificationCodes: { phoneNumber: string; code: string }[];
    };
    const code = verificationCodes.findLast((entry) => entry.phoneNumber === phoneNumber)?.code;
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No SMS code for ${phoneNumber}`);
}
