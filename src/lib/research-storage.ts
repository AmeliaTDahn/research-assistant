import { supabase } from './supabase';
import type { ResearchQuery, ReadingLevelContent } from './supabase';

export async function storeResearchQuery(
  query: string,
  content: string,
  sources: any[],
  suggestedTopics?: string[]
): Promise<ResearchQuery | null> {
  try {
    const { data, error } = await supabase
      .from('research_queries')
      .insert({
        query,
        content,
        sources,
        suggested_topics: suggestedTopics
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing research query:', error);
    return null;
  }
}

export async function findResearchQuery(query: string): Promise<ResearchQuery | null> {
  try {
    const { data, error } = await supabase
      .from('research_queries')
      .select('*')
      .eq('query', query)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    console.error('Error finding research query:', error);
    return null;
  }
}

export async function storeReadingLevel(
  queryId: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  content: string
): Promise<ReadingLevelContent | null> {
  try {
    const { data, error } = await supabase
      .from('reading_levels')
      .insert({
        query_id: queryId,
        level,
        content
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing reading level:', error);
    return null;
  }
}

export async function findReadingLevel(
  queryId: string,
  level: 'beginner' | 'intermediate' | 'advanced'
): Promise<ReadingLevelContent | null> {
  try {
    const { data, error } = await supabase
      .from('reading_levels')
      .select('*')
      .eq('query_id', queryId)
      .eq('level', level)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    console.error('Error finding reading level:', error);
    return null;
  }
} 