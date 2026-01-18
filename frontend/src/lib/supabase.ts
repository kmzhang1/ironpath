import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Persist session in localStorage
    autoRefreshToken: true, // Auto refresh token before expiry
    detectSessionInUrl: true, // Detect OAuth callback in URL
    flowType: 'implicit', // Use implicit flow for simpler OAuth
    storage: window.localStorage, // Use localStorage for persistence
    storageKey: 'ironpath-auth', // Custom storage key
  },
  global: {
    headers: {
      'X-Client-Info': 'ironpath-web',
    },
  },
});

// Check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
