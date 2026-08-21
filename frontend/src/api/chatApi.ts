import { getToken } from '../utils/security';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Vite proxy rewrites /api → /api/v1, so this becomes /api/v1/chat on the backend
const API_BASE = '/api/chat';

/**
 * Streams a chat response from the production backend AI service.
 * Calls onToken for each streamed token, onDone when complete, onError on failure.
 */
export async function streamChat(
  message: string,
  history: ChatMessage[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();

  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  const csrfToken = getCookie('XSRF-TOKEN') || (window as any).__CSRF_TOKEN__;

  let response: Response;
  try {
    response = await fetch(API_BASE, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify({
        message,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal,
    });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'AbortError') return;
    onError('Network error — could not reach the server.');
    return;
  }

  if (!response.ok || !response.body) {
    if (response.status === 401 || response.status === 403) {
      onError('Please log in to use the chat.');
    } else if (response.status === 503 || response.status === 502) {
      onError('AI service is temporarily offline.');
    } else {
      onError(`Server error (${response.status}). Make sure the backend is running.`);
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const parsed = JSON.parse(trimmed.slice(6));
        if (parsed.error) {
          onError(parsed.error);
          return;
        }
        if (parsed.token) {
          onToken(parsed.token);
        }
        if (parsed.done) {
          onDone();
          return;
        }
      } catch {
        // Ignore malformed lines
      }
    }
  }

  onDone();
}
