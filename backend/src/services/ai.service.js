/**
 * AI assistant service.
 *
 * Wraps the Anthropic SDK in a tool-use loop so Claude can read/write files
 * and run git commands to modify the application, then stream progress back
 * to the caller via an `emit(event)` callback.
 *
 * Tools available to Claude:
 *   read_file        — read any file inside PROJECT_ROOT
 *   write_file       — overwrite / create a file
 *   list_directory   — list entries in a directory
 *   run_command      — whitelist of git / npm commands
 */
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const execAsync = promisify(exec);
const PROJECT_ROOT = env.PROJECT_ROOT;
const MODEL = 'claude-sonnet-4-6';

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read the full content of a file. Path is relative to the project root (the directory that contains /backend and /frontend).',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'e.g. "frontend/src/pages/Orders.jsx" or "backend/src/models/Order.js"' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write or completely overwrite a file. Creates parent directories if they do not exist.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
        content: { type: 'string', description: 'The complete new file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List the immediate contents of a directory. node_modules and .git are excluded.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path relative to project root. Omit or pass "." for the root.' },
      },
      required: [],
    },
  },
  {
    name: 'run_command',
    description: 'Run an allowed shell command in the project root. Allowed prefixes: git status, git diff, git log, git add, git commit, git push, npm install, npm run build, npm run seed.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
      },
      required: ['command'],
    },
  },
];

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI development assistant embedded inside the dor-cellular management application — a full-stack Israeli mobile phone store management system.

## Project layout (paths relative to project root)
- backend/   — Node.js + Express + MongoDB (Mongoose) API server
- frontend/  — React 18 + Vite + Redux Toolkit + react-i18next SPA

## Backend conventions
- CommonJS (require / module.exports)
- Layers: routes → controllers → services → models
- asyncHandler wraps every route handler
- Mongoose models in backend/src/models/
- JWT auth middleware: backend/src/middleware/auth.js
- RBAC middleware:     backend/src/middleware/rbac.js
- All routes registered in backend/src/routes/index.js under /api prefix

## Frontend conventions
- ES Modules (import / export)
- React functional components + hooks
- Redux slices in frontend/src/store/slices/
- API functions in frontend/src/api/*.api.js  (aggregated in client.js)
- Pages in frontend/src/pages/   — one file per page
- CSS variables for theming (--brand-primary, --surface-1/2/3, --border, --text-muted, --danger)
- RTL Hebrew UI — all user-facing strings in Hebrew
- Existing class names: table-wrap, toolbar, card, badge (warning/danger), btn-ghost, muted

## How to work
1. ALWAYS read the relevant files first before making any change.
2. Make minimal, focused edits — never refactor unrelated code.
3. Follow the existing patterns in each file exactly.
4. If you add a new page: also add its route in App.jsx and its nav entry in Layout.jsx.
5. After ALL changes are complete, write a brief Hebrew summary of what was done.`;

// ── Path helpers ──────────────────────────────────────────────────────────────

const BLOCKED_NAMES = ['.env', '.env.local', '.env.production'];

function resolveSafe(relPath) {
  const rel = path.normalize((relPath || '.').replace(/^\/+/, ''));
  const full = path.join(PROJECT_ROOT, rel);
  if (!full.startsWith(PROJECT_ROOT + path.sep) && full !== PROJECT_ROOT) {
    throw new Error(`Path escape detected: ${relPath}`);
  }
  if (BLOCKED_NAMES.includes(path.basename(full))) {
    throw new Error(`Access to ${path.basename(full)} is not allowed`);
  }
  return full;
}

// ── Tool executor ─────────────────────────────────────────────────────────────

const COMMAND_WHITELIST = [
  /^git (status|diff|log|add|commit|push)(\s|$)/,
  /^npm (install|run build|run seed)(\s|$)/,
];

async function executeTool(name, input) {
  switch (name) {
    case 'read_file': {
      const full = resolveSafe(input.path);
      const content = await fs.readFile(full, 'utf8');
      return content.length > 60000
        ? `${content.slice(0, 60000)}\n\n[... file truncated at 60 000 chars]`
        : content;
    }

    case 'write_file': {
      const full = resolveSafe(input.path);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, input.content, 'utf8');
      return `Written: ${input.path}`;
    }

    case 'list_directory': {
      const full = resolveSafe(input.path || '.');
      const entries = await fs.readdir(full, { withFileTypes: true });
      return entries
        .filter((e) => !['node_modules', '.git', 'dist', '.next'].includes(e.name))
        .map((e) => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`)
        .join('\n') || '(empty)';
    }

    case 'run_command': {
      const cmd = input.command.trim();
      if (!COMMAND_WHITELIST.some((r) => r.test(cmd))) {
        return `Error: command not in whitelist — "${cmd}"`;
      }
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: PROJECT_ROOT,
        timeout: 120_000,
      });
      return (stdout + stderr).trim() || '(no output)';
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Main chat loop ────────────────────────────────────────────────────────────

/**
 * Run a Claude conversation with tool use.
 *
 * @param {{ role: string, content: string }[]} userMessages  Conversation history.
 * @param {(event: object) => void}             emit          SSE event emitter.
 * @returns {Promise<string[]>}                               List of written file paths.
 */
async function runChat(userMessages, emit) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY חסר — הוסף אותו לקובץ .env של הבאקאנד.');
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const msgs = userMessages.map((m) => ({ role: m.role, content: m.content }));
  const changedFiles = [];

  for (;;) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: msgs,
    });

    // Emit any text blocks in this turn
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        emit({ type: 'text', content: block.text });
      }
    }

    if (response.stop_reason !== 'tool_use') break;

    msgs.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      emit({ type: 'tool_start', name: block.name, input: block.input });

      let result;
      try {
        result = await executeTool(block.name, block.input);
        if (block.name === 'write_file') {
          changedFiles.push(block.input.path);
          emit({ type: 'file_changed', path: block.input.path });
        }
      } catch (err) {
        result = `Error: ${err.message}`;
        emit({ type: 'tool_error', name: block.name, message: err.message });
      }

      emit({ type: 'tool_done', name: block.name });
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }

    msgs.push({ role: 'user', content: toolResults });
  }

  return changedFiles;
}

// ── Deploy ────────────────────────────────────────────────────────────────────

/**
 * git add -A → git commit → git push from PROJECT_ROOT.
 * @param {string} commitMessage
 * @returns {Promise<{ cmd: string, output: string, ok: boolean }[]>}
 */
async function deployProject(commitMessage) {
  const safe = commitMessage.replace(/"/g, "'").replace(/\n/g, ' ').slice(0, 200);
  const commands = [
    'git add -A',
    `git commit -m "AI: ${safe}"`,
    'git push',
    'npm run build --prefix frontend',
  ];

  const results = [];
  for (const cmd of commands) {
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: PROJECT_ROOT, timeout: 60_000 });
      results.push({ cmd, output: (stdout + stderr).trim(), ok: true });
    } catch (err) {
      const output = (err.stdout || '') + (err.stderr || '') || err.message;
      results.push({ cmd, output: output.trim(), ok: false });
      break;
    }
  }
  return results;
}

module.exports = { runChat, deployProject };
