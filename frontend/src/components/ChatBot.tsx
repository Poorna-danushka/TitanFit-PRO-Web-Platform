import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  ChevronDown,
  Sparkles,
  RotateCcw,
  Dumbbell,
  Flame,
  Moon,
  LogIn,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { streamChat, type ChatMessage } from '../api/chatApi';
import MessageRenderer from './MessageRenderer';

/* ─── Personal-query detection ───────────────────────────────── */
const PERSONAL_KEYWORDS = [
  'my membership', 'my workout', 'my progress', 'my package', 'my plan',
  'my attendance', 'my profile', 'my account', 'my history', 'my data',
  'my calories', 'my streak', 'how many sessions', 'how many workouts',
  'show my', 'what is my', "what's my", 'check my', 'view my',
  'attendance record', 'my stats', 'my schedule', 'my trainer',
  'my subscription', 'my payment', 'my invoice',
];

function isPersonalQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return PERSONAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/* ─── Quick-action chips ─────────────────────────────────────── */
const QUICK_ACTIONS = [
  { icon: Sparkles, label: 'Available Plans',   prompt: 'What membership plans and packages are available?' },
  { icon: Moon,     label: 'Membership Expiry', prompt: 'When does my membership expire?' },
  { icon: Flame,    label: 'Gym Attendance',    prompt: 'Show my gym attendance and check-in history.' },
  { icon: Dumbbell, label: 'Personal Trainer',  prompt: 'Check my personal trainer session bookings.' },
];

/* ─── Typing dots animation ──────────────────────────────────── */
function TypingDots() {
  return (
    <div className="chat-typing-dots" aria-label="FitBot is typing">
      <span /><span /><span />
    </div>
  );
}

