'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { format } from 'date-fns';

interface Query {
  id: string;
  created_at: string;
  query: string;
  content: string;
  reading_level?: string;
}

export function QueriesList({ userId }: { userId: string }) {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchQueries() {
      try {
        const { data, error } = await supabase
          .from('research_queries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setQueries(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch queries');
      } finally {
        setLoading(false);
      }
    }

    fetchQueries();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
        Error loading queries: {error}
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Queries Yet</h3>
        <p className="text-gray-600 mb-4">Start your research to see your queries here.</p>
        <Link 
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Start New Research
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {queries.map((query) => (
        <div key={query.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{query.query}</h3>
              <span className="text-sm text-gray-500">
                {format(new Date(query.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            
            <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3 mb-4">
              {query.content}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {query.reading_level && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {query.reading_level}
                  </span>
                )}
              </div>
              
              <Link
                href={`/?query=${encodeURIComponent(query.query)}`}
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                View Details
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 