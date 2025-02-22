'use client';

import React, { useState } from 'react';
import { ThoughtProcessButton } from './ThoughtProcessButton';
import { SourcesButton } from './SourcesButton';

type OpenTab = 'none' | 'thought-process' | 'sources' | 'detailed';

interface Source {
  number: string;
  title: string;
  url: string | null;
}

interface Response {
  id: string;
  modelName: string;
  response: string;
  detailedAnswer?: string | null;
  thoughtProcess?: string | null;
  sources?: string | null;
}

// Helper function to analyze source confidence
function analyzeSourceConfidence(source: string): { confidence: 'High' | 'Medium', reason: string } {
  if (!source) return { confidence: 'Medium', reason: 'No source information provided' };
  
  const sourceText = source.toLowerCase();
  const urlMatch = source.match(/https?:\/\/[^\s]+/);
  let confidence: 'High' | 'Medium' = 'Medium';
  let reasons: string[] = [];

  // Check URL-based confidence
  if (urlMatch) {
    const domain = urlMatch[0].toLowerCase();
    
    // Academic and Research Institutions
    if (domain.includes('.edu')) {
      confidence = 'High';
      reasons.push('Educational institution domain (.edu)');
    }
    if (domain.includes('scholar.google')) {
      confidence = 'High';
      reasons.push('Google Scholar academic search platform');
    }
    if (domain.includes('academia.edu') || domain.includes('researchgate.net')) {
      confidence = 'High';
      reasons.push('Academic research platform');
    }
    if (domain.includes('arxiv.org') || domain.includes('jstor.org')) {
      confidence = 'High';
      reasons.push('Academic paper repository');
    }
    
    // Scientific Publishers and Journals
    if (domain.includes('nature.com') || domain.includes('science.org')) {
      confidence = 'High';
      reasons.push('Premier scientific journal publisher');
    }
    if (domain.includes('sciencedirect.com') || domain.includes('springer.com')) {
      confidence = 'High';
      reasons.push('Major scientific publisher platform');
    }
    if (domain.includes('academic.oup.com') || domain.includes('wiley.com')) {
      confidence = 'High';
      reasons.push('Academic journal publisher');
    }
    if (domain.includes('frontiersin.org') || domain.includes('mdpi.com')) {
      confidence = 'High';
      reasons.push('Open access scientific publisher');
    }
    if (domain.includes('cell.com') || domain.includes('lancet.com')) {
      confidence = 'High';
      reasons.push('Leading medical/scientific journal');
    }
    
    // Government and International Organizations
    if (domain.includes('.gov')) {
      confidence = 'High';
      reasons.push('Government domain (.gov)');
    }
    if (domain.includes('who.int')) {
      confidence = 'High';
      reasons.push('World Health Organization');
    }
    if (domain.includes('nih.gov') || domain.includes('pubmed')) {
      confidence = 'High';
      reasons.push('National Institutes of Health resource');
    }
    if (domain.includes('europa.eu') || domain.includes('un.org')) {
      confidence = 'High';
      reasons.push('International organization');
    }
    if (domain.includes('nsf.gov') || domain.includes('nasa.gov')) {
      confidence = 'High';
      reasons.push('Scientific government agency');
    }

    // Professional and Medical Organizations
    if (domain.includes('mayoclinic.org') || domain.includes('hopkinsmedicine.org')) {
      confidence = 'High';
      reasons.push('Leading medical institution');
    }
    if (domain.includes('ieee.org') || domain.includes('acm.org')) {
      confidence = 'High';
      reasons.push('Professional scientific/technical organization');
    }
    if (domain.includes('aps.org') || domain.includes('acs.org')) {
      confidence = 'High';
      reasons.push('Professional scientific society');
    }

    // Elevated Medium Confidence Sources
    if (domain.includes('webmd.com') || domain.includes('healthline.com')) {
      if (sourceText.includes('medically reviewed') || sourceText.includes('peer-reviewed')) {
        confidence = 'High';
        reasons.push('Medical information with professional review process');
      } else {
        reasons.push('Commercial health information site with medical review process');
      }
    }
    if ((domain.includes('forbes.com') || domain.includes('bloomberg.com')) && 
        (sourceText.includes('research') || sourceText.includes('study') || sourceText.includes('analysis'))) {
      confidence = 'High';
      reasons.push('Business publication reporting on research/studies');
    }
  }

  // Content-based confidence analysis
  const contentIndicators = {
    highConfidence: [
      'journal', 'study', 'research', 'clinical trial',
      'meta-analysis', 'systematic review', 'peer-reviewed',
      'publication', 'proceedings', 'conference',
      'doi:', 'volume', 'issue', 'pmid:', 'isbn:',
      'randomized controlled trial', 'cohort study',
      'scientific paper', 'published research',
      'empirical study', 'longitudinal study',
      'statistical analysis', 'clinical research',
      'experimental results', 'laboratory findings'
    ],
    mediumConfidence: [
      'expert opinion', 'professional analysis',
      'industry report', 'white paper',
      'technical documentation', 'official documentation',
      'professional guidelines', 'case study',
      'field research', 'market research'
    ]
  };

  // Check for high confidence indicators
  const highMatches = contentIndicators.highConfidence.filter(indicator => 
    sourceText.includes(indicator)
  );

  if (highMatches.length > 0) {
    confidence = 'High';
    reasons.push(`Contains academic/scientific indicators: ${highMatches.join(', ')}`);
  }

  // Check for medium confidence indicators
  const mediumMatches = contentIndicators.mediumConfidence.filter(indicator => 
    sourceText.includes(indicator)
  );

  if (mediumMatches.length > 0) {
    if (mediumMatches.length >= 2) {
      confidence = 'High';
      reasons.push(`Multiple professional/technical indicators: ${mediumMatches.join(', ')}`);
    } else {
      reasons.push(`Contains professional/technical indicators: ${mediumMatches.join(', ')}`);
    }
  }

  // If no specific reasons found, analyze the content type
  if (reasons.length === 0) {
    if (sourceText.includes('research') || sourceText.includes('study')) {
      reasons.push('Research-based content - specific methodology not specified');
    } else if (sourceText.includes('official') || sourceText.includes('professional')) {
      reasons.push('Professional/official source - requires verification of credentials');
    } else {
      reasons.push('General informational source - requires additional verification');
    }
  }

  return { 
    confidence, 
    reason: reasons.join('\n')
  };
}

