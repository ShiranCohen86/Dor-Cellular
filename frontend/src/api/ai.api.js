/**
 * AI assistant API — uses native fetch for SSE streaming (not axios).
 */

const apiBase = (import.meta.env.VITE_API_URL || '') + '/api/admin/ai';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Stream a chat message to the AI assistant.
 * Calls `onEvent(event)` for each SSE event until the stream ends.
 *
 * @param {{ role: string, content: string }[]} messages
 * @param {(event: object) => void} onEvent
 * @returns {Promise<void>}
 */
export async function streamChat(messages, onEvent) {
  const response = await fetch(`${apiBase}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch {
          // ignore malformed events
        }
      }
    }
  }
}

/**
 * Deploy changes via git add → commit → push.
 *
 * @param {string} commitMessage
 * @returns {Promise<{ ok: boolean, results: { cmd: string, output: string, ok: boolean }[] }>}
 */
export async function deployChanges(commitMessage) {
  const response = await fetch(`${apiBase}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ commitMessage }),
  });
  return response.json();
}
