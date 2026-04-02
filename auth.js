import sb from './supabase.js';
import store from './store.js';

function html() {
  return `
    <div class="auth-wrap">
      <div class="auth-blob auth-blob-1"></div>
      <div class="auth-blob auth-blob-2"></div>
      <div style="width:100%;max-width:440px;position:relative;z-index:1;">
        <div class="auth-logo u1">
          <div class="auth-logo-icon">T</div>
          <h1>The Pace Setter<br/><em>Academy</em></h1>
          <p>Next-Gen CBT Practice Platform</p>
        </div>
        <div class="glass auth-card u2">
          <div class="auth-tabs">
            <button class="auth-tab active" id="tab-login" onclick="window.__tps_switchTab('login')">Sign In</button>
            <button class="auth-tab" id="tab-signup" onclick="window.__tps_switchTab('signup')">Create Account</button>
          </div>

          <div id="form-login" class="auth-form">
            <div>
              <div class="field-wrap">
                <span class="field-icon">✉</span>
                <input class="field" id="l-id" type="text" placeholder="Email or phone number"/>
              </div>
            </div>
            <div>
              <div class="field-wrap">
                <span class="field-icon">🔒</span>
                <input class="field" id="l-pw" type="password" placeholder="Password"/>
                <button class="field-eye" onclick="window.__tps_togglePwd('l-pw')">👁</button>
              </div>
            </div>
            <div id="l-err" class="err-text" style="display:none;"></div>
            <div id="l-ok"  class="ok-text"  style="display:none;"></div>
            <button class="btn btn-primary btn-full u3" id="l-btn" onclick="window.__tps_login()">
              <span id="l-btn-txt">Access Dashboard</span>
            </button>
          </div>

          <div id="form-signup" class="auth-form" style="display:none;">
            <div class="field-wrap">
              <span class="field-icon">👤</span>
              <input class="field" id="s-name" type="text" placeholder="Full name"/>
            </div>
            <div class="field-wrap">
              <span class="field-icon">✉</span>
              <input class="field" id="s-email" type="email" placeholder="Email address"/>
            </div>
            <div class="field-wrap">
              <span class="field-icon">📞</span>
              <input class="field" id="s-phone" type="tel" placeholder="Phone number"/>
            </div>
            <div class="field-wrap">
              <span class="field-icon">🔒</span>
              <input class="field" id="s-pw" type="password" placeholder="Create password (min. 6 chars)"/>
              <button class="field-eye" onclick="window.__tps_togglePwd('s-pw')">👁</button>
            </div>
            <div id="s-err" class="err-text" style="display:none;"></div>
            <div id="s-ok"  class="ok-text"  style="display:none;"></div>
            <button class="btn btn-primary btn-full" id="s-btn" onclick="window.__tps_signup()">
              <span id="s-btn-txt">Create My Account</span>
            </button>
          </div>
        </div>

        <footer class="auth-footer u4">
          <div class="auth-contact">
            <a href="mailto:eoluwadamilolavictor1320@gmail.com">✉ Support</a>
            <a href="tel:09110228210">📞 09110228210</a>
          </div>
          <p style="margin-top:1rem;">Built by Resolutefemi</p>
        </footer>
      </div>
    </div>`;
}

function mount() {
  window.__tps_switchTab = (tab) => {
    const isLogin = tab === 'login';
    document.getElementById('form-login').style.display  = isLogin ? 'flex'  : 'none';
    document.getElementById('form-signup').style.display = isLogin ? 'none'  : 'flex';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-signup').classList.toggle('active', !isLogin);
  };

  window.__tps_togglePwd = (id) => {
    const el = document.getElementById(id);
    el.type = el.type === 'password' ? 'text' : 'password';
  };

  const setLoading = (form, loading) => {
    const btn = document.getElementById(`${form}-btn`);
    const txt = document.getElementById(`${form}-btn-txt`);
    if (btn) btn.disabled = loading;
    if (txt) txt.textContent = loading ? 'Please wait…' : (form === 'l' ? 'Access Dashboard' : 'Create My Account');
  };

  const showMsg = (id, msg, isErr) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  };

  window.__tps_login = async () => {
    const identifier = document.getElementById('l-id').value.trim();
    const password   = document.getElementById('l-pw').value;
    showMsg('l-err', ''); showMsg('l-ok', '');

    if (!identifier || !password) { showMsg('l-err', 'Please fill in all fields.', true); return; }

    setLoading('l', true);
    let email = identifier;

    if (!/\S+@\S+\.\S+/.test(identifier)) {
      const { data: profile, error } = await sb.from('profiles').select('email').eq('phone', identifier).single();
      if (error || !profile) {
        showMsg('l-err', 'No account found with this phone number.', true);
        setLoading('l', false);
        return;
      }
      email = profile.email;
    }

    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading('l', false);

    if (error) {
      showMsg('l-err', error.message, true);
    } else {
      showMsg('l-ok', 'Welcome back! Redirecting…');
      const { data: { session } } = await sb.auth.getSession();
      store.user = session?.user || null;
      setTimeout(() => { window.location.hash = '#/dashboard'; }, 900);
    }
  };

  window.__tps_signup = async () => {
    const name     = document.getElementById('s-name').value.trim();
    const email    = document.getElementById('s-email').value.trim();
    const phone    = document.getElementById('s-phone').value.trim();
    const password = document.getElementById('s-pw').value;
    showMsg('s-err', ''); showMsg('s-ok', '');

    if (!name || !email || !phone || password.length < 6) {
      showMsg('s-err', 'All fields required — password min. 6 chars.', true);
      return;
    }

    setLoading('s', true);
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name, phone } } });

    if (error) {
      showMsg('s-err', error.message, true);
      setLoading('s', false);
    } else {
      if (data.user) {
        await sb.from('profiles').insert({ id: data.user.id, full_name: name, email, phone });
      }
      setLoading('s', false);
      showMsg('s-ok', 'Account created! Please verify your email, then log in.');
    }
  };
}

export async function renderAuth() {
  document.getElementById('app').innerHTML = html();
  mount();
}