function getConfidenceColor(confidence: 'High' | 'Medium'): string {
  switch (confidence) {
    case 'High':
      return 'text-green-800 bg-green-100';
    case 'Medium':
      return 'text-yellow-800 bg-yellow-100';
  }
}

type SourceParseResult = {
  number: number;
  text: string;
  url?: string;
  confidence: 'High' | 'Medium';
} | null;

interface SourceWithConfidence {
  number: number;
  text: string;
  url?: string;
  confidence: 'High' | 'Medium';
  confidenceReason: string;
}

function getConfidenceReason(source: string, confidence: 'High' | 'Medium', matchedIndicators: string[]): string {
  const sourceText = source.toLowerCase();
  const urlMatch = source.match(/https?:\/\/[^\s]+/);
  let reasons: string[] = [];

  if (urlMatch) {
    const domain = urlMatch[0].toLowerCase();
    
    // Check domain-based confidence
    if (domain.includes('.edu')) {
      reasons.push('Educational institution domain (.edu)');
    }
    if (domain.includes('scholar.google')) {
      reasons.push('Google Scholar academic search platform');
    }
    if (domain.includes('nature.com') || domain.includes('science.org')) {
      reasons.push('Premier scientific journal publisher');
    }
    if (domain.includes('.gov')) {
      reasons.push('Government domain (.gov)');
    }
    if (domain.includes('who.int')) {
      reasons.push('World Health Organization');
    }
    if (domain.includes('nih.gov') || domain.includes('pubmed')) {
      reasons.push('National Institutes of Health resource');
    }
  }

  // Add matched content indicators
  if (matchedIndicators.length > 0) {
    reasons.push(`Contains academic indicators: ${matchedIndicators.join(', ')}`);
  }

  if (reasons.length === 0) {
    if (confidence === 'Medium') {
      reasons.push('General informational source without specific academic or institutional backing');
    }
  }

  return reasons.join('\n');
}

function parseSources(sourcesText: string | null): SourceWithConfidence[] {
  if (!sourcesText) return [];
  
  const parseSource = (line: string): SourceWithConfidence | null => {
    const match = line.match(/^(\d+)\.\s*(.*?)(?:\s*-\s*(https?:\/\/[^\s]+))?$/);
    if (!match || !match[1] || !match[2]) return null;
    
    const numberStr = match[1] as string;
    const text = match[2] as string;
    const url = match[3];
    
    const number = parseInt(numberStr, 10);
    if (isNaN(number) || !text) return null;
    
    const fullText = text.trim();
    const urlText = url ? url.trim() : '';
    const sourceText = urlText ? `${fullText} - ${urlText}` : fullText;
    
    // Analyze the source with the complete text string
    const analysis = analyzeSourceConfidence(sourceText);
    
    return {
      number,
      text: fullText,
      url: urlText || undefined,
      confidence: analysis.confidence,
      confidenceReason: analysis.reason
    };
  };

  return sourcesText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(parseSource)
    .filter((source): source is SourceWithConfidence => source !== null);
}

