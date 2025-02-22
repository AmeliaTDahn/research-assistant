'use client';

interface ThoughtProcessButtonProps {
  thoughtProcess: string | null;
  isOpen: boolean;
  onClick: () => void;
}

export function ThoughtProcessButton({ isOpen, onClick }: ThoughtProcessButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
    >
      {isOpen ? 'Hide Thought Process' : 'Show Thought Process'}
    </button>
  );
} 