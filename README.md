# Research Assistant

An AI-powered research assistant that helps users conduct deep research on any topic. The assistant provides real-time insights, follows up with clarifying questions, and generates comprehensive research summaries.

## Features

- Real-time research progress tracking
- Interactive follow-up questions
- Live thought process visualization
- Structured research results with key findings and detailed analysis
- Source tracking and citation
- Markdown formatting for better readability

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Server-Sent Events (SSE) for real-time updates

## Getting Started

1. Clone the repository:
```bash
git clone [your-repo-url]
cd research-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your API keys:
```
NEXT_PUBLIC_FIRECRAWL_KEY=your-firecrawl-key
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The following environment variables are required:

- `NEXT_PUBLIC_FIRECRAWL_KEY`: Your Firecrawl API key
- `NEXT_PUBLIC_OPENAI_API_KEY`: Your OpenAI API key

## Project Structure

- `/src/app`: Next.js app router components and API routes
- `/src/components`: React components
- `/src/lib`: Utility functions and services
- `/deep-research`: Core research functionality

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
