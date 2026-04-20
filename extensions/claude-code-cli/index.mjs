import { isClaudeCodeReady } from '/home/vchavkov/.local/share/mise/installs/node/24.15.0/lib/node_modules/gsd-pi/dist/resources/extensions/claude-code-cli/readiness.js';
import { streamViaClaudeCode } from '/home/vchavkov/.local/share/mise/installs/node/24.15.0/lib/node_modules/gsd-pi/dist/resources/extensions/claude-code-cli/stream-adapter.js';

const MODELS = [
  {
    id: 'claude-haiku-latest',
    name: 'Claude Haiku Latest (via Claude Code)',
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 64_000,
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6 (via Claude Code)',
    reasoning: true,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 64_000,
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6 (via Claude Code)',
    reasoning: true,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 128_000,
  },
];

export default function claudeCodeCli(pi) {
  pi.registerProvider('claude-code', {
    apiKey: 'cli',
    api: 'anthropic-messages',
    baseUrl: 'local://claude-code',
    isReady: isClaudeCodeReady,
    streamSimple: streamViaClaudeCode,
    models: MODELS,
  });
}
