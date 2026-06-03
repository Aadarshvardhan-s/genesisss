/**
 * portal.js — Genesis Incubation Centre Auth Module
 * Handles: login, signup, session management (LocalStorage), profile pic upload,
 *          branch/year fields, logout, role-based flow.
 * UI is NOT changed — all logic is purely behind the scenes.
 */

/* ─── Constants ────────────────────────────────────────────────── */
import supabase, { auth, storage } from '../supabase-config.js';

let currentProfile = null;

/* ─── Utilities ─────────────────────────────────────────────────── */
async function fetchProfileByUserId(uid) {
  try {
    let res = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (res.error && /id|column.*does not exist/i.test(res.error.message || '')) {
      res = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    }
    if (res.error) {
      console.warn('fetchProfileByUserId error', res.error);
      return null;
    }
    return res.data;
  } catch (e) {
    console.error('fetchProfileByUserId exception', e);
    return null;
  }
}

async function createOrUpdateProfile(user, extras = {}) {
  // user: supabase auth user object
  const now = new Date().toISOString();
  const payloadUser = {
    id: user.id,
    email: user.email,
    username: extras.username || user.user_metadata?.username || '',
    role: extras.role || 'user',
    department: extras.department || '',
    year: extras.year || '',
    branch: extras.branch || '',
    avatar_url: extras.avatar_url || '',
    created_at: now,
    updated_at: now
  };
  let res = await supabase
    .from('profiles')
    .upsert(payloadUser, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .maybeSingle();

  if (res.error && /id|column.*does not exist/i.test(res.error.message || '')) {
    const payloadId = {
      id: user.id,
      email: user.email,
      username: extras.username || user.user_metadata?.username || '',
      role: extras.role || 'user',
      department: extras.department || '',
      year: extras.year || '',
      branch: extras.branch || '',
      avatar_url: extras.avatar_url || '',
      created_at: now,
      updated_at: now
    };
    res = await supabase
      .from('profiles')
      .upsert(payloadId, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .maybeSingle();
  }
  if (res.error) throw res.error;
  // .single() returns an object; other callers may return arrays — normalize
  if (Array.isArray(res.data)) return res.data[0] ?? null;
  return res.data ?? null;
}

async function getSession() {
  const { data } = await auth.getSession();
  const session = data?.session ?? null;
  if (!session) return null;
  if (!currentProfile) currentProfile = await fetchProfileByUserId(session.user.id);
  return { session, profile: currentProfile };
}

async function clearSession() { await auth.signOut(); currentProfile = null; }

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
  // Delegated listener is attached at bottom of DOMContentLoaded
  // This function is a no-op; kept for initialization order
}

function applyMode() {

  const heading      = document.getElementById('form-heading');
  const sub          = document.getElementById('form-sub');
  const submitLbl    = document.getElementById('submit-label');
  const modeLink     = document.getElementById('auth-switch');
  const oauthSect    = document.getElementById('oauth-section');
  const usernameF    = document.getElementById('username-field');
  const confirmF     = document.getElementById('confirm-field');
  const picF         = document.getElementById('profile-pic-field');
  const rememberRow  = document.querySelector('.field-row');

  if (isSignupMode) {

    if (heading) heading.textContent = 'Create account';

    if (sub) sub.textContent =
      'Join the Genesis portal today.';

    if (submitLbl) submitLbl.textContent = 'Sign up';

    if (modeLink) {
      modeLink.innerHTML =
        'Already have an account? <a href="#" id="mode-toggle">Sign in</a>';
    }

    if (oauthSect) oauthSect.style.display = 'none';

    if (usernameF) usernameF.style.display = '';

    if (confirmF) confirmF.style.display = '';

    if (picF) picF.style.display = '';

    if (rememberRow) rememberRow.style.display = 'none';

  } else {

    if (heading) heading.textContent = 'Welcome back';

    if (sub) sub.textContent =
      'Sign in to your account to continue.';

    if (submitLbl) submitLbl.textContent = 'Sign in';

    if (modeLink) {
      modeLink.innerHTML =
        'New here? <a href="#" id="mode-toggle">Create an account</a>';
    }

    if (oauthSect) oauthSect.style.display = '';

    if (usernameF) usernameF.style.display = 'none';

    if (confirmF) confirmF.style.display = 'none';

    if (picF) picF.style.display = 'none';

    if (rememberRow) rememberRow.style.display = '';

  }

  updateFormForRole();

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

  // Sign up via Supabase (v2 API)
  try {
    const { data, error } = await auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/login.html',
        data: { username }
      }
    });

    // Handle authentication errors with proper diagnostics
    if (error) {
      // Log the full error object for debugging
      console.error('Signup auth error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        fullError: error
      });

      // Check for specific error types
      if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('Too many')) {
        toast('Too many signup attempts. Please wait a few minutes before trying again.', 'error');
        return;
      }
      if (error.message?.includes('email') || error.message?.includes('Email')) {
        toast('This email is already registered or invalid.', 'error');
        return;
      }
      if (error.message?.includes('password')) {
        toast('Password does not meet requirements. Use at least 6 characters.', 'error');
        return;
      }

      // Catch-all for other auth errors
      toast(error.message || 'Signup failed', 'error');
      return;
    }

    // At this point, auth succeeded. Proceed with profile creation.
    const user = data?.user ?? null;
    const hasSession = data?.session ?? null;

    if (!user) {
      console.error('Signup returned no user object');
      toast('Signup failed: no user created', 'error');
      return;
    }

    // Create profile only after auth is confirmed successful
    let profileCreated = false;
    if (user) {
      try {
        const profile = await createOrUpdateProfile(user, { 
          username, 
          role: currentRole, 
          department: deptEl?.value || '', 
          year: yearEl?.value || '', 
          branch: branchEl?.value || '' 
        });
        currentProfile = profile;
        profileCreated = !!profile;
      } catch (err) {
        console.error('Profile creation failed after successful signup:', {
          error: err?.message || err,
          userId: user.id,
          username: username
        });
        // Continue anyway — profile can be created on first dashboard visit
      }
    }

    // Only show success AFTER auth is confirmed
    toast(`Account created! Welcome, ${username} 🎉`, 'success');
    await new Promise(r => setTimeout(r, 900));

    // Redirect based on session state
    if (hasSession) {
      // Session exists — user is auto-confirmed, go directly to dashboard
      window.location.href = 'dashboard.html';
    } 
    else {
      // No session — email confirmation required
      toast('Please check your email to confirm your account.', 'info');
      await new Promise(r => setTimeout(r, 1200));
      window.location.href = 'login.html';
    }

  } catch (err) {
    // Catch unexpected errors (network, JSON parsing, etc.)
    console.error('Signup unexpected exception:', {
      message: err?.message,
      stack: err?.stack,
      fullError: err
    });
    toast('An unexpected error occurred. Please try again.', 'error');
  }
}

