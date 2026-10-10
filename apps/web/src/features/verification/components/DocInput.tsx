import { FileCheck2, Upload, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocInputProps {
  label: string;
  hint: string;
  file: File | null;
  error?: string | undefined;
  progress?: number | undefined;
  /** `user` opens the front camera on phones (selfie with the document). */
  capture?: 'user' | 'environment';
  onChange: (file: File | null) => void;
}

/** One document of FR-08: pick (or take) a file, see its name, remove it. */
export function DocInput({ label, hint, file, error, progress, capture, onChange }: DocInputProps) {
  const { t } = useTranslation();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3',
        error ? 'border-danger' : 'border-border',
      )}
    >
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <p id={`${id}-hint`} className="text-sm text-muted">
        {hint}
      </p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        {...(capture ? { capture } : {})}
        className="sr-only"
        aria-describedby={`${id}-hint ${id}-error`}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
      {file ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <FileCheck2 aria-hidden="true" className="size-5 shrink-0 text-success" />
            <span className="truncate">{file.name}</span>
            {progress !== undefined && progress < 100 ? (
              <span className="text-muted">{t('verification.uploading', { progress })}</span>
            ) : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('verification.removeFile', { label })}
            onClick={() => onChange(null)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden="true" />
          {t('verification.chooseFile')}
        </Button>
      )}
      <p id={`${id}-error`} className="text-sm font-semibold text-danger">
        {error}
      </p>
    </div>
  );
}
