import { Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function LoadingSpinner({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
      <p className="text-text-secondary text-sm">{text || t('loading')}</p>
    </div>
  );
}
