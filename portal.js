import { GIC_CONFIG } from './config.js';

const loader = document.getElementById('page-loader');
const html = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const toastRoot = document.getElementById('toast-root');
const pwInput = document.getElementById('password');
const pwToggle = document.getElementById('pw-toggle');
const tabs = document.querySelectorAll('.role-tab');
const deptField = document.getElementById('dept-field');
const oauthSect = document.getElementById('oauth-section');
const usernameField = document.getElementById('username-field');
const usernameInput = document.getElementById('username');
const modeToggle = document.getElementById('mode-toggle');
const authSwitch = document.getElementById('auth-switch');
const submitLabel = document.getElementById('submit-label');
const formHeading = document.getElementById('form-heading');
const formSub = document.getElementById('form-sub');
const forgotLink = document.getElementById('forgot-link');
const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const spinner = document.getElementById('btn-spinner');

let sb = null;
let activeRole = 'student';
let isSignUp = false;

function toast(msg, type = 'info', dur = 4000) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const cols = { success: '#16a34a', error: '#e31b2d', info: '#2563eb', warning: '#d97706' };
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeft = `3px solid ${cols[type]}`;
  el.innerHTML = `<span class="toast-icon" style="color:${cols[type]}">${icons[type]}</span><span>${msg}</span>`;
  toastRoot.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  const dismiss = () => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 360);
  };
  el.addEventListener('click', dismiss);
  setTimeout(dismiss, dur);
}

function applyTheme(t, animate = true) {
  if (animate) {
    html.classList.add('theme-anim');
    setTimeout(() => html.classList.remove('theme-anim'), 460);
  }
  html.setAttribute('data-theme', t);
  themeIcon.textContent = t === 'dark' ? '☾' : '☀';
  try { localStorage.setItem('gic_theme', t); } catch (_ ) {}
}

function initTheme() {
  let initTheme = 'dark';
  try { const s = localStorage.getItem('gic_theme'); if (s === 'light' || s === 'dark') initTheme = s; } catch (_) {}
  applyTheme(initTheme, false);
  themeBtn.addEventListener('click', () => applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

function dismissLoader() {
  loader.classList.add('is-done');
  loader.setAttribute('aria-hidden', 'true');
}

function initLoader() {
  if (document.readyState === 'complete') setTimeout(dismissLoader, 320);
  else window.addEventListener('load', () => setTimeout(dismissLoader, 280), { once: true });
  setTimeout(dismissLoader, 2000);
}

function normalizeRedirect(path) {
  if (!path) return new URL('./index.html', window.location.href).href;
  return path.startsWith('http') ? path : new URL(path, window.location.href).href;
}

async function getSB() {
  if (sb) return sb;
  const url = GIC_CONFIG.supabase?.url || window.GIC_SUPABASE_URL;
  const anonKey = GIC_CONFIG.supabase?.anonKey || window.GIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url === 'YOUR_SUPABASE_URL') return null;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb = createClient(url, anonKey);
    return sb;
  } catch {
    return null;
  }
}

function setMode(signup) {
  isSignUp = signup;
  const labels = { student:'Student', mentor:'Mentor', user:'User' };
  formHeading.textContent = signup ? `Join as ${labels[activeRole]}` : 'Welcome back';
  formSub.textContent = signup ? 'Create your GIC portal account.' : 'Sign in to your account to continue.';
  submitLabel.textContent = signup ? 'Create account' : 'Sign in';
  forgotLink.style.display = signup ? 'none' : '';
  if (usernameField) usernameField.style.display = signup ? '' : 'none';
  authSwitch.innerHTML = signup
    ? `Already have an account? <a href="#" id="mode-toggle">Sign in</a>`
    : `New here? <a href="#" id="mode-toggle">Create an account</a>`;
  document.getElementById('mode-toggle').addEventListener('click', (e) => { e.preventDefault(); setMode(!isSignUp); });
}

function initRoleTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeRole = tab.dataset.role;
      deptField.style.display = activeRole === 'mentor' ? '' : 'none';
      const body = document.getElementById('form-body');
      body.style.animation = 'none';
      requestAnimationFrame(() => { body.style.animation = ''; body.classList.remove('form-body'); void body.offsetWidth; body.classList.add('form-body'); });
      document.getElementById('form-heading').textContent = isSignUp ? `Join as ${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}` : 'Welcome back';
    });
  });
}

function initForgotLink() {
  if (!forgotLink) return;
  forgotLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) { toast('Enter your email first', 'warning'); return; }
    const client = await getSB();
    if (!client) { toast('Supabase not configured yet', 'error'); return; }
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: normalizeRedirect('./login.html'),
    });
    if (error) toast(error.message, 'error');
    else toast('Password reset email sent! Check your inbox.', 'success', 6000);
  });
}

function initPasswordToggle() {
  pwToggle.addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    pwToggle.textContent = show ? '🙈' : '👁';
  });
}

function initRipple() {
  document.querySelectorAll('[data-ripple]').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      const r = btn.getBoundingClientRect();
      const rip = document.createElement('span');
      rip.className = 'ripple';
      rip.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:8px;height:8px;position:absolute;border-radius:50%;`;
      btn.appendChild(rip);
      const max = Math.max(r.width, r.height) * 1.4;
      rip.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: .4 },
        { transform: `translate(-50%,-50%) scale(${max / 4})`, opacity: 0 }
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
      setTimeout(() => rip.remove(), 560);
    });
  });
}

function getRedirectTarget() {
  return normalizeRedirect(GIC_CONFIG.auth?.redirectAfterLogin || './index.html');
}

function authStateListener(client) {
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      toast('Login successful! Redirecting…', 'success');
      setTimeout(() => { window.location.href = getRedirectTarget(); }, 1400);
    }
  });
}

function initForm() {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) { toast('Please fill in email and password', 'warning'); return; }
    if (isSignUp && password.length < 6) { toast('Password must be at least 6 characters', 'warning'); return; }
    const client = await getSB();
    if (!client) { toast('Supabase is not configured. Add your URL and anon key.', 'error', 6000); return; }
    submitBtn.disabled = true;
    spinner.style.display = 'block';
    submitLabel.textContent = isSignUp ? 'Creating…' : 'Signing in…';
    try {
      if (isSignUp) {
        const username = usernameInput ? usernameInput.value.trim() : '';
        const dept = document.getElementById('department')?.value || '';
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: username || email.split('@')[0],
              user_name: username || email.split('@')[0],
              role: activeRole,
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          await client.from('profiles').upsert({
            id: data.user.id,
            username: username || email.split('@')[0],
            full_name: username || email.split('@')[0],
            role: activeRole,
            email: email,
            department: dept || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
        toast('Account created! Check your email to confirm.', 'success', 7000);
        setMode(false);
        form.reset();
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await client.from('profiles').select('role, full_name, username').eq('id', data.user.id).single();
        const name = profile?.full_name || profile?.username || email.split('@')[0];
        toast(`Welcome back, ${name}! 👋`, 'success');
        setTimeout(() => { window.location.href = getRedirectTarget(); }, 1600);
      }
    } catch (err) {
      toast(err.message || 'Something went wrong.', 'error');
    } finally {
      submitBtn.disabled = false;
      spinner.style.display = 'none';
      submitLabel.textContent = isSignUp ? 'Create account' : 'Sign in';
    }
  });
}

function initOAuth() {
  document.getElementById('google-btn').addEventListener('click', () => oauthLogin('google'));
  document.getElementById('github-btn').addEventListener('click', () => oauthLogin('github'));
}

async function oauthLogin(provider) {
  const client = await getSB();
  if (!client) { toast('Supabase not configured', 'error'); return; }
  const redirectTo = normalizeRedirect(GIC_CONFIG.auth?.redirectAfterLogin || './index.html');
  const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
  if (error) toast(error.message, 'error');
}

async function initAuthState() {
  const client = await getSB();
  if (client) authStateListener(client);
}

function init() {
  initLoader();
  initTheme();
  initPasswordToggle();
  initRoleTabs();
  setMode(false);
  initForgotLink();
  initRipple();
  initForm();
  initOAuth();
  initAuthState();
}

init();
