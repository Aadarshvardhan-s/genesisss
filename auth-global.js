// auth-global.js — exposes a lightweight global Supabase-backed auth shim
import supabase, { auth, storage } from './supabase-config.js';

window.GICAuth = window.GICAuth || {};
(function () {
  const G = window.GICAuth;
  G._cached = { session: null, profile: null };

  G.ready = (async () => {
    try {
      // Recover current session
      const {
        data: { session },
        error
      } = await auth.getSession();

      if (error) {
        console.error('Session recovery failed', error);
      }
      G._cached.session = session;

      if (session?.user) {
        try {
          let res = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (res.error) {
            if (/id|column.*does not exist/i.test(res.error.message || '')) {
              // Retry once if column doesn't exist (shouldn't happen)
              res = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            }
            if (res.error) {
              console.warn('auth-global: profile fetch error', res.error.message);
              G._cached.profile = null;
            } else {
              G._cached.profile = res.data ?? null;
            }
          } else {
            G._cached.profile = res.data ?? null;
          }
        } catch (e) {
          console.error('auth-global: profile fetch exception', e);
          G._cached.profile = null;
        }
      }

      // Clean URL fragments that may contain tokens
      try {
        const url = new URL(window.location.href);
        if (url.hash && (url.hash.includes('access_token') || url.hash.includes('refresh_token') || url.searchParams.has('provider'))) {
          url.hash = '';
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }
      } catch (e) { /* ignore */ }
    } catch (e) { 
      console.error('auth-global initialization failed', e);
    }
    return G._cached;
  })();

  G.getSession = async () => {
    await G.ready;
    return { session: G._cached.session, profile: G._cached.profile };
  };

  G.getSessionSync = () => G._cached;

  G.signOut = async () => {
    try { await auth.signOut(); } catch (e) { /* ignore */ }
    G._cached.session = null;
    G._cached.profile = null;
  };

  G.onAuthStateChange = (cb) => {
    return auth.onAuthStateChange(async (event, data) => {
      G._cached.session = data?.session ?? null;
      if (G._cached.session?.user) {
        try {
          // Fetch profile by id
          let res = await supabase.from('profiles').select('*').eq('id', G._cached.session.user.id).maybeSingle();
          if (res.error && /id|column.*does not exist/i.test(res.error.message || '')) {
            res = await supabase.from('profiles').select('*').eq('id', G._cached.session.user.id).maybeSingle();
          }
          if (res.error) {
            console.warn('auth-global.onAuthStateChange: profile fetch error', res.error);
            G._cached.profile = null;
          } else {
            G._cached.profile = res.data ?? null;
          }
        } catch (e) {
          console.error('auth-global.onAuthStateChange exception', e);
          G._cached.profile = null;
        }
      } else {
        G._cached.profile = null;
      }
      try { cb(event, G._cached); } catch (e) { console.warn(e); }
    });
  };

  G.ensureProfile = async (user, extras = {}) => {
    if (!user) return null;
    const now = new Date().toISOString();
          // Use id as primary key column.
    const payloadUser = {
      id: user.id,
      email: user.email || null,
      username: extras.username || user.user_metadata?.username || '',
      full_name: extras.full_name || user.user_metadata?.full_name || '',
      avatar_url: extras.avatar_url || '',
      created_at: now,
      updated_at: now
    };
    try {
      let r = await supabase.from('profiles').upsert(payloadUser, { onConflict: 'id', returning: 'representation' });
      if (r.error && /id|column.*does not exist/i.test(r.error.message || '')) {
        // fallback: still try id-based upsert
        const payloadId = {
          id: user.id,
          email: user.email || null,
          username: extras.username || user.user_metadata?.username || '',
          full_name: extras.full_name || user.user_metadata?.full_name || '',
          avatar_url: extras.avatar_url || '',
          created_at: now,
          updated_at: now
        };
        r = await supabase.from('profiles').upsert(payloadId, { onConflict: 'id', returning: 'representation' });
      }
      if (!r.error) G._cached.profile = r.data?.[0] ?? G._cached.profile;
      return G._cached.profile;
    } catch (e) {
      console.error('auth-global.ensureProfile exception', e);
      return G._cached.profile;
    }
  };

  // Update profile fields by user uid (uses `id` column)
  G.updateProfileFields = async (fields, uid) => {
    if (!uid) return null;
    try {
      let r = await supabase.from('profiles').update(fields).eq('id', uid);
      if (r.error && /id|column.*does not exist/i.test(r.error.message || '')) {
        r = await supabase.from('profiles').update(fields).eq('id', uid);
      }
      if (r.error) throw r.error;
      // refresh cached profile
      try { await G.ensureProfile({ id: uid, email: fields.email || undefined }, fields); } catch (e) { /* ignore */ }
      return r;
    } catch (e) {
      console.error('auth-global.updateProfileFields error', e);
      throw e;
    }
  };

  G.uploadAvatar = async (file, path) => {
    if (!file) return null;
    const filename = path || `avatars/${G._cached.session?.user?.id || 'anon'}_${Date.now()}`;
    const { data, error } = await storage.from('avatars').upload(filename, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;
    const { data: urlData } = storage.from('avatars').getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
  };
})();

export default window.GICAuth;
