const store = {
  config: null,
  user: null,

  loadConfig() {
    try { this.config = JSON.parse(sessionStorage.getItem('tps_config') || 'null'); } catch { this.config = null; }
    return this.config;
  },

  saveConfig(cfg) {
    this.config = cfg;
    sessionStorage.setItem('tps_config', JSON.stringify(cfg));
  },

  saveResult(subject, data) {
    sessionStorage.setItem(`tps_result_${subject}`, JSON.stringify(data));
  },

  getResult(subject) {
    try { return JSON.parse(sessionStorage.getItem(`tps_result_${subject}`) || 'null'); } catch { return null; }
  },

  getTimer() {
    try {
      const t = parseInt(sessionStorage.getItem('tps_timer'));
      return !isNaN(t) && t > 0 ? t : null;
    } catch { return null; }
  },

  setTimer(secs) {
    sessionStorage.setItem('tps_timer', secs);
  },

  clearSession() {
    ['tps_config', 'tps_timer'].forEach(k => sessionStorage.removeItem(k));
  },

  pushHistory(entry) {
    try {
      const hist = JSON.parse(localStorage.getItem('tps_history') || '[]');
      hist.push({ ...entry, date: new Date().toISOString() });
      localStorage.setItem('tps_history', JSON.stringify(hist.slice(-50)));
    } catch {}
  }
};

export default store;
