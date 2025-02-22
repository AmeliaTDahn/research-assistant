'use client';

import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/50 shadow-lg">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link 
            href="/" 
            className="text-2xl font-bold gradient-text hover:scale-105 transition-transform"
          >
            ✨ Research Aggregator
          </Link>
          <div className="space-x-4">
            <Link
              href="/"
              className="px-4 py-2 rounded-full glass-card hover:bg-white/80 transition-all duration-200"
            >
              🔍 New Query
            </Link>
            <Link
              href="/queries"
              className="px-4 py-2 rounded-full glass-card hover:bg-white/80 transition-all duration-200"
            >
              📚 My Queries
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
} 