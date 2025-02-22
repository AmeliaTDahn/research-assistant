import { useState } from 'react';

interface ChatInterfaceProps {
  // Add any props you need
}

export default function ChatInterface({ ...props }: ChatInterfaceProps) {
  const [isDiveDeep, setIsDiveDeep] = useState(false);

  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="text-4xl font-medium text-[#8B8BFF] mb-4">Research Assistant</h1>
      <p className="text-[#666] mb-8">Discover insights across multiple sources with AI-powered research</p>
      
      {/* Dive Deep button - centered and styled */}
      <button
        onClick={() => setIsDiveDeep(!isDiveDeep)}
        className={`
          mx-auto my-4 px-6 py-2 
          rounded-full font-medium
          transition-all duration-200
          ${isDiveDeep 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        `}
      >
        {isDiveDeep ? 'Surface Mode' : 'Dive Deep'}
      </button>

      {/* Rest of your chat interface */}
    </div>
  );
} 