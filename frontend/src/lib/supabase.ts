import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bglyejykwwaflbmyothu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_BXc1TEBzYLv0RPSM5UteNw_a-EyNs4M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
