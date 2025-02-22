'use client';

import { useState, useEffect } from 'react';
import { ChatResponse } from './ChatResponse';

interface Response {
    id: string;
    modelName: string;
    response: string;
    detailedAnswer?: string | null;
    thoughtProcess?: string | null;
    sources?: string | null;
}

interface Source {
  number: string;
  title: string;
  url: string | null;
  confidence: 'High' | 'Medium';
}

// Add new interface for validated source
interface ValidatedSource extends Source {
  isValid: boolean;
}

// Update URL validation function
async function validateUrl(url: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const response = await fetch('/api/validate-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      console.warn(`URL validation failed for ${url}: ${response.statusText}`);
      return { isValid: false, reason: response.statusText };
    }

    const data = await response.json();
    return {
      isValid: data.isValid,
      reason: data.reason
    };
  } catch (error) {
    console.error('URL validation error:', error);
    return { isValid: false, reason: 'Network error' };
  }
}

// Helper function to analyze source confidence
function analyzeSourceConfidence(source: string | undefined): 'High' | 'Medium' {
  if (!source) return 'Medium';
  
  const sourceText = source.toLowerCase();
  const urlMatch = source.match(/https?:\/\/[^\s]+/);
  let confidence: 'High' | 'Medium' = 'Medium';

  // Check URL-based confidence
  if (urlMatch) {
    const domain = urlMatch[0].toLowerCase();
    
    // Academic and Research Institutions
    if (domain.includes('.edu') || 
        domain.includes('scholar.google') ||
        domain.includes('academia.edu') ||
        domain.includes('researchgate.net') ||
        domain.includes('arxiv.org') ||
        domain.includes('jstor.org') ||
        domain.includes('ieee.org') ||
        domain.includes('acm.org')) {
      confidence = 'High';
    }
    
    // Scientific Publishers and Journals
    else if (domain.includes('nature.com') ||
             domain.includes('science.org') ||
             domain.includes('sciencedirect.com') ||
             domain.includes('springer.com') ||
             domain.includes('wiley.com') ||
             domain.includes('frontiersin.org') ||
             domain.includes('academic.oup.com') ||
             domain.includes('cell.com') ||
             domain.includes('thelancet.com') ||
             domain.includes('bmj.com') ||
             domain.includes('nejm.org')) {
      confidence = 'High';
    }
    
    // Government and International Organizations
    else if (domain.includes('.gov') || 
             domain.includes('who.int') ||
             domain.includes('europa.eu') ||
             domain.includes('un.org') ||
             domain.includes('nih.gov') ||
             domain.includes('cdc.gov') ||
             domain.includes('nasa.gov') ||
             domain.includes('nsf.gov')) {
      confidence = 'High';
    }
    
    // Medical and Health Organizations
    else if (domain.includes('mayoclinic.org') ||
             domain.includes('hopkinsmedicine.org') ||
             domain.includes('clevelandclinic.org') ||
             domain.includes('medlineplus.gov') ||
             domain.includes('pubmed.ncbi.nlm.nih.gov')) {
      confidence = 'High';
    }
  }

  // Content-based confidence boosters
  const highConfidenceIndicators = [
    'journal', 'study', 'research', 'clinical trial',
    'meta-analysis', 'systematic review', 'peer-reviewed',
    'publication', 'proceedings', 'conference',
    'doi:', 'volume', 'issue', 'pmid:', 'isbn:',
    'randomized controlled trial', 'cohort study'
  ];

  const mediumConfidenceIndicators = [
    'survey', 'report', 'analysis', 'review',
    'guidelines', 'recommendation', 'expert opinion'
  ];

  // Count matches for each confidence level
  const highMatches = highConfidenceIndicators.filter(indicator => 
    sourceText.includes(indicator)).length;
  const mediumMatches = mediumConfidenceIndicators.filter(indicator => 
    sourceText.includes(indicator)).length;

  // Adjust confidence based on content indicators
  if (highMatches > 0) {
    confidence = 'High';
  }

  return confidence;
}

function getConfidenceColor(confidence: 'High' | 'Medium'): string {
  switch (confidence) {
    case 'High':
      return 'bg-green-100';
    case 'Medium':
      return 'bg-yellow-100';
  }
}

const validateSource = (content: string): ValidatedSource | null => {
  if (typeof content !== 'string') return null;
  
  const match = content.match(/(\d+)\.\s*(.*?)(?:\s*-\s*(https?:\/\/[^\s]+))?$/);
  if (!match) return null;

  const number = match[1] || '0';
  const title = match[2] || '';
  const url = match[3] || null;
  const confidence = analyzeSourceConfidence(title + (url || ''));

  return {
    number,
    title,
    url,
    confidence,
    isValid: true
  };
};

const renderSourceCitation = (sources: ValidatedSource[], content: string) => {
  if (!content || !sources.length) return null;
  
  const sourcesMap = new Map(sources.map(s => [s.number, s]));
  
  return (
    <span className="source-citation">
      {content.split(/(\[Source \d+\])/).map((part, index) => {
        if (part.match(/\[Source \d+\]/)) {
          const citationMatch = part.match(/\[Source (\d+)\]/);
          if (citationMatch && citationMatch[1]) {
            const sourceNumber = citationMatch[1];
            const source = sourcesMap.get(sourceNumber);
            if (source) {
              const confidenceClass = getConfidenceColor(source.confidence);
              return (
                <span key={index} className="inline-block">
                  <a
                    href={source.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 hover:text-blue-800 cursor-pointer citation-link ${confidenceClass}`}
                    data-source-number={sourceNumber}
                    onClick={(e) => {
                      if (!source.url) {
                        e.preventDefault();
                        // Handle missing URL case
                      }
                    }}
                  >
                    [Source {sourceNumber}]
                  </a>
                  <div
                    className="citation-tooltip invisible opacity-0 absolute z-10 w-72 p-2 text-sm bg-gray-800 text-white rounded shadow-lg transition-opacity duration-200"
                    data-tooltip-for={sourceNumber}
                  >
                    {source.title}
                    {source.url && (
                      <div className="text-xs text-gray-300 mt-1">
                        {source.url}
                      </div>
                    )}
                  </div>
                </span>
              );
            }
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

interface ChatDisplayProps {
  responses: Response[];
}

export function ChatDisplay({ responses }: ChatDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>(responses[0]?.modelName || '');

  return (
    <div>
      {/* Model Tabs */}
      <div className="flex space-x-2 mb-4 border-b border-indigo-100">
        {responses.map((response) => (
          <button
            key={response.id}
            onClick={() => setActiveTab(response.modelName)}
            className={`px-4 py-2 rounded-t-lg transition-colors
                      ${activeTab === response.modelName
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-indigo-500 hover:bg-indigo-50'}`}
          >
            {response.modelName}
          </button>
        ))}
      </div>

      {/* Active Response */}
      <div className="prose max-w-none p-4 bg-white/50 rounded-lg">
        {activeTab && (
          <ChatResponse 
            response={responses.find(r => r.modelName === activeTab)!} 
          />
        )}
      </div>
    </div>
  );
} 