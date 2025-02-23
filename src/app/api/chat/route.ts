import { NextResponse } from "next/server";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
  throw new Error('Missing NEXT_PUBLIC_OPENAI_API_KEY environment variable');
}

interface Source {
  url: string;
  title?: string;
  content?: string;
  snippet?: string;
}

interface FormattedSource {
  url: string;
  title: string;
  excerpt?: string;
  content?: string;
}

function formatSources(sources: Source[]): FormattedSource[] {
  return sources.map(source => {
    const formattedSource: FormattedSource = {
      url: source.url,
      title: source.title || source.url.replace(/^https?:\/\/(www\.)?/, ''),
    };
    if (source.snippet) {
      formattedSource.excerpt = source.snippet;
    }
    if (source.content) {
      formattedSource.content = source.content;
    }
    return formattedSource;
  });
}

export async function POST(request: Request) {
  try {
    const { question, researchContent, sources } = await request.json();

    if (!question || !researchContent) {
      return NextResponse.json(
        { error: 'Question and research content are required' },
        { status: 400 }
      );
    }

    const formattedSources = sources ? formatSources(sources) : [];
    const sourceContext = formattedSources.length > 0 
      ? `\n\nSource Materials:\n${JSON.stringify(formattedSources, null, 2)}`
      : '';

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a helpful research assistant that answers questions about research content. 
Your responses should be:
- Concise and direct
- Based on the provided research content and source materials
- Include specific references to sections of the content when relevant
- Reference specific sources when appropriate
- Admit when you don't have enough information to answer
- Professional but conversational in tone

Here is the research content and sources to reference:

Main Content:
${researchContent}${sourceContext}`
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;
    if (!answer) {
      throw new Error('OpenAI returned empty content');
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 