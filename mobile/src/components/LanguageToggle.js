import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLang } from '../context/LanguageContext';

const C = { paper: '#FDFBF6', forest: '#1B4332', muted: '#6B6560', border: '#E4DCC9' };

export default function LanguageToggle({ dark = false, style }) {
  const { lang, setLang } = useLang();
  const next = lang === 'fr' ? 'en' : 'fr';
  const label = next === 'fr' ? 'FR' : 'EN';

  return (
    <TouchableOpacity
      onPress={() => setLang(next)}
      accessibilityLabel={`Switch to ${next === 'fr' ? 'French' : 'English'}`}
      style={[
        s.btn,
        dark
          ? { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }
          : { backgroundColor: C.paper, borderColor: C.border },
        style,
      ]}
      activeOpacity={0.75}
    >
      <Text style={[s.txt, dark && { color: C.paper }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6, minWidth: 40, alignItems: 'center' },
  txt: { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 1 },
});
