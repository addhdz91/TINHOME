import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { usePublicConfig } from '@/hooks/use-public-config';
import { formatPrice } from '@/lib/format';

const PERKS = ['likes', 'whoLiked', 'filters'] as const;

/** C-08 — contextual Premium sheet: headline, three perks, VAT-inclusive price, «Probar Premium». */
export function PaywallSheet({
  open,
  onOpenChange,
  title,
  body,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: string;
}) {
  const { t } = useTranslation();
  const config = usePublicConfig();
  const monthly = config.data ? formatPrice(config.data.premiumMonthlyPriceCents) : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        {...(body ? { description: body } : {})}
        closeLabel={t('common.close')}
      >
        <ul className="flex flex-col gap-2">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <Check aria-hidden="true" className="size-5 text-success" />
              {t(`paywall.perks.${perk}`)}
            </li>
          ))}
        </ul>
        {monthly ? <p className="font-semibold">{t('paywall.price', { price: monthly })}</p> : null}
        <Button asChild variant="gradient" size="lg">
          <Link to="/precios">{t('paywall.cta')}</Link>
        </Button>
        <DialogClose asChild>
          <Button variant="ghost">{t('paywall.later')}</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
