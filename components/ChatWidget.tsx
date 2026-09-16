'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// 开场白是本地写死的，不参与请求（下面 slice(1) 会把它排除）
const GREETING: Message = {
  role: 'assistant',
  content:
    '你好，我是 9943 小工具大全的客服。工具怎么用、数据存在哪、要不要注册这类问题都可以问我。',
};

const MAX_INPUT = 1000;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  // 用户是否停在底部。上翻看历史时不该被新消息强行拉回底部
  const atBottomRef = useRef(true);
  // 每次发送递增；「清空」会让它 +1，从而作废进行中的请求，
  // 避免迟到的回复把已经清空的会话又整段还原回来
  const requestIdRef = useRef(0);
  // 进行中那条流的 AbortController。「清空」或发新消息时掐掉它 —— 光靠 requestIdRef
  // 只能丢弃结果，请求本身还在跑，上游模型照常生成完并计费
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open && atBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 输入框随内容长高（上面 max-h-24 因此才有意义）
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  const close = () => {
    setOpen(false);
    // 关闭后把焦点还给气泡按钮，否则焦点掉到 body，键盘用户会迷路
    requestAnimationFrame(() => bubbleRef.current?.focus());
  };

  const clear = () => {
    abortRef.current?.abort(); // 真中止上游，别让它白跑完还计费
    abortRef.current = null;
    requestIdRef.current++; // 作废进行中的请求
    setMessages([GREETING]);
    setError(null);
    setLoading(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // 上一条还没收完就发新的：先掐掉旧的，免得两条流交叉往同一处写
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const myId = ++requestIdRef.current;
    const withUser: Message[] = [...messages, { role: 'user', content: text }];
    // 先占一个空的助手气泡，收到多少填多少 —— 这样字是一个个出来的
    setMessages([...withUser, { role: 'assistant', content: '' }]);
    setInput('');
    setError(null);
    setLoading(true);

    // 往最后那个助手气泡上追加。直接按下标改，不依赖闭包里可能已过期的 messages
    const append = (chunk: string) => {
      if (myId !== requestIdRef.current) return; // 已被清空或新请求取代
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== 'assistant') return prev;
        return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
      });
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: withUser.slice(1) }),
        signal: controller.signal,
      });
      if (myId !== requestIdRef.current) return;

      // 校验和限流都发生在流开始之前，所以这里的失败仍然是普通 JSON
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || '客服暂时联系不上，请稍后再试');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let received = '';
      let finished = false;
      let failure: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (myId !== requestIdRef.current) {
          reader.cancel().catch(() => {});
          return;
        }
        buffer += decoder.decode(value, { stream: true });

        // 事件之间用空行分隔；最后一段可能被 TCP 切在半路，留到下一轮再拼
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const ev of events) {
          const line = ev.split('\n').find(l => l.startsWith('data:'));
          if (!line) continue;
          let payload: { t?: string; e?: string; done?: boolean };
          try {
            payload = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (payload.t) {
            received += payload.t;
            append(payload.t);
          } else if (payload.e) {
            failure = payload.e;
          } else if (payload.done) {
            finished = true;
          }
        }
      }

      if (myId !== requestIdRef.current) return;
      if (failure) setError(failure);
      else if (!received) setError('客服没有返回内容，请再问一次');
      else if (!finished) setError('回答好像没说完，请再问一次'); // 流被中途掐断
    } catch (err) {
      if (myId !== requestIdRef.current) return;
      // 「清空」或新请求主动掐掉的不算网络故障，不弹错误
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('网络异常，请稍后再试');
    } finally {
      if (myId === requestIdRef.current) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  };

  // 输入法组合期间的回车（选词）不能当成发送，否则中文会发出去半截
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  if (!open) {
    return (
      <button
        ref={bubbleRef}
        onClick={() => setOpen(true)}
        aria-label="打开在线客服"
        // z-40：低于站内浮层（历史按钮 z-50、弹窗 z-60~90），打开对话时面板才升到 z-[95]
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#fb6400] to-[#ff8c00] shadow-2xl shadow-[#fb6400]/30 hover:shadow-[#fb6400]/50 hover:scale-105 transition-all flex items-center justify-center"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      // z-[95]：低于站内三处 z-[100] 全屏遮罩（计算器弹窗 / 分类选择器 / 天机阁首次引导），
      // 那些是「模态态」，浮动面板不该盖在上面；同时仍高于工具侧栏(60)、编辑弹窗(70)、
      // 确认框(80)。Toast 在顶部居中，与右下角无位置冲突。
      className="fixed bottom-6 right-6 z-[95] flex flex-col w-[min(370px,calc(100vw-2rem))] h-[min(560px,calc(100vh-6rem))] rounded-2xl overflow-hidden border border-white/10 bg-[#12122a]/95 backdrop-blur-xl shadow-2xl animate-slide-up"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <h2 className="text-white font-bold text-sm truncate">在线客服</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={clear}
            className="px-2 py-1 text-xs text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="清空对话"
          >
            清空
          </button>
          <button
            onClick={close}
            aria-label="关闭客服"
            className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-lg"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={e => {
          const el = e.currentTarget;
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        role="log"
        aria-live="polite"
        aria-label="对话内容"
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-[#fb6400] text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white/[0.07] text-white/85 rounded-2xl rounded-tl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* 三个点只在「还没收到第一个字」时显示；一旦开始出字就换成正文本身 */}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 text-xs rounded-2xl rounded-tl-sm bg-red-500/15 text-red-300 border border-red-500/20">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value.slice(0, MAX_INPUT))}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"
            className="flex-1 resize-none max-h-24 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-base placeholder:text-white/30 focus:outline-none focus:border-[#fb6400]/60 focus:ring-2 focus:ring-[#fb6400]/20"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            aria-label="发送"
            className="shrink-0 w-10 h-10 rounded-xl bg-[#fb6400] hover:bg-[#e55a00] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}