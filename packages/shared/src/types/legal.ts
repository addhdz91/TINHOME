/** `legalDocs/{slug}` (04 §2.20). */
export interface LegalDocMeta {
  title: string;
  currentVersion: string;
}

/** `legalDocs/{slug}/versions/{version}`. `publishedAt` as ISO string on the client. */
export interface LegalDocVersion {
  markdown: string;
  requiresReacceptance: boolean;
  changeSummary: string;
}
