'use client';

interface SourcesButtonProps {
  sources: string | null;
  isOpen: boolean;
  onClick: () => void;
}

export function SourcesButton({ isOpen, onClick }: SourcesButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
    >
      {isOpen ? 'Hide Sources' : 'Show Sources'}
    </button>
  );
} 