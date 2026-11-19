// Neon Palms — save data in localStorage: cash, story progress, whether the
// player owns the pistol, and the free-roam flag once the story is done.
// Wrapped in try/catch because some browsers refuse storage on file pages.
window.NP = window.NP || {};

NP.save = (function () {
  const KEY = 'neon-palms-save-v1';

  function fresh() {
    return { cash: 120, mission: 0, hasPistol: false, storyDone: false, started: true };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.cash !== 'number') return null;
      return Object.assign(fresh(), data);
    } catch (err) {
      return null;
    }
  }

  function has() {
    try {
      return !!localStorage.getItem(KEY);
    } catch (err) {
      return false;
    }
  }

  function store(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) { /* storage unavailable: the run simply is not saved */ }
  }

  function wipe() {
    try {
      localStorage.removeItem(KEY);
    } catch (err) { /* nothing to wipe */ }
  }

  return { fresh, load, has, store, wipe };
})();
