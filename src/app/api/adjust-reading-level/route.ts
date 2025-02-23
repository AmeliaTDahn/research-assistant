import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// Validate API key presence
if (!process.env.OPENAI_KEY) {
  throw new Error('Missing OPENAI_KEY environment variable');
}

const CONTENT_TEMPLATE = `
Please structure your response with the following sections:
1. Research Summary
2. Quick Summary
3. Detailed Analysis
4. Final Thoughts

Each section should maintain the same level of detail and length as the original content.
`;

const READING_LEVEL_PROMPTS = {
  beginner: `Rewrite the content for a beginner audience while maintaining ALL information and detail from the original text. Use:
- Simple, clear language that a high school student could understand
- Short sentences and basic vocabulary
- Clear explanations for technical terms
- Concrete examples where helpful
- Active voice and direct explanations
- Bullet points for complex ideas
- The same structure and sections as the original
- The same level of detail and depth as the original

Do not reduce or simplify the actual content - only make the language more accessible.`,

  intermediate: `Rewrite the content for an intermediate audience while maintaining ALL information and detail from the original text. Use:
- Balanced technical and plain language
- Clear explanations that assume some domain knowledge
- A mix of technical terms and accessible explanations
- Real-world examples to illustrate complex points
- Professional but approachable tone
- The same structure and sections as the original
- The same level of detail and depth as the original

Keep all technical concepts but explain them in a more approachable way.`,

  advanced: `Rewrite the content for an advanced audience while maintaining ALL information and detail from the original text. Use:
- Sophisticated technical language and domain-specific terminology
- Complex sentence structures appropriate for academic/professional writing
- Detailed technical explanations and analysis
- Abstract concepts and theoretical frameworks
- Formal academic tone
- The same structure and sections as the original
- The same level of detail and depth as the original

Maintain technical precision while using academic language.`
};

export async function POST(request: Request) {
  try {
    const { content, targetLevel } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const prompt = READING_LEVEL_PROMPTS[targetLevel as keyof typeof READING_LEVEL_PROMPTS];
    if (!prompt) {
      return NextResponse.json(
        { error: 'Invalid reading level' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that adjusts content to different reading levels while maintaining exact structural consistency. You must keep the same sections, headings, and organizational format regardless of reading level."
        },
        {
          role: "user",
          content: `${prompt}\n\nText to adjust:\n${content}`
        }
      ],
      temperature: 0.7,
    });

    const adjustedContent = completion.choices[0].message.content;
    if (!adjustedContent) {
      throw new Error('OpenAI returned empty content');
    }

    return NextResponse.json({ content: adjustedContent });
  } catch (error) {
    console.error('Error in adjust-reading-level:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to adjust reading level' },
      { status: 500 }
    );
  }
} 