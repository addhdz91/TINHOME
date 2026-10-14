import { Home as HomeIcon } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { SponsoredCard, useSponsored } from '@/features/sponsored';
import { cn } from '@/lib/utils';

export interface CelebrationData {
  matchId: string;
  otherName: string;
  otherPhoto: string | null;
  myPhoto: string | null;
  perfectFit: boolean;
}

function Photo({ src, className }: { src: string | null; className: string }) {
  return (
    <div
      className={cn(
        'size-28 overflow-hidden rounded-xl border-4 border-surface bg-brand-soft shadow-sheet',
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <HomeIcon aria-hidden="true" className="m-auto mt-9 size-10 text-brand-text" />
      )}
    </div>
  );
}

/** C-05 — two homes that come together, «¡Es un match con Javier!», chat and agreement. */
export function MatchCelebration({
  data,
  onClose,
}: {
  data: CelebrationData | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const sponsored = useSponsored('MATCH', data !== null);
  return (
    <Dialog open={data !== null} onOpenChange={(open) => !open && onClose()}>
      {data ? (
        <DialogContent
          title={t('match.title', { name: data.otherName })}
          description={t('match.body')}
        >
          <div className="flex justify-center py-2" aria-hidden="true">
            <motion.div
              initial={reduced ? false : { x: -40, rotate: -12 }}
              animate={{ x: 8, rotate: -6 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Photo src={data.myPhoto} className="" />
            </motion.div>
            <motion.div
              initial={reduced ? false : { x: 40, rotate: 12 }}
              animate={{ x: -8, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Photo src={data.otherPhoto} className="" />
            </motion.div>
          </div>
          {data.perfectFit ? (
            <p className="self-center rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
              {t('compat.perfectFit')}
            </p>
          ) : null}
          <Button asChild variant="gradient" size="lg">
            <Link to={`/app/chats/${data.matchId}`} onClick={onClose}>
              {t('match.sendMessage')}
            </Link>
          </Button>
          <DialogClose asChild>
            <Button variant="secondary">{t('match.keepDiscovering')}</Button>
          </DialogClose>
          <Link
            to={`/app/chats/${data.matchId}?acuerdo=1`}
            onClick={onClose}
            className="self-center text-sm font-semibold text-link underline"
          >
            {t('match.agreement')}
          </Link>
          {sponsored.data ? <SponsoredCard card={sponsored.data} /> : null}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
