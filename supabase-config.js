// =========================================================
// Hamsa Pharmacy - Supabase Configuration
// =========================================================

const SUPABASE_URL = 'https://bkiloumtncnajgnmwqnn.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_4NH81Y_Y4Enff_Lq9SgfXw_RfifDewy';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log('✅ Hamsa Supabase initialized');