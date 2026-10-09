export interface CurrentLegalVersion {
  slug: string;
  version: string;
  requiresReacceptance: boolean;
}

/**
 * BR-35 / FR-58 — legal texts the user still has to (re)accept: those whose current version
 * differs from the accepted one. Never-accepted texts are always pending; a new version is
 * pending only when it requires re-acceptance.
 */
export function pendingLegalDocs(
  accepted: Readonly<Record<string, string>>,
  current: readonly CurrentLegalVersion[],
): CurrentLegalVersion[] {
  return current.filter((doc) => {
    const acceptedVersion = accepted[doc.slug];
    if (acceptedVersion === undefined) return true;
    return acceptedVersion !== doc.version && doc.requiresReacceptance;
  });
}

/** Truncates an IP for `legalAcceptances.ipTruncated` (IPv4 /24, IPv6 /48). */
export function truncateIp(ip: string): string {
  const v4 = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(ip);
  if (v4) return `${v4[1] ?? '0'}.${v4[2] ?? '0'}.${v4[3] ?? '0'}.0/24`;
  if (ip.includes(':')) {
    const groups = ip
      .split(':')
      .filter((group) => group.length > 0)
      .slice(0, 3);
    return `${groups.join(':')}::/48`;
  }
  return 'unknown';
}
