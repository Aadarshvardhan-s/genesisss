/**
 * portal.js — Genesis Incubation Centre Auth Module
 * Handles: login, signup, session management (LocalStorage), profile pic upload,
 *          branch/year fields, logout, role-based flow.
 * UI is NOT changed — all logic is purely behind the scenes.
 */

/* ─── Constants ────────────────────────────────────────────────── */
const SESSION_KEY   = 'gic_session';
const USERS_KEY     = 'gic_users';
const REMEMBER_KEY  = 'gic_remember';

/* ─── Utilities ─────────────────────────────────────────────────── */
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
  catch { return {}; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getSession() {
  try {
    return (
      JSON.parse(sessionStorage.getItem(SESSION_KEY)) ||
      JSON.parse(localStorage.getItem(SESSION_KEY))
    );
  } catch { return null; }
}
function setSession(user, remember) {
  const data = JSON.stringify(user);
  sessionStorage.setItem(SESSION_KEY, data);
  if (remember) localStorage.setItem(SESSION_KEY, data);
  else           localStorage.removeItem(SESSION_KEY);
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function hashPassword(str) {
  // Simple deterministic hash — for LocalStorage-only auth demo
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function toast(msg, type = 'info') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.innerHTML = `<span class="toast-icon" style="color:${type === 'error' ? 'var(--red)' : type === 'success' ? '#22c55e' : 'var(--text-2)'}">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  el.addEventListener('click', () => el.remove());
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 350); }, 3500);
}

/* ─── Page Loader ────────────────────────────────────────────────── */
function dismissLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('is-done');
    loader.setAttribute('aria-hidden', 'true');
  }
}

/* ─── Theme Toggle (login page) ─────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('gic_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.add('theme-anim');
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('gic_theme', next);
      updateThemeIcon(next);
      setTimeout(() => document.documentElement.classList.remove('theme-anim'), 500);
    });
  }
}
function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
}

/* ─── Role Tabs ─────────────────────────────────────────────────── */
let currentRole = 'student';
function initRoleTabs() {
  const tabs = document.querySelectorAll('[data-role]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentRole = tab.dataset.role;
      updateFormForRole();
    });
  });
}
function updateFormForRole() {
  const deptField     = document.getElementById('dept-field');
  const yearField     = document.getElementById('year-field');
  const branchField   = document.getElementById('branch-field');

  // Show department/branch/year for students only
  if (deptField)   deptField.style.display   = (currentRole === 'student' && isSignupMode) ? '' : 'none';
  if (yearField)   yearField.style.display    = (currentRole === 'student' && isSignupMode) ? '' : 'none';
  if (branchField) branchField.style.display  = (currentRole === 'mentor'  && isSignupMode) ? '' : 'none';
}

/* ─── Password Toggle ────────────────────────────────────────────── */
function initPasswordToggle() {
  const toggle = document.getElementById('pw-toggle');
  const input  = document.getElementById('password');
  if (toggle && input) {
    toggle.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.textContent = show ? '🙈' : '👁';
    });
  }
}

/* ─── Signup / Login mode toggle ────────────────────────────────── */
let isSignupMode = false;
function initModeToggle() {
  const modeBtn = document.getElementById('mode-toggle');
  if (!modeBtn) return;
  modeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignupMode = !isSignupMode;
    applyMode();
  });
}
function applyMode() {
  const heading    = document.getElementById('form-heading');
  const sub        = document.getElementById('form-sub');
  const submitLbl  = document.getElementById('submit-label');
  const modeLink   = document.getElementById('auth-switch');
  const oauthSect  = document.getElementById('oauth-section');
  const usernameF  = document.getElementById('username-field');
  const confirmF   = document.getElementById('confirm-field');
  const picF       = document.getElementById('profile-pic-field');
  const rememberRow = document.querySelector('.field-row');

  if (isSignupMode) {
    if (heading)     heading.textContent = 'Create account';
    if (sub)         sub.textContent     = 'Join the Genesis portal today.';
    if (submitLbl)   submitLbl.textContent = 'Sign up';
    if (modeLink)    modeLink.innerHTML  = 'Already have an account? <a href="#" id="mode-toggle">Sign in</a>';
    if (oauthSect)   oauthSect.style.display = 'none';
    if (usernameF)   usernameF.style.display = '';
    if (confirmF)    confirmF.style.display = '';
    if (picF)        picF.style.display = '';
    if (rememberRow) rememberRow.style.display = 'none';
  } else {
    if (heading)     heading.textContent = 'Welcome back';
    if (sub)         sub.textContent     = 'Sign in to your account to continue.';
    if (submitLbl)   submitLbl.textContent = 'Sign in';
    if (modeLink)    modeLink.innerHTML  = 'New here? <a href="#" id="mode-toggle">Create an account</a>';
    if (oauthSect)   oauthSect.style.display = '';
    if (usernameF)   usernameF.style.display = 'none';
    if (confirmF)    confirmF.style.display = 'none';
    if (picF)        picF.style.display = 'none';
    if (rememberRow) rememberRow.style.display = '';
  }

  updateFormForRole();

  // Re-attach mode toggle (innerHTML replaced it)
  const newModeBtn = document.getElementById('mode-toggle');
  if (newModeBtn) {
    newModeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignupMode = !isSignupMode;
      applyMode();
    });
  }
}

/* ─── Inject extra signup fields (non-visual: hidden by default) ── */
function injectExtraFields() {
  const mainFields = document.getElementById('main-fields');
  if (!mainFields) return;

  // Confirm password field
  if (!document.getElementById('confirm-field')) {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'field';
    confirmDiv.id = 'confirm-field';
    confirmDiv.style.display = 'none';
    confirmDiv.innerHTML = `
      <label for="confirm-password">Confirm password</label>
      <div class="pw-wrap">
        <input type="password" id="confirm-password" name="confirm-password" placeholder="••••••••" autocomplete="new-password" />
        <button type="button" class="pw-toggle" id="confirm-pw-toggle" aria-label="Show/hide password">👁</button>
      </div>`;
    mainFields.appendChild(confirmDiv);

    // Toggle for confirm password
    const cToggle = confirmDiv.querySelector('#confirm-pw-toggle');
    const cInput  = confirmDiv.querySelector('#confirm-password');
    cToggle.addEventListener('click', () => {
      const show = cInput.type === 'password';
      cInput.type = show ? 'text' : 'password';
      cToggle.textContent = show ? '🙈' : '👁';
    });
  }

  // Year of study (student signup only)
  if (!document.getElementById('year-field')) {
    const yearDiv = document.createElement('div');
    yearDiv.className = 'field';
    yearDiv.id = 'year-field';
    yearDiv.style.display = 'none';
    yearDiv.innerHTML = `
      <label for="year">Year of study</label>
      <select id="year" name="year">
        <option value="">Select year…</option>
        <option value="1">1st Year</option>
        <option value="2">2nd Year</option>
        <option value="3">3rd Year</option>
        <option value="4">4th Year</option>
      </select>`;
    mainFields.appendChild(yearDiv);
  }

  // Branch / specialisation (mentor signup only)
  if (!document.getElementById('branch-field')) {
    const branchDiv = document.createElement('div');
    branchDiv.className = 'field';
    branchDiv.id = 'branch-field';
    branchDiv.style.display = 'none';
    branchDiv.innerHTML = `
      <label for="branch">Specialisation / Branch</label>
      <input type="text" id="branch" name="branch" placeholder="e.g. Electronics & IoT" />`;
    mainFields.appendChild(branchDiv);
  }

  // Profile picture upload (signup only)
  if (!document.getElementById('profile-pic-field')) {
    const picDiv = document.createElement('div');
    picDiv.className = 'field';
    picDiv.id = 'profile-pic-field';
    picDiv.style.display = 'none';
    picDiv.innerHTML = `
      <label for="profile-pic">Profile picture <span style="font-weight:400;text-transform:none;color:var(--text-3)">(optional)</span></label>
      <input type="file" id="profile-pic" name="profile-pic" accept="image/*" style="padding:.5rem .6rem;" />`;
    mainFields.appendChild(picDiv);
  }
}

/* ─── Profile picture → base64 ───────────────────────────────────── */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

/* ─── Form submission ────────────────────────────────────────────── */
function initForm() {
  const form      = document.getElementById('login-form');
  const spinner   = document.getElementById('btn-spinner');
  const submitBtn = document.getElementById('submit-btn');
  const submitLbl = document.getElementById('submit-label');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const remember = document.getElementById('remember')?.checked;

    if (!email || !password) { toast('Please fill in all required fields.', 'error'); return; }

    // Show spinner
    if (spinner)   spinner.style.display = '';
    if (submitLbl) submitLbl.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    // Simulate async delay
    await new Promise(r => setTimeout(r, 600));

    try {
      if (isSignupMode) {
        await handleSignup(email, password, remember);
      } else {
        await handleLogin(email, password, remember);
      }
    } finally {
      if (spinner)   spinner.style.display = 'none';
      if (submitLbl) submitLbl.style.display = '';
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

async function handleSignup(email, password) {
  const username = document.getElementById('username')?.value.trim();
  const confirm  = document.getElementById('confirm-password')?.value;
  const deptEl   = document.getElementById('department');
  const yearEl   = document.getElementById('year');
  const branchEl = document.getElementById('branch');
  const picEl    = document.getElementById('profile-pic');

  if (!username)          { toast('Please choose a username.', 'error'); return; }
  if (password !== confirm) { toast('Passwords do not match.', 'error'); return; }
  if (password.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }

  const users = getUsers();
  if (users[email])       { toast('An account with this email already exists.', 'error'); return; }

  let avatarDataUrl = null;
  if (picEl?.files?.[0]) {
    try { avatarDataUrl = await readFileAsDataURL(picEl.files[0]); }
    catch { /* avatar optional, silently skip */ }
  }

  const newUser = {
    email,
    username,
    passwordHash: hashPassword(password),
    role:         currentRole,
    department:   deptEl?.value  || '',
    year:         yearEl?.value  || '',
    branch:       branchEl?.value || '',
    avatar:       avatarDataUrl,
    createdAt:    new Date().toISOString(),
  };

  users[email] = newUser;
  saveUsers(users);

  const session = { ...newUser };
  delete session.passwordHash;
  setSession(session, false);

  toast(`Account created! Welcome, ${username} 🎉`, 'success');
  await new Promise(r => setTimeout(r, 900));
  window.location.href = 'dashboard.html';
}

async function handleLogin(email, password, remember) {
  const users = getUsers();
  const user  = users[email];
  if (!user || user.passwordHash !== hashPassword(password)) {
    toast('Invalid email or password.', 'error');
    return;
  }

  const session = { ...user };
  delete session.passwordHash;
  setSession(session, remember);

  toast(`Welcome back, ${user.username || user.email}!`, 'success');
  await new Promise(r => setTimeout(r, 700));
  window.location.href = 'dashboard.html';
}

/* ─── OAuth placeholders (Google / GitHub) ───────────────────────── */
function initOAuth() {
  document.getElementById('google-btn')?.addEventListener('click', () => {
    toast('Google OAuth requires a backend integration. Use email signup for now.', 'info');
  });
  document.getElementById('github-btn')?.addEventListener('click', () => {
    toast('GitHub OAuth requires a backend integration. Use email signup for now.', 'info');
  });
}

/* ─── Forgot password ────────────────────────────────────────────── */
function initForgotPassword() {
  document.getElementById('forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('email')?.value.trim();
    if (!email) { toast('Enter your email first, then click Forgot password.', 'info'); return; }
    toast(`A reset link has been sent to ${email} (demo mode — no actual email sent).`, 'info');
  });
}

/* ─── Ripple effect on submit button ────────────────────────────── */
function initRipple() {
  document.querySelectorAll('[data-ripple]').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const r   = Math.max(btn.clientWidth, btn.clientHeight);
      const rEl = document.createElement('span');
      rEl.className = 'ripple';
      Object.assign(rEl.style, {
        width: r * 2 + 'px', height: r * 2 + 'px',
        left:  e.clientX - btn.getBoundingClientRect().left + 'px',
        top:   e.clientY - btn.getBoundingClientRect().top  + 'px',
      });
      btn.appendChild(rEl);
      requestAnimationFrame(() => { rEl.style.transform = 'translate(-50%,-50%) scale(1)'; rEl.style.opacity = '0'; });
      rEl.addEventListener('transitionend', () => rEl.remove());
    });
  });
}

/* ─── Redirect if already logged in ─────────────────────────────── */
function checkAlreadyLoggedIn() {
  const session = getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
}

/* ─── Boot ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  checkAlreadyLoggedIn();
  initTheme();
  initRoleTabs();
  injectExtraFields();
  initModeToggle();
  initPasswordToggle();
  initForm();
  initOAuth();
  initForgotPassword();
  initRipple();
  dismissLoader();
});
