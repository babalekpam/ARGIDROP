// Language preference for the mobile app.
// Persists in SecureStore so the choice survives reloads and is available
// before login. Falls back to French (West Africa default).
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const LanguageContext = createContext({ lang: 'fr', setLang: () => {} });
const KEY = 'argidrop_lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('fr');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then(v => {
      if (v === 'fr' || v === 'en') setLangState(v);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const setLang = async (next) => {
    const value = next === 'en' ? 'en' : 'fr';
    setLangState(value);
    try { await SecureStore.setItemAsync(KEY, value); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
