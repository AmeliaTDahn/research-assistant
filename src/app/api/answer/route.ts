import { NextResponse } from 'next/server';

// This is a simple in-memory store for answers. In a real app, you'd use a proper database or message queue.
const answerStore = new Map<string, (answer: string) => void>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, answer } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (answer) {
      // If we have an answer, resolve the pending promise
      const resolver = answerStore.get(question);
      if (resolver) {
        resolver(answer);
        answerStore.delete(question);
      }
      return NextResponse.json({ success: true });
    } else {
      // If we don't have an answer, create a new promise and wait for it
      return new Promise((resolve) => {
        answerStore.set(question, (answer: string) => {
          resolve(NextResponse.json({ answer }));
        });
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 