/* ─── Login-prompt bubble (shown for personal queries on public page) ── */
function LoginPromptBubble() {
  return (
    <div className="chat-bubble-row chat-bubble-row--bot">
      <div className="chat-avatar chat-avatar--bot">
        <Bot size={14} />
      </div>
      <div className="chat-bubble-content">
        <div className="chatbot-login-prompt">
          <div className="chatbot-login-prompt-icon">
            <ShieldAlert size={18} />
          </div>
          <p className="chatbot-login-prompt-title">Sign in required</p>
          <p className="chatbot-login-prompt-sub">
            Personal details like your membership, workouts, and progress are only available when you're logged in.
          </p>
          <Link to="/login" className="chatbot-login-prompt-btn">
            <LogIn size={13} />
            Sign In to Continue
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Single message bubble ──────────────────────────────────── */
interface BubbleProps {
  msg: ChatMessage;
  isLoginPrompt?: boolean;
}

function MessageBubble({ msg, isLoginPrompt }: BubbleProps) {
  const isBot = msg.role === 'assistant';
  const time = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(msg.timestamp);

  if (isLoginPrompt) return <LoginPromptBubble />;

  return (
    <div className={`chat-bubble-row ${isBot ? 'chat-bubble-row--bot' : 'chat-bubble-row--user'}`}>
      <div className={`chat-avatar ${isBot ? 'chat-avatar--bot' : 'chat-avatar--user'}`}>
        {isBot ? <Bot size={14} /> : <User size={14} />}
      </div>
      <div className="chat-bubble-content">
        <div className={`chat-bubble ${isBot ? 'chat-bubble--bot' : 'chat-bubble--user'}`}>
          {isBot
            ? <MessageRenderer content={msg.content} compact={false} />
            : <span className="text-[0.8rem] leading-relaxed">{msg.content}</span>
          }
        </div>
        <span className="chat-time">{time}</span>
      </div>
    </div>
  );
}

/* ─── Main ChatBot component ─────────────────────────────────── */
interface ChatBotProps {
  /** Set true on public pages (e.g. Home). Personal queries will show a login prompt. */
  isPublic?: boolean;
}

export default function ChatBot({ isPublic = false }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loginPromptIdx, setLoginPromptIdx] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  /* Auto-scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  /* Cleanup on unmount */
  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: trimmed, timestamp: new Date() };

    // ── Public-mode gate: personal queries redirect to login ──
    if (isPublic && isPersonalQuery(trimmed)) {
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setLoginPromptIdx(newMessages.length); // next index = login prompt slot
      if (!open) setHasUnread(true);
      return;
    }

    const botMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setLoginPromptIdx(null);
    setStreaming(true);

    abortRef.current = new AbortController();
    let tokenBuffer = '';

    await streamChat(
      trimmed,
      [...messages, userMsg],
      (token) => {
        tokenBuffer += token;
        const snapshot = tokenBuffer;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...botMsg, content: snapshot, timestamp: botMsg.timestamp };
          return next;
        });
      },
      () => {
        setStreaming(false);
        if (!open) setHasUnread(true);
      },
      (errMsg) => {
        setStreaming(false);
        setError(errMsg);
        setMessages((prev) => prev.slice(0, -1));
      },
      abortRef.current.signal
    );
  }, [streaming, messages, open, isPublic]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setStreaming(false);
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* ── Floating toggle button ─────────────────────────── */}
      <button
        id="chatbot-toggle"
        aria-label="Open FitBot chat"
        onClick={() => setOpen((o) => !o)}
        className="chatbot-fab"
      >
        {open ? (
          <ChevronDown size={22} />
        ) : (
          <>
            <Bot size={22} />
            {hasUnread && <span className="chatbot-fab-badge" aria-label="New message" />}
          </>
        )}
      </button>

      {/* ── Chat panel ────────────────────────────────────── */}
      <div className={`chatbot-panel ${open ? 'chatbot-panel--open' : ''}`} role="dialog" aria-label="FitBot AI Chat">

        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-header-icon">
              <Bot size={16} />
            </div>
            <div>
              <p className="chatbot-header-title">FitBot <Sparkles size={12} className="inline text-green-400 ml-1" /></p>
              <p className="chatbot-header-sub">
                {streaming ? 'Typing…' : 'AI Assistant · Database-Aware FitBot'}
              </p>
            </div>
          </div>
          <div className="chatbot-header-actions">
            {!isEmpty && (
              <button
                id="chatbot-clear"
                aria-label="Clear conversation"
                onClick={clearChat}
                className="chatbot-icon-btn"
                title="Clear chat"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              id="chatbot-close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="chatbot-icon-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages custom-scrollbar" aria-live="polite">
          {isEmpty ? (
            /* Welcome screen */
            <div className="chatbot-welcome">
              <div className="chatbot-welcome-icon">
                <Bot size={32} />
              </div>
              <h3 className="chatbot-welcome-title">Welcome to TitanFit Pro AI! 💬</h3>
              <p className="chatbot-welcome-sub">
                I'm FitBot — your official gym assistant. Ask me about available membership plans, your expiry date, attendance records, digital entry pass, or personal trainer bookings.
              </p>
              <div className="chatbot-chips">
                {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    id={`chatbot-chip-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    className="chatbot-chip"
                    onClick={() => sendMessage(prompt)}
                    disabled={streaming}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  msg={msg}
                  isLoginPrompt={loginPromptIdx !== null && idx === loginPromptIdx - 1
                    ? false  // user message just before prompt
                    : false}
                />
              ))}
              {/* Login prompt after personal query on public page */}
              {loginPromptIdx !== null && messages.length >= loginPromptIdx && (
                <LoginPromptBubble />
              )}
              {/* Typing indicator shown while waiting for first token */}
              {streaming && messages[messages.length - 1]?.content === '' && (
                <div className="chat-bubble-row chat-bubble-row--bot">
                  <div className="chat-avatar chat-avatar--bot"><Bot size={14} /></div>
                  <TypingDots />
                </div>
              )}
            </>
          )}

          {/* Error banner */}
          {error && (
            <div className="chatbot-error" role="alert">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)} aria-label="Dismiss error">
                <X size={12} />
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-bar">
          <textarea
            ref={inputRef}
            id="chatbot-input"
            className="chatbot-textarea"
            placeholder="Ask FitBot anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
            aria-label="Chat message input"
          />
          <button
            id="chatbot-send"
            aria-label="Send message"
            className="chatbot-send-btn"
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        <p className="chatbot-footer">Shift+Enter for new line · Enter to send</p>
      </div>
    </>
  );
}
