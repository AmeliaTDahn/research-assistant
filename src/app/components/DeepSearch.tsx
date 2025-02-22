'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from './loading-spinner';
import ReactMarkdown from 'react-markdown';

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
  sources: string[];
}

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

// First, add a new interface for thoughts with timestamps
interface ThoughtWithTimestamp {
  text: string;
  timestamp: Date;
}

export function DeepSearchComponent() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [thoughts, setThoughts] = useState<ThoughtWithTimestamp[]>([]);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    setThoughts([]);

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

          const [eventLine, dataLine] = line.split('\n');
          const event = eventLine.replace('event: ', '');
          const data = JSON.parse(dataLine.replace('data: ', ''));

          switch (event) {
            case 'progress':
              setProgress(data);
              break;
            case 'question':
              setCurrentQuestion(data.question);
              break;
            case 'thought':
              setThoughts(prev => [...prev, { text: data.thought, timestamp: new Date() }]);
              break;
            case 'result':
              setResult(data.results);
              setIsLoading(false);
              break;
            case 'error':
              throw new Error(data.message);
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

  // Function to format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
          <div className="space-y-3">
            {thoughts.map((thought, index) => {
              // Determine the type of thought for styling
              const isProgress = thought.text.includes('Progress:') || thought.text.includes('%');
              const isQuestion = thought.text.includes('?');
              const isAction = thought.text.includes('Starting') || thought.text.includes('Generating') || thought.text.includes('Processing');
              const isResult = thought.text.includes('Found') || thought.text.includes('Created') || thought.text.includes('Complete');

              return (
                <div 
                  key={index} 
                  className={`flex items-start gap-2 p-3 rounded-md border ${
                    isProgress ? 'border-indigo-100 bg-indigo-50/30' :
                    isQuestion ? 'border-indigo-100 bg-indigo-50/30' :
                    isAction ? 'border-indigo-100 bg-indigo-50/30' :
                    isResult ? 'border-indigo-100 bg-indigo-50/30' :
                    'border-gray-100 bg-gray-50/30'
                  }`}
                >
                  <div className="flex-shrink-0 text-xs text-gray-400 mt-1 w-16">
                    {formatTimestamp(thought.timestamp)}
                  </div>
                  {/* Icon based on thought type */}
                  {isProgress ? (
                    <svg className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : isQuestion ? (
                    <svg className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : isAction ? (
                    <svg className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : isResult ? (
                    <svg className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div className={`text-sm flex-grow ${
                    isProgress || isQuestion || isAction || isResult ? 'text-gray-700' : 'text-gray-600'
                  }`}>
                    {thought.text}
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
        <div className="space-y-6">
          <div className="prose prose-lg prose-indigo max-w-none">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-gray-900 mb-6" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-medium text-gray-700 mt-6 mb-3" {...props} />,
                ul: ({node, ...props}) => <ul className="space-y-2" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-600" {...props} />,
                hr: ({node, ...props}) => <hr className="my-6 border-gray-200" {...props} />,
                p: ({node, ...props}) => <p className="text-gray-600 mb-4" {...props} />
              }}
            >
              {result.content}
            </ReactMarkdown>
          </div>
          {result.sources.length > 0 && (
            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sources</h3>
              <ul className="space-y-2">
                {result.sources.map((source, index) => (
                  <li key={index} className="text-indigo-600 hover:text-indigo-800">
                    <a href={source} target="_blank" rel="noopener noreferrer" className="break-all">
                      {source}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 