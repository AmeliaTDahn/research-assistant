'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from './loading-spinner';
import ReactMarkdown from 'react-markdown';
import { findResearchQuery, storeResearchQuery, findReadingLevel, storeReadingLevel } from '@/lib/research-storage';
import { ChatInterface } from './ChatInterface';

interface ResearchProgress {
  currentDepth: number;
  totalDepth: number;
  currentBreadth: number;
  totalBreadth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
}

interface ResearchResult {
  title: string;
  content: string;
  sources: { url: string; title?: string; content?: string; snippet?: string; }[];
  suggestedTopics?: string[];
}

type ReadingLevel = 'advanced' | 'intermediate' | 'beginner';

interface QuestionModalProps {
  question: string;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}

function QuestionModal({ question, onAnswer, onSkip }: QuestionModalProps) {
  const [answer, setAnswer] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <h3 className="text-lg font-semibold mb-4">Follow-up Question</h3>
        <p className="mb-4">{question}</p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          rows={3}
          placeholder="Type your answer here..."
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onSkip()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Skip
          </button>
          <button
            onClick={() => onAnswer(answer)}
            disabled={!answer.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeepSearchComponent() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('advanced');
  const [isAdjustingLevel, setIsAdjustingLevel] = useState(false);
  const [adjustedContent, setAdjustedContent] = useState<string | null>(null);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

  // Clean content by removing code artifacts and object notations
  const cleanContent = (content: string) => {
    return content
      // Remove [object Object] and similar patterns
      .replace(/,?\s*\[object Object\]/g, '')
      // Remove extra commas that might be left
      .replace(/,\s*,/g, ',')
      .replace(/,\s*\./g, '.')
      .replace(/\s*,\s*$/g, '')
      // Fix any double spaces
      .replace(/\s+/g, ' ')
      // Fix spacing around punctuation
      .replace(/\s+\./g, '.')
      .replace(/\s+,/g, ',')
      .trim();
  };

  // Auto-scroll thoughts to bottom
  useEffect(() => {
    if (thoughtsEndRef.current) {
      thoughtsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughts]);

  const handleAnswer = async (question: string, answer: string) => {
    try {
      await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      });
    } catch (error) {
      console.error('Failed to send answer:', error);
    }
  };

  const formatInitialContent = async (content: string) => {
    try {
      const response = await fetch('/api/adjust-reading-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          targetLevel: 'advanced',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to format content');
      }

      return data.content;
    } catch (error) {
      console.error('Error formatting content:', error);
      return content; // Return original content if formatting fails
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    setThoughts([]);
    setCurrentQueryId(null);
    setAdjustedContent(null);

    // First, check if we already have this query stored
    const existingQuery = await findResearchQuery(query.trim());
    if (existingQuery) {
      setResult({
        title: '',
        content: existingQuery.content,
        sources: existingQuery.sources,
        suggestedTopics: existingQuery.suggested_topics
      });
      setCurrentQueryId(existingQuery.id);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/deep-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const [eventLine, dataLine] = line.split('\n');
            const event = eventLine.replace('event: ', '');
            const data = JSON.parse(dataLine.replace('data: ', ''));

            console.log('Received event:', event, 'with data:', data);

            switch (event) {
              case 'progress':
                setProgress(data);
                break;
              case 'question':
                setCurrentQuestion(data.question);
                break;
              case 'thought':
                setThoughts(prev => [...prev, data.thought]);
                break;
              case 'result':
                console.log('Setting result:', data.results);
                const formattedContent = await formatInitialContent(cleanContent(data.results.content));
                const cleanedResult = {
                  ...data.results,
                  content: formattedContent
                };
                
                // Store the query result
                const storedQuery = await storeResearchQuery(
                  query.trim(),
                  cleanedResult.content,
                  cleanedResult.sources,
                  cleanedResult.suggestedTopics
                );
                
                if (storedQuery) {
                  setCurrentQueryId(storedQuery.id);
                  // Store the initial content as advanced reading level
                  await storeReadingLevel(
                    storedQuery.id,
                    'advanced',
                    cleanedResult.content
                  );
                }
                
                setResult(cleanedResult);
                setIsLoading(false);
                break;
              case 'error':
                throw new Error(data.message);
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError, 'Line:', line);
          }
        }
      }
    } catch (err) {
      console.error('Research error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An unexpected error occurred while processing your request'
      );
      setIsLoading(false);
    }
  };

  // Clean text content for ReactMarkdown
  const processMarkdownContent = (content: string) => {
    const lines = content.split('\n');
    return lines
      .map(line => cleanContent(line))
      .filter(line => line.trim() !== '')
      .join('\n');
  };

  const adjustReadingLevel = async (level: ReadingLevel) => {
    if (!result || !currentQueryId) return;
    
    setIsAdjustingLevel(true);
    setError(null);

    try {
      // First, check if we already have this reading level stored
      const existingLevel = await findReadingLevel(currentQueryId, level);
      if (existingLevel) {
        setAdjustedContent(existingLevel.content);
        setReadingLevel(level);
        setIsAdjustingLevel(false);
        return;
      }

      const response = await fetch('/api/adjust-reading-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: result.content,
          targetLevel: level,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust reading level');
      }

      if (data.content) {
        // Store the adjusted content
        await storeReadingLevel(currentQueryId, level, data.content);
        
        setAdjustedContent(data.content);
        setReadingLevel(level);
      } else {
        throw new Error('No content received from server');
      }
    } catch (error) {
      console.error('Error adjusting reading level:', error);
      setError(error instanceof Error ? error.message : 'Failed to adjust reading level');
    } finally {
      setIsAdjustingLevel(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to research?
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your research query..."
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Researching...' : 'Start Research'}
        </button>
      </form>

      {currentQuestion && (
        <QuestionModal
          question={currentQuestion}
          onAnswer={(answer) => {
            handleAnswer(currentQuestion, answer);
            setCurrentQuestion(null);
          }}
          onSkip={() => {
            handleAnswer(currentQuestion, 'skip');
            setCurrentQuestion(null);
          }}
        />
      )}

      {isLoading && (
        <div className="text-center">
          <LoadingSpinner />
          {progress && (
            <div className="mt-4 space-y-2">
              <div className="text-sm text-gray-600">
                Depth: {progress.currentDepth}/{progress.totalDepth}
              </div>
              <div className="text-sm text-gray-600">
                Breadth: {progress.currentBreadth}/{progress.totalBreadth}
              </div>
              <div className="text-sm text-gray-600">
                Queries: {progress.completedQueries}/{progress.totalQueries}
              </div>
              {progress.currentQuery && (
                <div className="text-sm text-gray-600">
                  Current Query: {progress.currentQuery}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {thoughts.length > 0 && (
        <div className="bg-white rounded-lg p-6 max-h-[400px] overflow-y-auto shadow-lg border border-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Research Assistant's Thought Process</h3>
          </div>
          <div className="space-y-2">
            {thoughts.map((thought, index) => {
              // Determine the type of thought for styling
              const isProgress = thought.includes('Progress:') || thought.includes('%');
              const isQuestion = thought.includes('?');
              const isAction = thought.includes('Starting') || thought.includes('Generating') || thought.includes('Processing');
              const isResult = thought.includes('Found') || thought.includes('Created') || thought.includes('Complete');

              return (
                <div 
                  key={index} 
                  className={`flex items-start gap-2 p-3 rounded-md border ${
                    isProgress ? 'border-blue-100 bg-blue-50/30' :
                    isQuestion ? 'border-indigo-100 bg-indigo-50/30' :
                    isAction ? 'border-purple-100 bg-purple-50/30' :
                    isResult ? 'border-green-100 bg-green-50/30' :
                    'border-gray-100 bg-gray-50/30'
                  }`}
                >
                  {/* Icon based on thought type */}
                  {isProgress ? (
                    <svg className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : isQuestion ? (
                    <svg className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : isAction ? (
                    <svg className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : isResult ? (
                    <svg className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div className={`text-sm ${
                    isProgress ? 'text-blue-900' :
                    isQuestion ? 'text-indigo-900' :
                    isAction ? 'text-purple-900' :
                    isResult ? 'text-green-900' :
                    'text-gray-700'
                  }`}>
                    {thought}
                  </div>
                </div>
              );
            })}
            <div ref={thoughtsEndRef} />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-8">
          {/* Reading Level Selector */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-medium text-gray-900">Reading Level</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => adjustReadingLevel('beginner')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    readingLevel === 'beginner'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  disabled={isAdjustingLevel}
                >
                  Beginner
                </button>
                <button
                  onClick={() => adjustReadingLevel('intermediate')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    readingLevel === 'intermediate'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  disabled={isAdjustingLevel}
                >
                  Intermediate
                </button>
                <button
                  onClick={() => adjustReadingLevel('advanced')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    readingLevel === 'advanced'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  disabled={isAdjustingLevel}
                >
                  Advanced
                </button>
              </div>
            </div>
            {isAdjustingLevel && (
              <div className="mt-2 flex items-center justify-center text-sm text-gray-600">
                <LoadingSpinner />
                <span className="ml-2">Adjusting reading level...</span>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="prose prose-indigo max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({children}) => (
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">{children}</h1>
                  ),
                  h2: ({children}) => (
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mt-8 mb-4 border-b border-gray-100 pb-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {children}
                    </h2>
                  ),
                  h3: ({children}) => (
                    <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">{children}</h3>
                  ),
                  p: ({children}) => (
                    <p className="text-gray-600 leading-relaxed my-4 pl-8">{children}</p>
                  ),
                  ul: ({children}) => (
                    <ul className="space-y-3 my-4 pl-8">{children}</ul>
                  ),
                  li: ({children}) => (
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{children}</span>
                    </li>
                  ),
                  strong: ({children}) => (
                    <strong className="font-semibold text-indigo-700">{children}</strong>
                  ),
                  em: ({children}) => (
                    <em className="text-indigo-600 font-medium not-italic">{children}</em>
                  ),
                }}
              >
                {processMarkdownContent(adjustedContent || result.content)}
              </ReactMarkdown>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="mt-8">
            <ChatInterface 
              researchContent={adjustedContent || result.content} 
              sources={result.sources}
            />
          </div>

          {/* Sources Section */}
          {result.sources.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Sources
              </h2>
              <ul className="grid gap-3">
                {result.sources.map((source, index) => (
                  <li key={index} className="bg-white p-4 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors duration-200">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 mt-1 flex-shrink-0 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <div className="text-indigo-600 group-hover:text-indigo-700 font-medium transition-colors duration-200 break-words line-clamp-2">
                            {source.title || source.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </div>
                          {source.snippet && (
                            <p className="text-sm text-gray-500 mt-1 break-words line-clamp-2">{source.snippet}</p>
                          )}
                          <span className="text-xs text-gray-400 mt-1 block break-all">
                            {source.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </span>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Topics Section */}
          {result.suggestedTopics && result.suggestedTopics.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Want to dive deeper?
              </h2>
              <div className="grid gap-3 mt-4">
                {result.suggestedTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(topic);
                      handleSubmit(new Event('submit') as any);
                    }}
                    className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all duration-200 flex items-center group"
                  >
                    <span className="text-gray-900 flex-grow">{topic}</span>
                    <svg 
                      className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 