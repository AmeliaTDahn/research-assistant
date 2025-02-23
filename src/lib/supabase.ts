import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our database tables
export interface ResearchQuery {
  id: string;
  query: string;
  content: string;
  created_at: string;
  sources?: any[];
  suggested_topics?: string[];
}

export interface ReadingLevelContent {
  id: string;
  query_id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  created_at: string;
} 