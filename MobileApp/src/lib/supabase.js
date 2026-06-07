import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Load Supabase credentials from environment variables via Expo Constants
// or fall back to a build-time config. Never hardcode production keys in source.
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
  || process.env.EXPO_PUBLIC_SUPABASE_URL
  || '';

const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey
  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Supabase] Missing credentials. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY '
    + 'in your .env file or app.json extra config.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
