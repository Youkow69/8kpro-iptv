import { create } from 'zustand';
import { translations, languages, type LangCode } from './translations';

interface I18nState {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

const STORAGE_KEY = 'iptv_lang';

function getInitialLang(): LangCode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in languages) return saved as LangCode;
  const browserLang = navigator.language.split('-')[0];
  if (browserLang in languages) return browserLang as LangCode;
  return 'fr';
}

export const useI18nStore = create<I18nState>((set) => ({
  lang: getInitialLang(),
  setLang: (lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    set({ lang });
  },
}));

export function useTranslation() {
  const { lang, setLang } = useI18nStore();
  const t = (key: string): string => {
    return translations[lang]?.[key] || translations.fr[key] || key;
  };
  return { t, lang, setLang, languages };
}

export { languages, type LangCode };
