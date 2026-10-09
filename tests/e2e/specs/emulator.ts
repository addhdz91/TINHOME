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
