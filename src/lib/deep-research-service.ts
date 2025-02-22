import { deepResearch, ResearchProgress } from 'deep-research/src/deep-research';
import { generateFeedback } from 'deep-research/src/feedback';
import { env } from '@/env';
import FirecrawlApp from '@mendable/firecrawl-js';

export interface DeepResearchResult {
  title: string;
  content: string;
  sources: string[];
}

export interface DeepResearchOptions {
  breadth?: number;
  depth?: number;
  onProgress?: (progress: ResearchProgress) => void;
  onQuestion?: (question: string) => Promise<string>;
  onThought?: (thought: string) => void;
}

export class DeepResearchService {
  private firecrawl: FirecrawlApp;

  constructor() {
    if (!env.NEXT_PUBLIC_FIRECRAWL_KEY) {
      throw new Error('Firecrawl key is required');
    }
    if (!env.NEXT_PUBLIC_OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    // Set up environment variables for the deep-research library
    process.env.OPENAI_KEY = env.NEXT_PUBLIC_OPENAI_API_KEY;
    process.env.FIRECRAWL_KEY = env.NEXT_PUBLIC_FIRECRAWL_KEY;

    this.firecrawl = new FirecrawlApp({
      apiKey: env.NEXT_PUBLIC_FIRECRAWL_KEY,
      apiUrl: 'https://api.mendable.ai/v1'
    });
  }

  private formatContent(learnings: string[]): string {
    // Group learnings by topic using a more sophisticated approach
    const topics = new Map<string, string[]>();
    const keyHighlights: string[] = [];
    const conclusions: string[] = [];
    const uncategorized: string[] = [];

    // First pass: identify key highlights, conclusions, and initial topic grouping
    learnings.forEach(learning => {
      // Select conclusions (statements that summarize or conclude)
      if (learning.includes('conclude') || 
          learning.includes('summary') || 
          learning.includes('ultimately') ||
          learning.includes('overall') ||
          learning.includes('in conclusion') ||
          learning.includes('therefore')) {
        conclusions.push(learning);
        return;
      }

      // Select impactful findings as key highlights
      if (learning.includes('significant') || 
          learning.includes('important') || 
          learning.includes('key finding') ||
          learning.includes('major') ||
          learning.includes('notably') ||
          learning.match(/\d+%|\d+\s*(million|billion)/) // Contains statistics
      ) {
        keyHighlights.push(learning);
        return;
      }

      // Extract potential topics from the learning
      const words = learning.split(' ').slice(0, 4).join(' ').toLowerCase();
      let assigned = false;

      // Check if this learning is related to any existing topic
      for (const [topic, entries] of Array.from(topics.entries())) {
        if (words.includes(topic) || topic.includes(words)) {
          entries.push(learning);
          assigned = true;
          break;
        }
      }

      // If no related topic found, create a new one or add to uncategorized
      if (!assigned) {
        if (topics.size < 5) { // Limit number of main topics
          topics.set(words, [learning]);
        } else {
          uncategorized.push(learning);
        }
      }
    });

    // Format the content with enhanced Markdown structure
    let content = '# Research Summary\n\n';
    
    // Create a quick summary from the most important findings
    content += '## 📋 Quick Summary\n\n';
    content += '_Key points at a glance:_\n\n';
    
    // Combine key highlights and conclusions for a comprehensive summary
    const summaryPoints = new Set<string>();
    
    // Add the most significant conclusion if available
    if (conclusions.length > 0) {
      summaryPoints.add(conclusions[0]);
    }
    
    // Add 2-3 most important key highlights
    keyHighlights.slice(0, 2).forEach(highlight => {
      summaryPoints.add(highlight);
    });
    
    // Add one key finding from each major topic if we need more points
    if (summaryPoints.size < 3) {
      Array.from(topics.entries())
        .slice(0, 3 - summaryPoints.size)
        .forEach(([_, entries]) => {
          if (entries.length > 0) {
            summaryPoints.add(entries[0]);
          }
        });
    }
    
    // Output the summary points
    Array.from(summaryPoints).forEach(point => {
      content += `- **${point}**\n`;
    });
    content += '\n---\n\n';

    // Add key highlights section if available
    if (keyHighlights.length > 0) {
      content += '## 🎯 Key Findings\n\n';
      content += '_Important discoveries and statistics:_\n\n';
      keyHighlights.forEach(highlight => {
        content += `- ${highlight}\n`;
      });
      content += '\n---\n\n';
    }

    // Add main findings section with categorized topics
    content += '## 📚 Detailed Analysis\n\n';
    content += '_Comprehensive breakdown by topic:_\n\n';

    // Add topics sections with improved formatting
    Array.from(topics.entries()).forEach(([topic, entries]) => {
      const formattedTopic = topic
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      content += `### ${formattedTopic}\n\n`;
      entries.forEach(entry => {
        // Add sub-bullets for entries that contain multiple sentences
        const sentences = entry.split(/\.\s+/);
        if (sentences.length > 1) {
          content += `- ${sentences[0]}.\n`;
          sentences.slice(1).forEach(sentence => {
            if (sentence.trim()) {
              content += `  - ${sentence}.\n`;
            }
          });
        } else {
          content += `- ${entry}\n`;
        }
      });
      content += '\n';
    });

    // Add additional insights if any
    if (uncategorized.length > 0) {
      content += '### 💡 Additional Insights\n\n';
      content += '_Other relevant findings:_\n\n';
      uncategorized.forEach(learning => {
        content += `- ${learning}\n`;
      });
      content += '\n';
    }

    // Create a distinct final thoughts section that synthesizes the findings
    content += '## 🎓 Final Thoughts\n\n';
    content += '_Synthesizing the research findings:_\n\n';

    // Add comprehensive conclusions
    if (conclusions.length > 0) {
      // Use all conclusions except the one used in the quick summary
      conclusions.slice(1).forEach(conclusion => {
        content += `- ${conclusion}\n`;
      });
    }

    // Add synthesized insights from the research
    content += '\n_Additional insights:_\n\n';
    
    // Combine findings from different sections for a comprehensive conclusion
    const topicInsights = Array.from(topics.entries())
      .map(([topic, entries]) => entries[entries.length - 1])
      .slice(0, 2);
    
    topicInsights.forEach(insight => {
      if (insight && !conclusions.includes(insight)) {
        content += `- ${insight}\n`;
      }
    });

    // Add a final key highlight if available
    if (keyHighlights.length > 0) {
      const finalHighlight = keyHighlights[keyHighlights.length - 1];
      if (!conclusions.includes(finalHighlight)) {
        content += `- ${finalHighlight}\n`;
      }
    }

    return content;
  }

  async research(query: string, options: DeepResearchOptions = {}): Promise<DeepResearchResult> {
    try {
      const { breadth = 4, depth = 2, onProgress, onQuestion, onThought } = options;

      // Store original console methods
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
      };

      // Override console methods to capture thoughts
      const interceptConsole = (method: keyof typeof originalConsole) => {
        return (...args: any[]) => {
          // Call original method
          originalConsole[method](...args);

          // Convert arguments to string and emit as thought
          const thought = args
            .map(arg => {
              if (typeof arg === 'string') return arg;
              if (arg instanceof Error) return arg.message;
              try {
                return JSON.stringify(arg, null, 2);
              } catch {
                return String(arg);
              }
            })
            .join(' ');

          if (thought.trim() && onThought) {
            onThought(thought);
          }
        };
      };

      // Apply console overrides
      console.log = interceptConsole('log');
      console.info = interceptConsole('info');
      console.warn = interceptConsole('warn');
      console.error = interceptConsole('error');

      try {
        // Generate follow-up questions
        onThought?.('Generating follow-up questions to better understand your query...');
        const questions = await generateFeedback({ query });
        
        // Collect answers to all questions
        const answers: string[] = [];
        if (onQuestion) {
          for (const question of questions) {
            const answer = await onQuestion(question);
            if (answer && answer !== 'skip') {
              answers.push(answer);
              onThought?.('Incorporating your answer into the research context...');
            }
          }
        }

        // Combine original query with questions and answers
        const refinedQuery = `
Initial Query: ${query}
${questions.map((q, i) => answers[i] ? `Q: ${q}\nA: ${answers[i]}` : '').filter(Boolean).join('\n')}
`.trim();

        onThought?.('Starting deep research with refined query...');
        const result = await deepResearch({
          query: refinedQuery,
          breadth,
          depth,
          onProgress,
          firecrawl: this.firecrawl,
        });

        onThought?.('Research complete! Organizing and formatting results...');

        // Format the content in a structured way
        const formattedContent = this.formatContent(result.learnings);

        return {
          title: 'Research Results',
          content: formattedContent,
          sources: result.visitedUrls,
        };
      } finally {
        // Restore original console methods
        console.log = originalConsole.log;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
      }
    } catch (error) {
      console.error('Research error:', error);
      throw error;
    }
  }
} 