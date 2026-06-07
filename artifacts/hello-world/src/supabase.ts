import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export async function createUserIfNotExists(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (!data) {
    await supabase.from('users').insert({
      id: userId,
      tier: 'free',
      daily_questions_used: 0,
      pdfs_uploaded_today: 0,
      last_reset_date: new Date().toISOString().split('T')[0]
    });
  }
}