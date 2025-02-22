'use client';

import React, { useEffect } from 'react';
import { DeepSearchComponent } from './components/DeepSearch';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const FEATURES = [
  { id: 'precise', icon: '🎯', text: 'Precise', description: 'Accurate and detailed research results' },
  { id: 'realtime', icon: '🔄', text: 'Real-time', description: 'Watch the research process unfold live' },
  { id: 'ai', icon: '🤖', text: 'AI-Powered', description: 'Advanced AI technology for deep insights' },
];

function DiagnosticLogger({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('Component mounted');
    
    // Override console.error to add more context
    const originalError = console.error;
    console.error = (...args) => {
      originalError('Diagnostic Error Context:', ...args);
    };

    // Add window error handler
    const handleError = (event: ErrorEvent) => {
      console.error('Window Error:', event.error);
    };

    // Add unhandled rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.log('Component unmounted');
    };
  }, []);

  return <>{children}</>;
}

export default function Home() {
  return (
    <ErrorBoundary>
      <DiagnosticLogger>
        <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Research Assistant
              </h1>
              <p className="text-lg md:text-xl text-indigo-700/80">
                Discover insights across multiple sources with AI-powered research
              </p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm shadow-indigo-100 border border-indigo-50 p-6 mb-8">
              <ErrorBoundary>
                <DeepSearchComponent />
              </ErrorBoundary>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-12">
              {FEATURES.map((feature) => (
                <div key={feature.id} 
                     className="bg-white rounded-xl p-6 text-center border border-indigo-50 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-indigo-700 mb-1">
                    {feature.text}
                  </h3>
                  <p className="text-sm text-indigo-600/70">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <footer className="text-center text-sm text-indigo-600/50">
              © {new Date().getFullYear()} Research Aggregator. All rights reserved.
            </footer>
          </div>
        </div>
      </DiagnosticLogger>
    </ErrorBoundary>
  );
} 