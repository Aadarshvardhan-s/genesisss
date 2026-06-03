import supabase, { supabase as sb, auth, storage } from './supabase-config.js';

// Lightweight auth helpers wrapping Supabase
export const authHelpers = {
  async signUp(email, password, metadata = {}) {
    const { data, error } = await auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin + '/login.html'
      }
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: error.message
      };
    }

    return {
      user: data?.user ?? null,
      session: data?.session ?? null,
      error: null
    };
  },
  async signIn(email, password) {
    const { data, error } = await auth.signInWithPassword({ email, password });
    if (error) return { user: null, session: null, error: error.message };
    return { user: data.user, session: data.session, error: null };
  },
  async signOut() {
    const { error } = await auth.signOut();
    return { error: error ? error.message : null };
  },
  async getSession() {
    const { data, error } = await auth.getSession();
    if (error) return { session: null, error: error.message };
    return { session: data.session, error: null };
  },
  onAuthStateChange(cb) { return auth.onAuthStateChange((event, d) => cb(event, d.session)); },
  async resetPassword(email) {
    const { error } = await auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login.html' });
    return { error: error ? error.message : null };
  },
  async updatePassword(newPassword) {
    const { data, error } = await auth.updateUser({ password: newPassword });
    return { user: data?.user ?? null, error: error ? error.message : null };
  },
  async signInWithGoogle() { const { error } = await auth.signInWithOAuth({ provider: 'google' }); return { error: error ? error.message : null }; },
  async signInWithGitHub() { const { error } = await auth.signInWithOAuth({ provider: 'github' }); return { error: error ? error.message : null }; },
};