async function handleLogin(email, password, remember) {
  try {
    const { data, error } = await auth.signInWithPassword({ email, password });

    // Handle authentication errors with proper diagnostics
    if (error) {
      console.error('Login auth error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        fullError: error
      });

      // Check for specific error types
      if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('Too many')) {
        toast('Too many login attempts. Please wait a few minutes before trying again.', 'error');
        return;
      }
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid credentials')) {
        toast('Invalid email or password. Please try again.', 'error');
        return;
      }
      if (error.message?.includes('Email not confirmed')) {
        toast('Please confirm your email address before logging in.', 'error');
        return;
      }

      // Catch-all for other auth errors
      toast(error.message || 'Login failed', 'error');
      return;
    }

    // Auth succeeded — now fetch/create profile
    if (!data?.user) {
      console.error('Login returned no user object');
      toast('Login failed: no user data', 'error');
      return;
    }

    const user = data.user;
    
    try {
      const { data: existingProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Profile fetch failed:', fetchErr.message);
      }

      // Create profile only if it doesn't exist
      if (!existingProfile) {
        try {
          const { error: insertErr } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            username: user.user_metadata?.username || '',
            role: currentRole || 'student',
            created_at: new Date().toISOString()
          });
          if (insertErr) {
            console.warn('Profile insert failed:', insertErr.message);
          }
        } catch (insertException) {
          console.warn('Profile insert exception:', insertException.message);
        }
      }

      // Load the profile
      const profile = await fetchProfileByUserId(user.id) || 
                      await createOrUpdateProfile(user, { 
                        username: user.user_metadata?.username || '', 
                        role: currentRole 
                      });
      currentProfile = profile;
    } catch (err) {
      console.warn('Profile load/create failed:', err.message);
      // Don't fail the login — profile can be created on first dashboard visit
    }

    // Only show success after auth AND profile operations complete
    toast(`Welcome back, ${data.user.email}!`, 'success');
    await new Promise(r => setTimeout(r, 700));
    window.location.href = 'dashboard.html';

  } catch (err) {
    // Catch unexpected errors (network, JSON parsing, etc.)
    console.error('Login unexpected exception:', {
      message: err?.message,
      stack: err?.stack,
      fullError: err
    });
    toast('An unexpected error occurred. Please try again.', 'error');
  }
}

