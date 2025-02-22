import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query, question, answer } = await request.json();

    if (!query || !question || !answer) {
      return NextResponse.json(
        { error: 'Query, question, and answer are required' },
        { status: 400 }
      );
    }

    // Store the answer in the global map
    const answerKey = `answer_${query}_${question}`;
    (global as any)[answerKey] = answer;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Answer API error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
} 