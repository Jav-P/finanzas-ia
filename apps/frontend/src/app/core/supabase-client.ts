import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

// Cliente unico: Angular lo usa directo para signUp/signInWithPassword
// (Supabase Auth), no pasa por nuestro backend.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