/* ─── OAuth placeholders (Google / GitHub) ───────────────────────── */
function initOAuth() {
  document.getElementById('google-btn')?.addEventListener('click', async () => {
    const { error } = await auth.signInWithOAuth({ provider: 'google' });
    if (error) toast(error.message || 'Google sign-in failed', 'error');
  });
  document.getElementById('github-btn')?.addEventListener('click', async () => {
    const { error } = await auth.signInWithOAuth({ provider: 'github' });
    if (error) toast(error.message || 'GitHub sign-in failed', 'error');
  });
}

/* ─── Forgot password ────────────────────────────────────────────── */
function initForgotPassword() {
  document.getElementById('forgot-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email')?.value.trim();
    if (!email) { toast('Enter your email first, then click Forgot password.', 'info'); return; }
    const { error } = await auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login.html' });
    if (error) toast(error.message || 'Reset failed', 'error');
    else toast(`A reset link has been sent to ${email}.`, 'info');
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
async function checkAlreadyLoggedIn() {
  try {
    const s = await getSession();
    if (s && s.session) {
      window.location.href = 'dashboard.html';
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

/* ─── Boot ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  (async () => {
    try {
      const logged = await checkAlreadyLoggedIn();
      // If not logged in, continue initializing the page
      if (!logged) {
        initTheme();
        initRoleTabs();
        injectExtraFields();
        initModeToggle();
        initPasswordToggle();
        initForm();
        initOAuth();
        initForgotPassword();
        initRipple();
      }
    } catch (e) {
      console.error('portal boot error', e);
      // ensure UI is not blocked
    } finally {
      try { dismissLoader(); } catch (e) { /* ignore */ }
    }
  })();

  // Delegated toggle for the auth switch — works even when innerHTML is replaced
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('#mode-toggle');
    if (!a) return;
    ev.preventDefault();
    isSignupMode = !isSignupMode;
    applyMode();
  });
});

// Redirect to dashboard on auth state changes (useful for OAuth redirects)
auth.onAuthStateChange((event, session) => {
  try {
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      // ensure profile exists then redirect
      (async () => {
        try {
          const uid = session?.user?.id;
          if (uid) {
            const p = await fetchProfileByUserId(uid);
            if (!p) {
              await createOrUpdateProfile(session.user, { username: session.user.user_metadata?.username || '', role: 'user' });
            }
          }
        } catch (e) { /* ignore */ }
        window.location.href = 'dashboard.html';
      })();
    }
  } catch (e) { /* ignore */ }
});
export { getSession, createOrUpdateProfile, fetchProfileByUserId };