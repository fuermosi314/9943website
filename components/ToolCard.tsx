import Link from 'next/link';
import { Tool } from '@/lib/tools';

interface ToolCardProps {
  tool: Tool;
  index?: number;
  animated?: boolean;
}

export default function ToolCard({ tool, index = 0, animated = true }: ToolCardProps) {
  const isExternal = tool.path.startsWith('http');

  const card = (
    <div
      className={`group relative glass-card p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:transform hover:scale-105 h-full${animated ? ' animate-fade-in' : ''}`}
      style={animated ? { animationDelay: `${index * 80}ms` } : undefined}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#fb6400]/10 to-[#ff8c00]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative flex flex-col items-center h-full">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300 border border-white/10 group-hover:border-[#fb6400]/30 flex-shrink-0">
          {tool.icon.startsWith('/') ? (
            <img src={tool.icon} alt={tool.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          ) : (
            tool.icon
          )}
        </div>

        <h3 className="text-xs sm:text-sm font-semibold text-white text-center mb-1 line-clamp-2 flex-shrink-0">
          {tool.name}
        </h3>

        <p className="text-[10px] sm:text-xs text-white/50 text-center leading-relaxed line-clamp-2 mt-auto">
          {tool.description}
        </p>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] group-hover:w-16 transition-all duration-300 rounded-full" />
    </div>
  );

  if (isExternal) {
    return (
      <a href={tool.path} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return <Link href={tool.path}>{card}</Link>;
}
