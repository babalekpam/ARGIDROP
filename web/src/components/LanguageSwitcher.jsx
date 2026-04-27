import React from 'react';
import { useTranslation } from 'react-i18next';

const C = { paper: '#FDFBF6', forest: '#1B4332', muted: '#6B6560', border: '#E4DCC9' };

export default function LanguageSwitcher({ compact = false, dark = false }) {
  const { i18n } = useTranslation();
  const cur = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';
  const next = cur === 'fr' ? 'en' : 'fr';
  const label = next === 'fr' ? 'FR' : 'EN';

  const colorBg = dark ? 'transparent' : C.paper;
  const colorBorder = dark ? 'rgba(255,255,255,0.25)' : C.border;
  const colorText = dark ? C.paper : C.muted;

  return (
    <button
      type="button"
      aria-label={`Switch to ${next === 'fr' ? 'French' : 'English'}`}
      onClick={() => i18n.changeLanguage(next)}
      style={{
        background: colorBg,
        color: colorText,
        border: `1px solid ${colorBorder}`,
        borderRadius: 4,
        padding: compact ? '6px 10px' : '9px 14px',
        fontWeight: 500,
        fontSize: compact ? 11 : 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}
