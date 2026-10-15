import type { StatementGround, StatementTemplate } from '@tinhome/shared/constants';

export interface StatementDraft {
  templateId: StatementTemplate;
  facts: string;
  ground: StatementGround;
  groundDetail: string;
}

export const EMPTY_STATEMENT: StatementDraft = {
  templateId: 'OTHER',
  facts: '',
  ground: 'TERMS',
  groundDetail: '',
};

export function statementReady(draft: StatementDraft): boolean {
  return draft.facts.trim().length >= 20 && draft.groundDetail.trim().length >= 5;
}
