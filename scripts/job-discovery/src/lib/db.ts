import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../config.js';

await loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});
