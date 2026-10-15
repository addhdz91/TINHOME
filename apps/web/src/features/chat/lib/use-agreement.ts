import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/app/auth/auth-context';
import { useLegalDoc } from '@/features/legal';
import { buildAgreementPdf, downloadBlob } from './agreement-pdf';
import { otherOf, type MatchView } from './types';

/**
 * FR-29 — exchange agreement kit (PDF made on the device from the versioned template). Used
 * by the conversation and the exchange page; `dates` fills the first field when known.
 */
export function useAgreementDownload(match: MatchView | null, dates?: string) {
  const { t } = useTranslation();
  const me = useMe();
  const agreementTemplate = useLegalDoc('acuerdo-intercambio');
  const download = useCallback(async () => {
    if (!match) return;
    const other = match.people[otherOf(match, me.uid)];
    if (!other) return;
    const mine = match.people[me.uid];
    const blob = await buildAgreementPdf({
      parties: [
        {
          name: mine?.displayName ?? me.firstName,
          homeTitle: mine?.homeTitle ?? '',
          cityName: mine?.cityName ?? '',
        },
        { name: other.displayName, homeTitle: other.homeTitle, cityName: other.cityName },
      ],
      templateMarkdown: agreementTemplate.data?.markdown ?? '',
      templateVersion: agreementTemplate.data?.version ?? 'provisional',
      labels: {
        title: t('agreement.title'),
        notParty: t('agreement.notParty'),
        partiesTitle: t('agreement.parties'),
        homesTitle: t('agreement.details'),
        fields: [
          dates ? `${t('agreement.fields.dates')}: ${dates}` : t('agreement.fields.dates'),
          t('agreement.fields.people'),
          t('agreement.fields.pets'),
          t('agreement.fields.rules'),
          t('agreement.fields.handover'),
          t('agreement.fields.emergency'),
        ],
        checklistTitle: t('agreement.checklistTitle'),
        checklist: [
          t('agreement.checklist.keys'),
          t('agreement.checklist.photos'),
          t('agreement.checklist.inventory'),
          t('agreement.checklist.meters'),
          t('agreement.checklist.contacts'),
        ],
        footer: t('agreement.footer'),
      },
    });
    downloadBlob(blob, 'acuerdo-intercambio-tinhome.pdf');
  }, [agreementTemplate.data, dates, match, me.firstName, me.uid, t]);

  return { download, ready: match !== null && agreementTemplate.isSuccess };
}
