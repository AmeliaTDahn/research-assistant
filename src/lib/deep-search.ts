import OpenAI from 'openai';

export interface DeepSearchConfig {
  openaiApiKey: string;
  firecrawlKey: string;
  firecrawlBaseUrl?: string;
  model?: string;
}

export interface SearchResult {
  title: string;
  content: string;
  url?: string;
}

export class DeepSearch {
  private openai: OpenAI;
  private firecrawlKey: string;
  private firecrawlBaseUrl: string;
  private model: string;

  constructor(config: DeepSearchConfig) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
    this.firecrawlKey = config.firecrawlKey;
    this.firecrawlBaseUrl = config.firecrawlBaseUrl || 'https://api.firecrawl.com';
    this.model = config.model || 'gpt-3.5-turbo';
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      // First, get relevant documents from Firecrawl
      const firecrawlResponse = await fetch(`${this.firecrawlBaseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.firecrawlKey}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!firecrawlResponse.ok) {
        throw new Error('Failed to fetch documents from Firecrawl');
      }

      const documents = await firecrawlResponse.json();

      // Then, use OpenAI to analyze and summarize the results
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful research assistant. Analyze the search results and provide a concise summary.',
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nDocuments: ${JSON.stringify(documents)}`,
          },
        ],
      });

      const summary = completion.choices[0]?.message?.content;

      // Return the results in the expected format
      return [{
        title: 'Search Results Summary',
        content: summary || 'No summary available',
        url: null,
      }];
    } catch (error) {
      console.error('Deep search error:', error);
      throw error;
    }
  }
} 