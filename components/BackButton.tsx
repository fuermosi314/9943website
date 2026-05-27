'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { tools } from '@/lib/tools';

interface BackButtonProps {
  toolId: string;
  className?: string;
}

export default function BackButton({ toolId, className }: BackButtonProps) {
  const searchParams = useSearchParams();
  const fromCategory = searchParams.get('from');
  const tool = tools.find((t) => t.id === toolId);

  const backUrl = fromCategory
    ? `/?category=${fromCategory}`
    : tool
      ? `/?category=${tool.category}`
      : '/';

  return (
    <Link
      href={backUrl}
      className={`flex items-center text-white/60 hover:text-[#fb6400] transition-colors mr-6 ${className || ''}`}
    >
      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      返回
    </Link>
  );
}
