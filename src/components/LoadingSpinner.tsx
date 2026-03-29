import { useTranslation } from '../i18n/useTranslation';
import DragonBallAura from './DragonBallAura';

export default function LoadingSpinner({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <DragonBallAura streamId={7} size="xs" />
      </div>
      <p className="text-sm font-medium channel-name-gradient">{text || t('loading')}</p>
    </div>
  );
}
