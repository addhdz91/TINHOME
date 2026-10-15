import type { VisitorConsents } from '@tinhome/shared/schemas';
import { useLegalVersion } from './use-legal-doc';

/**
 * Current versions of the privacy and cookies policies for the public forms (complaints,
 * DSA reports). `versions` is null until both are known.
 */
export function useVisitorConsentVersions(enabled = true) {
  const privacy = useLegalVersion('privacidad');
  const cookies = useLegalVersion('cookies');
  const versions: VisitorConsents | null =
    enabled && privacy.data && cookies.data
      ? { privacidad: privacy.data.currentVersion, cookies: cookies.data.currentVersion }
      : null;
  return {
    versions,
    isError: privacy.isError || cookies.isError || privacy.data === null || cookies.data === null,
    refetch: () => void Promise.all([privacy.refetch(), cookies.refetch()]),
  };
}
