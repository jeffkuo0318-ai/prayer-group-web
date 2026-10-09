import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // 強制儲存 Session 到 localStorage
    autoRefreshToken: true,     // 自動刷新登入憑證
    detectSessionInUrl: true,   // 自動讀取 URL 中的 OAuth Token
  },
});