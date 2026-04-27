import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import fr from './locales/fr';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      // French is the platform default (Togo / West African francophone market).
      // Only honor an explicit user choice persisted in localStorage; otherwise
      // fall through to fallbackLng ('fr').
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'argidrop_lang',
    },
    returnObjects: true,
  });

export default i18n;
