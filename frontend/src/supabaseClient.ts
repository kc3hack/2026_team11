import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    "Supabase未設定: REACT_APP_SUPABASE_URL と REACT_APP_SUPABASE_ANON_KEY を frontend/.env に設定してください。認証機能は無効です。"
  );
}

export { supabase };
