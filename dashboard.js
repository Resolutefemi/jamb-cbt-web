import sb from './supabase.js';
import store from './store.js';

const SUBJECTS = [
  { key: 'english',     label: 'English Language', icon: '📝' },
  { key: 'mathematics', label: 'Mathematics',       icon: '🔢' },
  { key: 'physics',     label: 'Physics',           icon: '⚛️' },
  { key: 'chemistry',   label: 'Chemistry',         icon: '🧪' },
  { key: 'biology',     label: 'Biology',           icon: '🧬' },
];

let selected = [];
let examMode = 'exam';

function getSelectionMode() {
  if (selected.length === 1) return 'single';
  if (selected.length === 4 && selected.includes('english')) return 'combination';
  return null;
}

function syncSelInfo() {
  const el = document.getElementById('sel-info');
  if (!el) return;
  const mode = getSelectionMode();
  if (selected.length === 0) {
    el.innerHTML = `<span style="color:var(--muted)">Select 1 subject or English + 3 others</span>`;
  } else if (mode === 'single') {
    el.innerHTML = `✓ Single subject — <strong>${SUBJECTS.find(s => s.key === selected[0])?.label}</strong>`;
  } else if (mode === 'combination') {
    el.innerHTML = `✓ JAMB Combination — ${selected.map(k => SUBJECTS.find(s => s.key === k)?.label).join(', ')}`;
  } else {
    el.innerHTML = `<span style="color:var(--warn)">Select exactly 1 subject OR English + 3 others (${selected.length}/4)</span>`;
  }
}

function syncCards() {
  const isCombo = selected.length >= 4;
  SUBJECTS.forEach(({ key }) => {
    const card = document.querySelector(`[data-subj="${key}"]`);
    if (!card) return;
    const isSel = selected.includes(key);
    card.classList.toggle('selected', isSel);
    const isDisabled = !isSel && isCombo;
    card.classList.toggle('disabled', isDisabled);
  });
  syncSelInfo();
}

function toggleSubject(key) {
  if (selected.includes(key)) {
    selected = selected.filter(s => s !== key);
  } else {
    if (selected.length >= 4) return;
    selected.push(key);
  }
  syncCards();
}

function html(userName) {
  return `
    <div class="dash-wrap">
      <header class="dash-header u1">
        <div class="dash-logo">🎓 The Pace Setter <em>Academy</em> <span style="font-size:0.65em;opacity:0.7;">© OMOJ</span></div>
        <div class="dash-user">
          <div class="dash-user-name">${userName || 'Student'}</div>
          <div class="dash-user-sub">JAMB Prep Platform</div>
        </div>
      </header>

      <div class="dash-grid">
        <section>
          <p class="dash-section-title u2">Select Subjects</p>
          <div id="sel-info" class="sel-info u2">
            <span style="color:var(--muted)">Select 1 subject or English + 3 others</span>
          </div>
          <div class="subject-grid u3">
            ${SUBJECTS.map(({ key, label, icon }) => `
              <div class="subj-card" data-subj="${key}" onclick="window.__tps_toggleSubj('${key}')">
                <div class="subj-check">✓</div>
                <span class="subj-icon">${icon}</span>
                <span class="subj-name">${label}</span>
              </div>`).join('')}
          </div>
        </section>

        <aside>
          <div class="glass config-panel u3">
            <p class="dash-section-title">Exam Settings</p>

            <div style="margin-bottom:1.3rem;">
              <span class="lbl">Study Mode</span>
              <div class="mode-toggle">
                <button class="mode-btn active" id="mode-exam"     onclick="window.__tps_setMode('exam')">Exam</button>
                <button class="mode-btn"         id="mode-practice" onclick="window.__tps_setMode('practice')">Practice</button>
              </div>
            </div>

            <div style="margin-bottom:1.3rem;">
              <span class="lbl">Questions Per Subject</span>
              <select class="field" id="qcount">
                <option value="10">10 Questions</option>
                <option value="20">20 Questions</option>
                <option value="40" selected>40 Questions</option>
                <option value="60">60 Questions</option>
              </select>
            </div>

            <div style="margin-bottom:1.3rem;">
              <span class="lbl">Time Limit (Minutes)</span>
              <input class="field" type="number" id="timerMins" value="60" min="5" max="180"/>
            </div>

            <div id="start-err" class="err-text" style="display:none;margin-bottom:.8rem;"></div>

            <button class="btn btn-primary btn-full" onclick="window.__tps_startExam()">
              Launch Exam →
            </button>

            <p class="config-note">
              Questions loaded from local JSON files.<br/>
              History saved to your browser.
            </p>

            <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);text-align:center;font-size:0.75rem;opacity:0.65;line-height:1.8;">
              <strong>© OMOJ</strong> — All Rights Reserved<br/>
              📧 eoluwadamilolavictor1320@gmail.com<br/>
              📞 08104735560 &nbsp;|&nbsp; 09110228210<br/>
              <span style="font-size:0.7rem;opacity:0.8;">Built by Resolute Femi</span>
            </div>
          </div>
        </aside>
      </div>
    </div>`;
}

function mount() {
  window.__tps_toggleSubj = toggleSubject;

  window.__tps_setMode = (mode) => {
    examMode = mode;
    document.getElementById('mode-exam').classList.toggle('active', mode === 'exam');
    document.getElementById('mode-practice').classList.toggle('active', mode === 'practice');
  };

  window.__tps_startExam = () => {
    const errEl = document.getElementById('start-err');
    errEl.style.display = 'none';
    const mode = getSelectionMode();

    if (!mode) {
      errEl.textContent = selected.length === 0
        ? 'Please select at least one subject.'
        : selected.length < 4
          ? 'For combination mode: select English + exactly 3 other subjects.'
          : 'Invalid selection. Choose 1 subject or English + 3 others.';
      errEl.style.display = 'block';
      return;
    }

    const cfg = {
      subjects: selected,
      examMode: mode,
      testMode: examMode,
      qcount:   parseInt(document.getElementById('qcount').value),
      timerMins: parseInt(document.getElementById('timerMins').value),
    };

    store.saveConfig(cfg);
    window.location.hash = '#/exam';
  };
}

export async function renderDashboard() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.hash = '#/auth'; return; }

  store.user = session.user;
  const meta = session.user.user_metadata;
  const name = meta?.full_name?.split(' ')[0] || session.user.email?.split('@')[0] || 'Student';

  selected = [];
  examMode = 'exam';

  document.getElementById('app').innerHTML = html(`Welcome, ${name}`);
  mount();
}