// Create a new DetailedButton component
function DetailedButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
    >
      {isOpen ? 'Hide Detailed Answer' : 'Show Detailed Answer'}
    </button>
  );
}

export function ChatResponse({ response }: { response: Response }) {
  const [openTab, setOpenTab] = useState<'thought-process' | 'detailed' | 'sources' | 'none'>('none');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const sources = parseSources(response.sources || null);

  const handleThoughtProcessClick = () => {
    setOpenTab(openTab === 'thought-process' ? 'none' : 'thought-process');
  };

  const handleSourcesClick = () => {
    setOpenTab(openTab === 'sources' ? 'none' : 'sources');
  };

  const handleDetailedClick = () => {
    setOpenTab(openTab === 'detailed' ? 'none' : 'detailed');
  };

  const toggleSourceExpansion = (sourceNumber: number) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceNumber)) {
      newExpanded.delete(sourceNumber);
    } else {
      newExpanded.add(sourceNumber);
    }
    setExpandedSources(newExpanded);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">{response.modelName} Response:</h3>
      <p className="text-gray-700">{response.response}</p>

      <div className="flex space-x-4">
        {response.thoughtProcess && (
          <button
            onClick={() => setOpenTab(openTab === 'thought-process' ? 'none' : 'thought-process')}
            className="text-purple-600 hover:text-purple-800 text-sm"
          >
            {openTab === 'thought-process' ? 'Hide Thought Process' : 'Show Thought Process'}
          </button>
        )}
        {response.detailedAnswer && (
          <button
            onClick={() => setOpenTab(openTab === 'detailed' ? 'none' : 'detailed')}
            className="text-green-600 hover:text-green-800 text-sm"
          >
            {openTab === 'detailed' ? 'Hide Detailed Answer' : 'Show Detailed Answer'}
          </button>
        )}
        {response.sources && (
          <button
            onClick={() => setOpenTab(openTab === 'sources' ? 'none' : 'sources')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {openTab === 'sources' ? 'Hide Sources' : 'Show Sources'}
          </button>
        )}
      </div>

      {openTab === 'thought-process' && response.thoughtProcess && (
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-purple-800 mb-4">Thought Process:</h4>
          <div className="space-y-6">
            {response.thoughtProcess.split('\n\n').map((section, index) => {
              const [title, ...content] = section.split('\n');
              return (
                <div key={index} className="space-y-2">
                  <h5 className="font-semibold text-purple-900">{title}</h5>
                  <ul className="space-y-1 ml-4">
                    {content.map((line, lineIndex) => (
                      <li key={lineIndex} className="text-purple-800">
                        {line.trim().startsWith('-') ? (
                          <span className="flex">
                            <span className="mr-2">•</span>
                            <span>{line.trim().substring(1).trim()}</span>
                          </span>
                        ) : (
                          line.trim()
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openTab === 'detailed' && response.detailedAnswer && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">Detailed Answer:</h4>
          <p className="text-green-900">{response.detailedAnswer}</p>
        </div>
      )}

      {openTab === 'sources' && sources.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Sources:</h4>
          <div className="space-y-2">
            {sources.map((source) => {
              const confidenceClass = getConfidenceColor(source.confidence);
              const isExpanded = expandedSources.has(source.number);
              
              return (
                <div 
                  key={`source-${source.number}-${source.text.substring(0, 20)}`}
                  className="p-2 rounded bg-white"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <p className="text-gray-800">
                        {source.number}. {source.text}
                      </p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm block mt-1"
                        >
                          {source.url}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => toggleSourceExpansion(source.number)}
                      className={`ml-2 text-xs font-medium px-2 py-1 rounded ${confidenceClass} hover:opacity-80 transition-colors whitespace-nowrap`}
                    >
                      {source.confidence} {isExpanded ? '▼' : '▶'}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-2 ml-4 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <h5 className="font-medium mb-1">Confidence Analysis:</h5>
                      {source.confidenceReason.split('\n').map((reason, idx) => (
                        <p key={idx} className="ml-2">• {reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 