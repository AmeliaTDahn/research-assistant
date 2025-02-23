import OpenAI from 'openai';

if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
  throw new Error('Missing NEXT_PUBLIC_OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function generateSummary(content: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Generate a concise executive summary of the following research content. The summary should:
- Be 2-3 paragraphs
- Highlight the most important findings
- Use clear, professional language
- Focus on key conclusions and implications
- Avoid technical jargon unless necessary
- Be suitable for quick understanding of the main points

Format the summary with the heading "Executive Summary" in markdown.`
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
} 