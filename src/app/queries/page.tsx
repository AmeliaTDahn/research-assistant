'use client';

import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { ResearchQuery } from '@/lib/supabase';

export default function QueriesPage() {
  const [queries, setQueries] = useState<ResearchQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<ResearchQuery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<ResearchQuery | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchQueries() {
      try {
        const { data, error } = await supabase
          .from('research_queries')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setQueries(data || []);
        setFilteredQueries(data || []);
      } catch (err) {
        console.error('Error fetching queries:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchQueries();
  }, []);

  // Search functionality
  useEffect(() => {
    const filtered = queries.filter(query => {
      const searchLower = searchTerm.toLowerCase();
      return (
        query.query.toLowerCase().includes(searchLower) ||
        query.suggested_topics?.some(topic => 
          topic.toLowerCase().includes(searchLower)
        )
      );
    });
    setFilteredQueries(filtered);
  }, [searchTerm, queries]);

  const handleDeleteClick = (query: ResearchQuery) => {
    setQueryToDelete(query);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!queryToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete associated reading levels first
      await supabase
        .from('reading_levels')
        .delete()
        .eq('query_id', queryToDelete.id);

      // Then delete the query
      const { error } = await supabase
        .from('research_queries')
        .delete()
        .eq('id', queryToDelete.id);

      if (error) throw error;

      // Update local state
      setQueries(prev => prev.filter(q => q.id !== queryToDelete.id));
      setFilteredQueries(prev => prev.filter(q => q.id !== queryToDelete.id));
      setShowDeleteModal(false);
      setQueryToDelete(null);
    } catch (err) {
      console.error('Error deleting query:', err);
      setError('Failed to delete query');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">Error loading queries: {error}</p>
          <Link 
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-blue-50/50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
              My Research Queries
            </h1>
            <p className="text-gray-600 mt-2">Your history of research explorations</p>
          </div>
          <Link 
            href="/"
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Query
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your queries and topics..."
              className="w-full px-4 py-3 pl-12 bg-white rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            />
            <svg 
              className="absolute left-4 top-3.5 w-5 h-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Results Counter */}
        <div className="mb-4 text-sm text-gray-600">
          {searchTerm && (
            <p>
              Found {filteredQueries.length} {filteredQueries.length === 1 ? 'result' : 'results'}
              {searchTerm && ` for "${searchTerm}"`}
            </p>
          )}
        </div>

        <div className="grid gap-6">
          {filteredQueries.map((query) => (
            <div 
              key={query.id} 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {query.query}
                    </h2>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(query.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/?query=${encodeURIComponent(query.query)}&id=${query.id}`}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2"
                    >
                      <span>View Results</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(query)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete query"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {query.suggested_topics && query.suggested_topics.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Related Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {query.suggested_topics.map((topic, index) => (
                        <span
                          key={index}
                          onClick={() => setSearchTerm(topic)}
                          className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-full border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredQueries.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-4">
                {searchTerm ? 'No matching queries found' : 'No research queries yet'}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear search
                </button>
              ) : (
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start your first research query
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Delete Query</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this query? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setQueryToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Query'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 