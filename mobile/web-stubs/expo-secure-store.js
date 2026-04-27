const safe = (fn) => {
  try { return fn(); } catch { return null; }
};

module.exports = {
  getItemAsync: async (key) => safe(() => (typeof window !== 'undefined' ? window.localStorage.getItem(key) : null)),
  setItemAsync: async (key, value) => { safe(() => typeof window !== 'undefined' && window.localStorage.setItem(key, value)); },
  deleteItemAsync: async (key) => { safe(() => typeof window !== 'undefined' && window.localStorage.removeItem(key)); },
  isAvailableAsync: async () => typeof window !== 'undefined' && !!window.localStorage,
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  ALWAYS: 'ALWAYS',
};
