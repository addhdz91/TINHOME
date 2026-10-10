import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  PROPERTY_DOC_TYPES,
  TENURES,
  type PropertyDocType,
  type Tenure,
  type VerificationFile,
} from '@tinhome/shared/constants';
import { isValidSpanishId } from '@tinhome/shared/domain';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { LegalLink } from '@/features/legal';
import { toUserMessage } from '@/lib/app-error';
import { submitIdentityVerification } from '@/lib/callables';
import { useInvalidateMyVerification } from '../api/use-my-verification';
import { docProblem, newVerificationId, uploadDoc } from '../lib/upload-doc';
import { DocInput } from './DocInput';

type Files = Partial<Record<VerificationFile, File>>;
const BASE_FILES = ['idFront', 'idBack', 'selfie', 'propertyDoc'] as const;

/** FR-08 — DNI/NIE (both sides), selfie with the document, proof of the home, landlord authorization. */
export function IdentityForm({
  defaultTenure,
  onSubmitted,
}: {
  defaultTenure: Tenure;
  onSubmitted?: () => void;
}) {
  const { t } = useTranslation();
  const me = useMe();
  const { refreshMe } = useAuth();
  const invalidate = useInvalidateMyVerification();
  const [tenure, setTenure] = useState<Tenure>(defaultTenure);
  const [docType, setDocType] = useState<PropertyDocType>(
    defaultTenure === 'TENANT' ? 'RENTAL_CONTRACT' : 'IBI_RECEIPT',
  );
  const [docNumber, setDocNumber] = useState('');
  const [files, setFiles] = useState<Files>({});
  const [progress, setProgress] = useState<Partial<Record<VerificationFile, number>>>({});
  const [errors, setErrors] = useState<Partial<Record<VerificationFile | 'docNumber', string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keys: VerificationFile[] =
    tenure === 'TENANT' ? [...BASE_FILES, 'landlordAuthorization'] : [...BASE_FILES];

  const setFile = (key: VerificationFile, file: File | null) => {
    const problem = file ? docProblem(file) : null;
    setErrors((current) => ({
      ...current,
      [key]: problem ? t(`verification.problems.${problem}`) : undefined,
    }));
    setFiles((current) => ({ ...current, [key]: problem ? undefined : (file ?? undefined) }));
  };

  const submit = async () => {
    setFormError(null);
    const next: typeof errors = {};
    for (const key of keys) if (!files[key]) next[key] = t('verification.problems.missing');
    if (!isValidSpanishId(docNumber)) next.docNumber = t('verification.problems.docNumber');
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError(
        tenure === 'TENANT' && !files.landlordAuthorization
          ? t('errors.E_LANDLORD_AUTH_REQUIRED')
          : t('verification.problems.summary'),
      );
      return;
    }
    setBusy(true);
    const verificationId = newVerificationId();
    const paths: Partial<Record<VerificationFile, string>> = {};
    try {
      for (const key of keys) {
        const file = files[key];
        if (!file) continue;
        paths[key] = await uploadDoc(me.uid, verificationId, key, file, (percent) =>
          setProgress((current) => ({ ...current, [key]: percent })),
        );
      }
    } catch {
      setFormError(t('verification.problems.upload'));
      setBusy(false);
      return;
    }
    try {
      await submitIdentityVerification({
        tenure,
        propertyDocType: docType,
        docNumber,
        files: paths,
      });
      await Promise.all([refreshMe(), invalidate()]);
      toast.success(t('verification.submitted'));
      onSubmitted?.();
    } catch (error) {
      setFormError(toUserMessage(t, error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <SelectField
        label={t('home.fields.tenure')}
        value={tenure}
        onChange={(event) => setTenure(event.target.value as Tenure)}
        options={TENURES.map((value) => ({ value, label: t(`home.tenures.${value}`) }))}
      />
      <TextField
        label={t('verification.docNumber')}
        hint={t('verification.docNumberHint')}
        autoComplete="off"
        value={docNumber}
        onChange={(event) => setDocNumber(event.target.value)}
        error={errors.docNumber}
      />
      <DocInput
        label={t('verification.files.idFront')}
        hint={t('verification.hints.idFront')}
        file={files.idFront ?? null}
        error={errors.idFront}
        progress={progress.idFront}
        capture="environment"
        onChange={(file) => setFile('idFront', file)}
      />
      <DocInput
        label={t('verification.files.idBack')}
        hint={t('verification.hints.idBack')}
        file={files.idBack ?? null}
        error={errors.idBack}
        progress={progress.idBack}
        capture="environment"
        onChange={(file) => setFile('idBack', file)}
      />
      <DocInput
        label={t('verification.files.selfie')}
        hint={t('verification.hints.selfie')}
        file={files.selfie ?? null}
        error={errors.selfie}
        progress={progress.selfie}
        capture="user"
        onChange={(file) => setFile('selfie', file)}
      />
      <SelectField
        label={t('verification.propertyDocType')}
        value={docType}
        onChange={(event) => setDocType(event.target.value as PropertyDocType)}
        options={PROPERTY_DOC_TYPES.map((value) => ({
          value,
          label: t(`verification.propertyDocs.${value}`),
        }))}
      />
      <DocInput
        label={t('verification.files.propertyDoc')}
        hint={t('verification.hints.propertyDoc')}
        file={files.propertyDoc ?? null}
        error={errors.propertyDoc}
        progress={progress.propertyDoc}
        onChange={(file) => setFile('propertyDoc', file)}
      />
      {tenure === 'TENANT' ? (
        <>
          <p className="text-sm">
            <Trans
              i18nKey="verification.landlordModel"
              components={{ 1: <LegalLink slug="autorizacion-arrendador" /> }}
            />
          </p>
          <DocInput
            label={t('verification.files.landlordAuthorization')}
            hint={t('verification.hints.landlordAuthorization')}
            file={files.landlordAuthorization ?? null}
            error={errors.landlordAuthorization}
            progress={progress.landlordAuthorization}
            onChange={(file) => setFile('landlordAuthorization', file)}
          />
        </>
      ) : null}
      <p className="text-sm text-muted">{t('verification.privacy')}</p>
      {formError ? (
        <p role="alert" className="rounded-md border border-danger p-3 font-semibold">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="self-start" disabled={busy}>
        {busy ? t('verification.sending') : t('verification.send')}
      </Button>
    </form>
  );
}
