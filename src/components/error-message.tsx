'use client';

import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="text-red-600 p-4 rounded-md bg-red-50">
      {message}
    </div>
  );
} 