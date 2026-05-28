'use client';

import Link from 'next/link';

interface BackButtonProps {
  category: string;
  className?: string;
}

export default function BackButton({ category, className }: BackButtonProps) {
  const backUrl = `/?category=${category}`;

  return (
    <Link
      href={backUrl}
      className={`flex items-center px-2 py-2 -ml-2 text-white/60 hover:text-[#fb6400] transition-colors ${className || ''}`}
    >
      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      返回
    </Link>
  );
}
