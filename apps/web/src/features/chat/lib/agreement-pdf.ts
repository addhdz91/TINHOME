export interface AgreementParty {
  name: string;
  homeTitle: string;
  cityName: string;
}

export interface AgreementInput {
  parties: [AgreementParty, AgreementParty];
  /** Markdown of `legalDocs/acuerdo-intercambio` (PROVISIONAL until the lawyer's text). */
  templateMarkdown: string;
  templateVersion: string;
  /** Fixed texts (from es.json) so the PDF follows the app's language. */
  labels: {
    title: string;
    notParty: string;
    partiesTitle: string;
    homesTitle: string;
    fields: string[];
    checklistTitle: string;
    checklist: string[];
    footer: string;
  };
}

/** Markdown → plain lines (the template only uses headings, lists and paragraphs). */
function plainLines(markdown: string): string[] {
  return markdown
    .split('\n')
    .map((line) =>
      line
        .replace(/^#+\s*/, '')
        .replace(/^[-*]\s+/, '• ')
        .replace(/[*_`>]/g, '')
        .trim(),
    )
    .filter((line, i, all) => line.length > 0 || (all[i - 1] ?? '').length > 0);
}

/**
 * FR-29 — exchange agreement and hand-over checklist, generated in the browser (no data
 * leaves the device). pdf-lib is loaded only when the person asks for the PDF.
 */
export async function buildAgreementPdf(input: AgreementInput): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const width = 595 - margin * 2;
  let page = pdf.addPage([595, 842]);
  let y = 842 - margin;

  const write = (text: string, options: { size?: number; strong?: boolean; gap?: number } = {}) => {
    const size = options.size ?? 11;
    const face = options.strong ? bold : font;
    const words = text.split(/\s+/);
    let line = '';
    const flush = () => {
      if (y < margin + size) {
        page = pdf.addPage([595, 842]);
        y = 842 - margin;
      }
      page.drawText(line, { x: margin, y, size, font: face, color: rgb(0.1, 0.1, 0.15) });
      y -= size * 1.4;
      line = '';
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (face.widthOfTextAtSize(candidate, size) > width && line) flush();
      line = line ? `${line} ${word}` : word;
    }
    if (line) flush();
    y -= options.gap ?? 4;
  };

  const { labels, parties } = input;
  write(labels.title, { size: 18, strong: true, gap: 8 });
  write(labels.notParty, { size: 10, gap: 12 });
  write(labels.partiesTitle, { size: 13, strong: true });
  for (const party of parties) write(`${party.name} — ${party.homeTitle} (${party.cityName})`);
  y -= 8;
  write(labels.homesTitle, { size: 13, strong: true });
  for (const field of labels.fields)
    write(`${field}: ______________________________________________`);
  y -= 8;
  for (const line of plainLines(input.templateMarkdown)) write(line, { size: 10 });

  page = pdf.addPage([595, 842]);
  y = 842 - margin;
  write(labels.checklistTitle, { size: 16, strong: true, gap: 10 });
  for (const item of labels.checklist) write(`[ ] ${item}`);
  y -= 12;
  write(`${labels.footer} · v${input.templateVersion}`, { size: 9 });

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
