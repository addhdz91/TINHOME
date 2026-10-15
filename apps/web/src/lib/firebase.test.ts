import { describe, expect, it } from 'vitest';
import { firebaseConfig } from './firebase-app';

describe('firebaseConfig', () => {
  it('falls back to the demo project for the emulators', () => {
    expect(firebaseConfig({} as ImportMetaEnv)).toMatchObject({
      projectId: 'demo-tinhome',
      authDomain: 'demo-tinhome.firebaseapp.com',
    });
  });

  it('uses the configured project', () => {
    expect(
      firebaseConfig({ VITE_FIREBASE_PROJECT_ID: 'tinhome-staging' } as ImportMetaEnv)
        .storageBucket,
    ).toBe('tinhome-staging.appspot.com');
  });
});
