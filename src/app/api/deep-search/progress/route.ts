interface ResearchProgress {
  currentDepth: number;
  totalDepth: number;
  currentBreadth: number;
  totalBreadth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
}

interface ProgressUpdate {
  progress?: ResearchProgress;
  thought?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return new Response('Query parameter is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  let timeoutId: NodeJS.Timeout | null = null;
  let isControllerClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Function to send progress updates
      const sendUpdate = (update: ProgressUpdate) => {
        if (!isControllerClosed) {
          try {
            const data = encoder.encode(`data: ${JSON.stringify(update)}\n\n`);
            controller.enqueue(data);
          } catch (error) {
            console.error('Error sending update:', error);
          }
        }
      };

      // Function to safely cleanup
      const cleanup = () => {
        if (!isControllerClosed) {
          try {
            delete (global as any)[progressKey];
            isControllerClosed = true;
            controller.close();
          } catch (error) {
            console.error('Error during cleanup:', error);
          }
        }
      };

      // Store the progress handler in a global map
      const progressKey = `progress_${query}`;
      (global as any)[progressKey] = sendUpdate;

      // Clean up after 5 minutes or if connection is closed
      timeoutId = setTimeout(cleanup, 5 * 60 * 1000);

      // Handle stream cancellation
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        cleanup();
      };
    },
    cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const progressKey = `progress_${query}`;
      delete (global as any)[progressKey];
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 