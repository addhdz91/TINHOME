import { useMutation } from '@tanstack/react-query';
import { ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@tinhome/shared/constants';
import { useMe } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toUserMessage } from '@/lib/app-error';
import { submitReport } from '@/lib/callables';
import { firebase } from '@/lib/firebase';

const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 2000;
const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Reasons that make sense for each target (FR-42). */
const REASONS_FOR: Record<ReportTarget, readonly ReportReason[]> = {
  HOME: ['PHOTOS_NOT_OWN', 'HIDDEN_RENTAL', 'FRAUD', 'ILLEGAL', 'PERSONAL_DATA', 'OTHER'],
  USER: REPORT_REASONS,
  REVIEW: ['RUDE', 'HARASSMENT', 'PERSONAL_DATA', 'ILLEGAL', 'OTHER'],
  MESSAGE: [
    'RUDE',
    'HARASSMENT',
    'INAPPROPRIATE_MESSAGES',
    'FRAUD',
    'ILLEGAL',
    'PERSONAL_DATA',
    'OTHER',
  ],
};

async function uploadScreenshots(uid: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const path = `private/reports/${uid}/${crypto.randomUUID()}`;
    await uploadBytes(ref(firebase().storage, path), file, { contentType: file.type });
    paths.push(path);
  }
  return paths;
}

/**
 * C-? / FR-42 — report a home, a person, a review or a message in ≤ 2 taps (CLAUDE.md §6b). The
 * reported person never learns who reported. Optional screenshots go to private Storage.
 */
export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  canBlock = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTarget;
  targetId: string;
  targetName: string;
  canBlock?: boolean;
}) {
  const { t } = useTranslation();
  const me = useMe();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [touched, setTouched] = useState(false);
  const tooShort = description.trim().length < MIN_DESCRIPTION;

  const send = useMutation({
    mutationFn: async () =>
      submitReport({
        targetType,
        targetId,
        reason: reason ?? 'OTHER',
        description: description.trim(),
        ...(files.length ? { attachmentPaths: await uploadScreenshots(me.uid, files) } : {}),
        ...(canBlock && alsoBlock ? { alsoBlock: true } : {}),
      }),
    onSuccess: () => {
      toast.success(t('report.sent'));
      onOpenChange(false);
      setReason(null);
      setDescription('');
      setFiles([]);
      setTouched(false);
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t(`report.title.${targetType}`, { name: targetName })}
        description={t('report.body')}
        closeLabel={t('common.close')}
      >
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (reason && !tooShort) send.mutate();
          }}
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 font-semibold">{t('report.reason')}</legend>
            {REASONS_FOR[targetType].map((value) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="report-reason"
                  className="size-5 accent-primary"
                  checked={reason === value}
                  onChange={() => setReason(value)}
                />
                {t(`report.reasons.${value}`)}
              </label>
            ))}
            {touched && !reason ? (
              <p role="alert" className="text-sm text-danger">
                {t('report.reasonRequired')}
              </p>
            ) : null}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-description" className="font-semibold">
              {t('report.description')}
            </label>
            <textarea
              id="report-description"
              className="min-h-28 rounded-md border border-border bg-surface p-3"
              maxLength={MAX_DESCRIPTION}
              value={description}
              aria-invalid={touched && tooShort ? true : undefined}
              aria-describedby="report-description-hint"
              onChange={(event) => setDescription(event.target.value)}
            />
            <p
              id="report-description-hint"
              className={touched && tooShort ? 'text-sm text-danger' : 'text-sm text-muted'}
            >
              {t('report.descriptionHint', { min: MIN_DESCRIPTION })}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-files" className="font-semibold">
              {t('report.screenshots')}
            </label>
            <input
              id="report-files"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? []).filter(
                  (file) => file.size <= MAX_FILE_BYTES,
                );
                setFiles(picked.slice(0, MAX_FILES));
              }}
            />
            <p className="text-sm text-muted">{t('report.screenshotsHint', { max: MAX_FILES })}</p>
          </div>
          {canBlock ? (
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={alsoBlock}
                onChange={(event) => setAlsoBlock(event.target.checked)}
              />
              {t('report.alsoBlock', { name: targetName })}
            </label>
          ) : null}
          <p className="text-xs text-muted">{t('report.anonymous')}</p>
          <Button type="submit" variant="danger" disabled={send.isPending}>
            {t('report.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
