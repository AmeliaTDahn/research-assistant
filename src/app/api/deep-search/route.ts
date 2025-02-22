import { DeepResearchService } from '@/lib/deep-research-service';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: any) => {
    try {
      await writer.write(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    } catch (error) {
      console.error('Error sending event:', error);
    }
  };

  try {
    const service = new DeepResearchService();
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    // Get the host from the request headers
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Start the SSE response
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Start the research process
    (async () => {
      try {
        const results = await service.research(query, {
          onProgress: async (progress) => {
            await sendEvent('progress', progress);
          },
          onQuestion: async (question) => {
            await sendEvent('question', { question });
            
            try {
              // Wait for the answer from the client using the full URL
              const answerResponse = await fetch(`${baseUrl}/api/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
              });
              
              if (!answerResponse.ok) {
                throw new Error('Failed to get answer from client');
              }
              
              const { answer } = await answerResponse.json();
              return answer;
            } catch (error) {
              console.error('Error getting answer:', error);
              return 'skip'; // Default to skip if we can't get an answer
            }
          },
          onThought: async (thought) => {
            await sendEvent('thought', { thought });
          },
        });

        // Log the results before sending
        console.log('Research completed. Results:', {
          title: results.title,
          contentLength: results.content.length,
          sourcesCount: results.sources.length
        });

        // Send the final results
        await sendEvent('result', { results });
      } catch (error) {
        console.error('Research process error:', error);
        await sendEvent('error', { 
          message: error instanceof Error ? error.message : 'An unexpected error occurred during research' 
        });
      } finally {
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('API route error:', error);
    await sendEvent('error', { 
      message: error instanceof Error ? error.message : 'An unexpected error occurred in the API route' 
    });
    await writer.close();
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
} 