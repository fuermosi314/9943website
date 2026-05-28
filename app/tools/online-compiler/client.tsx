'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

interface CompilerSite {
  name: string;
  url: string;
  desc: string;
  icon: string;
}

interface LanguageGroup {
  language: string;
  icon: string;
  sites: CompilerSite[];
}

const compilers: LanguageGroup[] = [
  {
    language: 'C / C++',
    icon: '⚙️',
    sites: [
      {
        name: 'OnlineGDB',
        url: 'https://www.onlinegdb.com/',
        desc: '支持 C/C++/Java/Python 等，内置调试器',
        icon: '🟢',
      },
      {
        name: 'Compiler Explorer',
        url: 'https://godbolt.org/',
        desc: 'Godbolt 编译器探索器，查看汇编输出',
        icon: '🔬',
      },
      {
        name: 'Programiz',
        url: 'https://www.programiz.com/c-programming/online-compiler/',
        desc: '简洁易用，适合初学者',
        icon: '📘',
      },
    ],
  },
  {
    language: 'Python',
    icon: '🐍',
    sites: [
      {
        name: 'Programiz',
        url: 'https://www.programiz.com/python-programming/online-compiler/',
        desc: '简洁易用，支持 Python 3',
        icon: '📘',
      },
      {
        name: 'OnlineGDB',
        url: 'https://www.onlinegdb.com/online_python_compiler',
        desc: '支持调试，可安装 pip 包',
        icon: '🟢',
      },
      {
        name: 'Replit',
        url: 'https://replit.com/',
        desc: '在线 IDE，支持 50+ 语言，可多人协作',
        icon: '⚡',
      },
    ],
  },
  {
    language: 'Java',
    icon: '☕',
    sites: [
      {
        name: 'OnlineGDB',
        url: 'https://www.onlinegdb.com/online_java_compiler',
        desc: '支持 Java 17，内置调试器',
        icon: '🟢',
      },
      {
        name: 'Programiz',
        url: 'https://www.programiz.com/java-programming/online-compiler/',
        desc: '简洁界面，快速编译运行',
        icon: '📘',
      },
      {
        name: 'JDoodle',
        url: 'https://www.jdoodle.com/online-java-compiler/',
        desc: '支持多版本 Java，可保存代码',
        icon: '📝',
      },
    ],
  },
  {
    language: 'JavaScript / TypeScript',
    icon: '📜',
    sites: [
      {
        name: 'CodePen',
        url: 'https://codepen.io/',
        desc: '前端代码在线编辑器，实时预览',
        icon: '✏️',
      },
      {
        name: 'JSFiddle',
        url: 'https://jsfiddle.net/',
        desc: '经典前端在线编辑器，支持框架',
        icon: '🎯',
      },
      {
        name: 'TypeScript Playground',
        url: 'https://www.typescriptlang.org/play',
        desc: 'TypeScript 官方在线编辑器',
        icon: '🔷',
      },
    ],
  },
  {
    language: 'Go',
    icon: '🐹',
    sites: [
      {
        name: 'Go Playground',
        url: 'https://go.dev/play/',
        desc: 'Go 官方在线运行环境',
        icon: '🔵',
      },
      {
        name: 'OnlineGDB',
        url: 'https://www.onlinegdb.com/online_go_compiler',
        desc: '支持 Go 调试',
        icon: '🟢',
      },
      {
        name: 'Go Adapter',
        url: 'https://go.dev/play/)',
        desc: '轻量级 Go 在线运行',
        icon: '📘',
      },
    ],
  },
  {
    language: 'Rust',
    icon: '🦀',
    sites: [
      {
        name: 'Rust Playground',
        url: 'https://play.rust-lang.org/',
        desc: 'Rust 官方在线编辑器',
        icon: '🦀',
      },
      {
        name: 'OnlineGDB',
        url: 'https://www.onlinegdb.com/online_rust_compiler',
        desc: '支持 Rust 编译运行',
        icon: '🟢',
      },
      {
        name: 'Rust Explorer',
        url: 'https://play.rust-lang.org/',
        desc: '查看生成的汇编代码',
        icon: '🔬',
      },
    ],
  },
  {
    language: 'MATLAB / Octave',
    icon: '📊',
    sites: [
      {
        name: 'Octave Online',
        url: 'https://octave-online.net/',
        desc: 'GNU Octave 免费在线版，兼容 MATLAB 语法',
        icon: '🔵',
      },
      {
        name: 'MATLAB Online',
        url: 'https://matlab.mathworks.com/',
        desc: 'MathWorks 官方在线版（需账号）',
        icon: '📐',
      },
      {
        name: 'StackBlitz Octave',
        url: 'https://octave-online.net/',
        desc: '轻量级 Octave 运行环境',
        icon: '⚡',
      },
    ],
  },
  {
    language: 'SQL',
    icon: '🗄️',
    sites: [
      {
        name: 'DB Fiddle',
        url: 'https://www.db-fiddle.com/',
        desc: '支持 MySQL/PostgreSQL/SQLite 在线运行',
        icon: '🗄️',
      },
      {
        name: 'SQLite Online',
        url: 'https://sqliteonline.com/',
        desc: 'SQLite 在线编辑器',
        icon: '📦',
      },
      {
        name: 'SQL Fiddle',
        url: 'http://sqlfiddle.com/',
        desc: '经典 SQL 在线练习工具',
        icon: '📝',
      },
    ],
  },
];

export default function OnlineCompilerPage() {
  useToolHistory('online-compiler');
  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="dev" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">在线编译器</h1>
          </div>
        </div>
        <FullscreenButton />
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-3">💻</div>
          <h2 className="text-2xl font-bold text-white mb-2">在线编译器导航</h2>
          <p className="text-white/40 text-sm">收录各大语言的在线编译运行工具，点击直达</p>
        </div>

        <div className="space-y-6">
          {compilers.map((group, gi) => (
            <div
              key={group.language}
              className="glass-card p-5 animate-slide-up"
              style={{ animationDelay: `${gi * 50}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{group.icon}</span>
                <h3 className="text-white font-semibold">{group.language}</h3>
              </div>
              <div className="space-y-2">
                {group.sites.map((site) => (
                  <a
                    key={site.name}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 hover:border-[#fb6400]/20 border border-transparent transition-all group"
                  >
                    <span className="text-lg shrink-0">{site.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{site.name}</p>
                      <p className="text-xs text-white/30 truncate">{site.desc}</p>
                    </div>
                    <svg
                      className="w-4 h-4 text-white/20 group-hover:text-[#fb6400] transition-colors shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
