import sb from './supabase.js';
import store from './store.js';

const LABEL = {
  english: 'English Language', mathematics: 'Mathematics',
  physics: 'Physics', biology: 'Biology', chemistry: 'Chemistry',
};

const ICON = {
  english: '📝', mathematics: '🔢', physics: '⚛️', biology: '🧬', chemistry: '🧪',
};

let cfg = {};
let allQuestions = {};
let userAnswers  = {};
let currentSubjIdx = 0;
let currentQIdx    = 0;
let timerSecs      = 0;
let timerInterval  = null;
let examEnded      = false;
let examStartTime  = 0;
let mobileGridOpen = false;

function pad(n) { return String(n).padStart(2, '0'); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchSubject(subj) {
  try {
    // JSON files are in the same folder now
    const res = await fetch(`${subj}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const shuffled = shuffle(raw).slice(0, cfg.qcount);
    return shuffled.map(q => ({ ...q, explanation: q.explanation || '' }));
  } catch {
    return [];
  }
}

function currentSubj() { return cfg.subjects[currentSubjIdx]; }
function currentQs()   { return allQuestions[currentSubj()] || []; }
function currentQ()    { return currentQs()[currentQIdx] || null; }
function userAns()     { return userAnswers[currentSubj()]?.[currentQIdx]; }

function totalAnswered() {
  let n = 0;
  cfg.subjects.forEach(s => {
    n += Object.keys(userAnswers[s] || {}).length;
  });
  return n;
}

function totalQuestions() {
  return cfg.subjects.reduce((a, s) => a + (allQuestions[s]?.length || 0), 0);
}

function renderTimer() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  const h = Math.floor(timerSecs / 3600);
  const m = Math.floor((timerSecs % 3600) / 60);
  const s = timerSecs % 60;
  el.textContent = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  el.className = timerSecs <= 60 ? 'danger' : timerSecs <= 300 ? 'warn' : '';
}

function renderProgress() {
  const total = totalQuestions();
  const answered = totalAnswered();
  const pct = total > 0 ? (answered / total) * 100 : 0;
  const bar = document.querySelector('.progress-fill');
  if (bar) bar.style.width = `${pct}%`;
  const sa = document.getElementById('stat-answered');
  const st = document.getElementById('stat-total');
  if (sa) sa.textContent = answered;
  if (st) st.textContent = total;
}

function renderTabs() {
  const el = document.getElementById('subj-tabs');
  if (!el) return;
  if (cfg.subjects.length <= 1) { el.style.display = 'none'; return; }
  el.innerHTML = cfg.subjects.map((s, i) => {
    const done   = i < currentSubjIdx;
    const active = i === currentSubjIdx;
    return `<div class="subj-tab-item${active ? ' active' : ''}${done ? ' done' : ''}"
      ${done ? `onclick="window.__tps_switchSubj(${i})"` : ''}>
      ${done ? '✓ ' : active ? '● ' : ''}${LABEL[s] || s}
    </div>`;
  }).join('');
}

function renderGrid() {
  const qs   = currentQs();
  const subj = currentSubj();
  const gridHtml = qs.map((q, i) => {
    const ans      = userAnswers[subj]?.[i];
    const isActive = i === currentQIdx;
    let cls = 'q-grid-btn';
    if (isActive) cls += ' active';
    if (ans !== undefined && !isActive) {
      if (cfg.testMode === 'practice') {
        cls += ans === q.answer ? ' correct' : ' wrong';
      } else {
        cls += ' answered';
      }
    }
    return `<button class="${cls}" onclick="window.__tps_jumpTo(${i})">${i + 1}</button>`;
  }).join('');

  const grid    = document.getElementById('q-grid');
  const gridMob = document.getElementById('q-grid-mob');
  if (grid)    grid.innerHTML    = gridHtml;
  if (gridMob) gridMob.innerHTML = gridHtml;
}

function renderQuestion() {
  const q    = currentQ();
  const subj = currentSubj();
  const qs   = currentQs();
  const ans  = userAns();

  const tracker = document.getElementById('q-tracker');
  if (tracker) tracker.textContent = `Q ${currentQIdx + 1} / ${qs.length}`;

  const subjectLabel = document.getElementById('q-subj-label');
  if (subjectLabel) subjectLabel.textContent = `${ICON[subj] || ''} ${LABEL[subj] || subj}`;

  const qText = document.getElementById('q-text');
  if (!q) {
    if (qText) qText.innerHTML = `<span style="color:var(--muted);font-style:italic;">No question available for this subject. Check that ${subj}.json is present.</span>`;
    const opts = document.getElementById('opts');
    if (opts) opts.innerHTML = '';
    return;
  }
  if (qText) qText.innerHTML = q.question || '';

  const opts = document.getElementById('opts');
  if (!opts) return;

  const keys       = ['a', 'b', 'c', 'd'];
  const correctKey = (q.answer || '').toLowerCase().trim();
  const locked     = examEnded || (cfg.testMode === 'exam' && ans !== undefined);

  opts.innerHTML = keys.map(key => {
    const val = q.option?.[key];
    if (!val || val === 'null') return '';
    const isSelected  = ans === key;
    const isCorrect   = key === correctKey;
    const showResult  = cfg.testMode === 'practice' && ans !== undefined;

    let cls = 'opt';
    if (showResult) {
      if (isCorrect)              cls += ' correct-ans';
      else if (isSelected)        cls += ' wrong-ans';
    } else if (isSelected) {
      cls += ' selected';
    }

    return `<div class="${cls}" ${locked ? '' : `onclick="window.__tps_select('${key}')"`}>
      <div class="opt-key">${key.toUpperCase()}</div>
      <div class="opt-text">${val}</div>
      ${showResult && isCorrect ? '<div class="opt-badge">✓ Correct</div>' : ''}
    </div>`;
  }).join('');

  if (cfg.testMode === 'practice' && ans !== undefined && q.explanation) {
    opts.innerHTML += `<div class="explanation-box">
      <div class="explanation-label">Explanation</div>
      <p>${q.explanation}</p>
    </div>`;
  }

  const btnPrev    = document.getElementById('btn-prev');
  const btnNext    = document.getElementById('btn-next');
  const btnPrevMob = document.getElementById('btn-prev-mob');
  const btnNextMob = document.getElementById('btn-next-mob');

  const isLast     = currentQIdx === qs.length - 1;
  const isLastSubj = currentSubjIdx === cfg.subjects.length - 1;
  const nextLabel  = isLast
    ? (isLastSubj ? 'Submit Exam' : `Next: ${LABEL[cfg.subjects[currentSubjIdx + 1]] || ''}`)
    : 'Next →';

  [btnPrev, btnPrevMob].forEach(b => { if (b) b.disabled = currentQIdx === 0; });
  [btnNext, btnNextMob].forEach(b => { if (b) b.textContent = nextLabel; });

  renderGrid();
  renderProgress();
}

function selectOption(key) {
  if (examEnded) return;
  const subj = currentSubj();
  const q    = currentQ();
  if (!q) return;
  if (cfg.testMode === 'exam' && userAnswers[subj]?.[currentQIdx] !== undefined) return;
  if (!userAnswers[subj]) userAnswers[subj] = {};
  userAnswers[subj][currentQIdx] = key;
  renderQuestion();

  if (cfg.testMode === 'practice') {
    const correct = key === (q.answer || '').toLowerCase().trim();
    if (correct) setTimeout(() => nextQ(), 1400);
  }
}

function nextQ() {
  const qs = currentQs();
  if (currentQIdx < qs.length - 1) {
    currentQIdx++;
    renderQuestion();
  } else if (currentSubjIdx < cfg.subjects.length - 1) {
    switchSubject(currentSubjIdx + 1);
  } else {
    showConfirmModal();
  }
}

function prevQ() {
  if (currentQIdx > 0) { currentQIdx--; renderQuestion(); }
}

function switchSubject(idx) {
  currentSubjIdx = idx;
  currentQIdx    = 0;
  renderTabs();
  renderQuestion();
  closeMobileGrid();
}

function startTimer() {
  timerSecs = cfg.timerMins * 60;
  renderTimer();
  timerInterval = setInterval(() => {
    timerSecs--;
    store.setTimer(timerSecs);
    renderTimer();
    if (timerSecs <= 0) { clearInterval(timerInterval); autoSubmit(); }
  }, 1000);
}

function autoSubmit() {
  examEnded = true;
  showResults('⏰ Time Up!');
}

function collectResults() {
  let totalCorrect = 0, totalQ = 0;
  const breakdown = [];
  cfg.subjects.forEach(subj => {
    const qs = allQuestions[subj] || [];
    let correct = 0;
    qs.forEach((q, i) => {
      totalQ++;
      if (userAnswers[subj]?.[i] === (q.answer || '').toLowerCase().trim()) correct++;
    });
    totalCorrect += correct;
    breakdown.push({ subj, label: LABEL[subj] || subj, correct, total: qs.length, pct: qs.length ? Math.round((correct / qs.length) * 100) : 0 });
  });
  return { totalCorrect, totalQ, breakdown };
}

function scoreColor(pct) {
  return pct >= 70 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)';
}

function showResults(heading) {
  examEnded = true;
  clearInterval(timerInterval);
  const elapsed   = Math.round((Date.now() - examStartTime) / 1000);
  const timeSpent = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  const { totalCorrect, totalQ, breakdown } = collectResults();
  const pct        = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0;
  const col        = scoreColor(pct);
  const grade      = pct >= 70 ? '🏆' : pct >= 50 ? '✅' : '📚';
  const gradeLabel = pct >= 70 ? 'Excellent Work!' : pct >= 50 ? 'Good Effort!' : 'Keep Practising';

  const breakdownHtml = breakdown.map(b => `
    <div class="result-row">
      <span>${b.label}</span>
      <span style="font-weight:700;color:${scoreColor(b.pct)};font-family:var(--mono);">${b.correct}/${b.total} &nbsp;${b.pct}%</span>
    </div>`).join('');

  const reviewHtml = (allQuestions[cfg.subjects[currentSubjIdx]] || []).map((q, i) => {
    const subj    = currentSubj();
    const ans     = userAnswers[subj]?.[i];
    const correct = ans === (q.answer || '').toLowerCase().trim();
    const skipped = ans === undefined;
    const c       = skipped ? 'var(--muted)' : correct ? 'var(--good)' : 'var(--danger)';
    const icon    = skipped ? '–' : correct ? '✓' : '✗';
    return `<div class="rev-item">
      <div class="rev-num" style="color:${c}">Q${i + 1} ${icon}</div>
      <div class="rev-q">${q.question}</div>
      <div class="rev-ans" style="color:${c}">Your answer: ${ans ? (q.option?.[ans] || ans) : '(skipped)'}</div>
      ${!correct && !skipped ? `<div class="rev-corr">Correct: ${q.option?.[q.answer] || q.answer}</div>` : ''}
      ${q.explanation ? `<div class="rev-expl">${q.explanation}</div>` : ''}
    </div>`;
  }).join('');

  store.pushHistory({ subjects: cfg.subjects, score: totalCorrect, total: totalQ, mode: cfg.testMode, pct });

  if (store.user) {
    sb.from('exam_history').insert({
      user_id:         store.user.id,
      subjects:        cfg.subjects,
      exam_mode:       cfg.examMode,
      test_mode:       cfg.testMode,
      score:           totalCorrect,
      total_questions: totalQ,
      percentage:      pct,
      time_spent:      timeSpent,
    }).then(() => {});
  }

  document.getElementById('app').innerHTML = `
    <div class="result-page">
      <div class="glass result-hero">
        <div class="result-grade">${grade}</div>
        <div class="result-label">${gradeLabel}</div>
        <div class="result-pct" style="color:${col}">${pct}%</div>
        <div class="result-sub">${totalCorrect} / ${totalQ} correct &nbsp;·&nbsp; ${timeSpent}</div>
        <div class="result-breakdown">${breakdownHtml}</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:1rem;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="window.location.hash='#/dashboard'">← Dashboard</button>
          <button class="btn btn-ghost" onclick="window.location.hash='#/exam'">Retry Exam</button>
        </div>
      </div>
      <div class="review-wrap">
        <h2 class="review-h">Question Review — ${LABEL[cfg.subjects[currentSubjIdx]] || ''}</h2>
        <div class="review-list">${reviewHtml}</div>
      </div>
    </div>`;
}

function showConfirmModal() {
  if (examEnded) return;
  const { totalQ } = collectResults();
  const answered   = totalAnswered();
  const unanswered = totalQ - answered;

  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.id = 'confirm-modal';
  el.innerHTML = `
    <div class="modal-box">
      <h3>Submit Exam?</h3>
      <p>${unanswered > 0
        ? `You have <strong style="color:var(--warn)">${unanswered} unanswered</strong> question(s). `
        : 'All questions answered. '}Are you sure you want to submit?</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('confirm-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="window.__tps_submitExam()">Submit Now</button>
      </div>
    </div>`;
  document.body.appendChild(el);
}

function openMobileGrid() {
  mobileGridOpen = true;
  document.getElementById('grid-drawer')?.classList.add('open');
  document.getElementById('grid-overlay')?.classList.add('open');
}

function closeMobileGrid() {
  mobileGridOpen = false;
  document.getElementById('grid-drawer')?.classList.remove('open');
  document.getElementById('grid-overlay')?.classList.remove('open');
}

function buildShell() {
  const isMulti = cfg.subjects.length > 1;
  const subj    = cfg.subjects[0];

  return `
    <div class="exam-shell">
      <div class="exam-topbar">
        <div class="exam-topbar-inner">
          <div class="topbar-brand">
            <div class="topbar-logo">T</div>
            <div>
              <div class="topbar-name">The Pace Setter <em>Academy</em></div>
              <div class="topbar-subj" id="topbar-subj">${ICON[subj] || ''} ${LABEL[subj] || subj}</div>
            </div>
          </div>
          <div class="timer-pill">
            <span style="font-size:0.8rem;color:var(--muted)">⏱</span>
            <div id="timer-display">--:--</div>
          </div>
          <button class="btn btn-danger" style="padding:7px 14px;font-size:0.8rem;" onclick="window.__tps_finishEarly()">⬛ Finish</button>
        </div>
        <div class="progress-rail"><div class="progress-fill"></div></div>
      </div>

      ${isMulti ? `<div class="subj-tabs-bar" id="subj-tabs"></div>` : `<div id="subj-tabs" style="display:none"></div>`}

      <div class="exam-body">
        <aside class="exam-sidebar glass">
          <div class="sidebar-card" style="padding:1.2rem;">
            <div class="sidebar-title">Progress</div>
            <div class="stats-row">
              <div class="stat-box"><div class="stat-num em" id="stat-answered">0</div><div class="stat-lbl">Answered</div></div>
              <div class="stat-box"><div class="stat-num dim" id="stat-total">–</div><div class="stat-lbl">Total</div></div>
            </div>
          </div>
          <div class="sidebar-card glass" style="flex:1;padding:1.2rem;">
            <div class="sidebar-title">Question Map</div>
            <div class="q-grid" id="q-grid"></div>
          </div>
          <button class="btn btn-danger btn-full" onclick="window.__tps_finishEarly()">Submit &amp; Finish</button>
        </aside>

        <div class="exam-main">
          <div class="glass q-card">
            <div class="q-card-accent"></div>
            <div class="q-meta">
              <span id="q-tracker">Q 1 / –</span>
              <span class="q-meta-dot">|</span>
              <span id="q-subj-label">${ICON[subj] || ''} ${LABEL[subj] || subj}</span>
            </div>
            <div id="q-text">Loading…</div>
            <div class="opts" id="opts"></div>
            <div class="q-nav">
              <button class="btn btn-ghost" id="btn-prev" onclick="window.__tps_prevQ()">← Previous</button>
              <button class="btn btn-primary" id="btn-next" onclick="window.__tps_nextQ()">Next →</button>
            </div>
          </div>
        </div>
      </div>

      <div class="mobile-nav-bar" id="mobile-nav">
        <button class="btn btn-ghost" id="btn-prev-mob" onclick="window.__tps_prevQ()" style="flex:1;">← Prev</button>
        <button class="btn btn-ghost" onclick="window.__tps_openGrid()" style="flex:1;">📋 Map</button>
        <button class="btn btn-primary" id="btn-next-mob" onclick="window.__tps_nextQ()" style="flex:1;">Next →</button>
      </div>

      <div class="grid-overlay" id="grid-overlay" onclick="window.__tps_closeGrid()"></div>
      <div class="grid-drawer" id="grid-drawer">
        <div class="drawer-handle"></div>
        <div class="sidebar-title" style="margin-bottom:.8rem;">Question Map</div>
        <div class="q-grid" id="q-grid-mob" style="max-height:unset;grid-template-columns:repeat(8,1fr);"></div>
        <div style="margin-top:1rem;display:flex;gap:8px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="window.__tps_closeGrid()">Close</button>
          <button class="btn btn-danger" style="flex:1;" onclick="window.__tps_finishEarly()">Submit</button>
        </div>
      </div>

      <div class="modal-overlay" id="loading-overlay">
        <div class="modal-box" style="text-align:center;">
          <div class="spinner"></div>
          <p style="font-weight:700;color:#fff;margin-bottom:.4rem;">Loading Questions</p>
          <p style="color:var(--muted);font-size:0.82rem;">Preparing your exam…</p>
        </div>
      </div>
    </div>`;
}

function mountHandlers() {
  window.__tps_select      = selectOption;
  window.__tps_nextQ       = nextQ;
  window.__tps_prevQ       = prevQ;
  window.__tps_jumpTo      = (i) => { currentQIdx = i; renderQuestion(); closeMobileGrid(); };
  window.__tps_switchSubj  = switchSubject;
  window.__tps_openGrid    = openMobileGrid;
  window.__tps_closeGrid   = closeMobileGrid;
  window.__tps_finishEarly = () => { if (!examEnded) showConfirmModal(); };
  window.__tps_submitExam  = () => {
    document.getElementById('confirm-modal')?.remove();
    clearInterval(timerInterval);
    examEnded = true;
    showResults('Exam Complete');
  };
}

export async function renderExam() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.hash = '#/auth'; return; }
  store.user = session.user;

  cfg = store.loadConfig();
  if (!cfg || !cfg.subjects?.length) { window.location.hash = '#/dashboard'; return; }

  allQuestions   = {};
  userAnswers    = {};
  currentSubjIdx = 0;
  currentQIdx    = 0;
  examEnded      = false;

  cfg.subjects.forEach(s => { userAnswers[s] = {}; });

  document.getElementById('app').innerHTML = buildShell();
  mountHandlers();

  const loads = cfg.subjects.map(async (subj) => {
    allQuestions[subj] = await fetchSubject(subj);
  });
  await Promise.all(loads);

  document.getElementById('loading-overlay')?.remove();

  examStartTime = Date.now();
  startTimer();

  if (cfg.subjects.length > 1) renderTabs();
  renderQuestion();
}
