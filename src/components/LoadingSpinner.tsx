import { Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function LoadingSpinner({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="w-10 h-10 text-accent animate-spin relative" />
      </div>
      <p className="text-text-secondary text-sm font-medium">{text || t('loading')}</p>
    </div>
  );
}
