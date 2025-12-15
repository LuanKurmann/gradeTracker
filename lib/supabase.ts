import { createClient } from '@supabase/supabase-js';

// PLACEHOLDERS: Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://ozbtcqknamlutsyhbcyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YnRjcWtuYW1sdXRzeWhiY3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzE0NDUsImV4cCI6MjA3OTUwNzQ0NX0.OFNHSrCNSyoJUU1Ej43jEFGY-Jb41Xg_64YL9sSb5I4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
