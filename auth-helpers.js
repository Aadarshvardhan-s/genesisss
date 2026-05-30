import { supabase, auth } from './supabase-config.js';

// Auth Helper Functions
export const authHelpers = {
  // Sign up with email and password
  async signUp(email, password) {
    try {
      const { data, error } = await auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      return { user: null, session: null, error: error.message };
    }
  },

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      return { user: null, session: null, error: error.message };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Get current user session
  async getSession() {
    try {
      const { data, error } = await auth.getSession();
      if (error) throw error;
      return { session: data.session, error: null };
    } catch (error) {
      return { session: null, error: error.message };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return auth.onAuthStateChange((event, session) => {
      callback({ event, session });
    });
  },

  // Reset password
  async resetPassword(email) {
    try {
      const { error } = await auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Update password
  async updatePassword(newPassword) {
    try {
      const { data, error } = await auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const { data, error } = await auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: new URL('./auth-callback', window.location.href).href,
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Sign in with GitHub
  async signInWithGitHub() {
    try {
      const { data, error } = await auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: new URL('./auth-callback', window.location.href).href,
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },
};
