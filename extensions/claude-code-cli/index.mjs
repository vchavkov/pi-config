import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function resolveHelperPath(fileName) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.execPath, '..', '..', 'lib', 'node_modules', 'gsd-pi', 'dist', 'resources', 'extensions', 'claude-code-cli', fileName),
    resolve(process.env.HOME ?? '', '.local', 'share', 'mise', 'installs', 'node', '24.15.0', 'lib', 'node_modules', 'gsd-pi', 'dist', 'resources', 'extensions', 'claude-code-cli', fileName),
    resolve(process.env.HOME ?? '', '.gsd', 'agent', 'extensions', 'claude-code-cli', fileName),
    resolve(currentDir, fileName),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve Claude Code helper module: ${fileName}`);
}

const readinessModule = await import(pathToFileURL(resolveHelperPath('readiness.js')).href);
const streamAdapterModule = await import(pathToFileURL(resolveHelperPath('stream-adapter.js')).href);

const { isClaudeCodeReady } = readinessModule;
const { streamViaClaudeCode } = streamAdapterModule;

function applyEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const exportMatch = line.match(/^\s*export\s+([A-Z0-9_]+)=(['"]?)(.*?)\2\s*$/);
    if (exportMatch) {
      process.env[exportMatch[1]] = exportMatch[3];
      continue;
    }

    const unsetMatch = line.match(/^\s*unset\s+([A-Z0-9_]+)\s*$/);
    if (unsetMatch) {
      delete process.env[unsetMatch[1]];
    }
  }
}

function streamViaBoschClaudeCode(model, context, options) {
  applyEnvFile(resolve(process.env.HOME ?? '', '.zsh', 'zsh-aliases-claude-bosch'));
  return streamViaClaudeCode(model, context, options);
}

const MODELS = [
  {
    id: 'haiku',
    name: 'Claude Haiku (via Claude Code)',
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

const BOSCH_MODELS = [
  {
    id: 'claude-sonnet-4@20250514',
    name: 'Claude Sonnet 4 20250514 (Bosch via Claude Code)',
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 64_000,
  },
  {
    id: 'claude-3-5-haiku@20241022',
    name: 'Claude 3.5 Haiku 20241022 (Bosch via Claude Code)',
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200_000,
    maxTokens: 8_192,
  },
];

export default function claudeCodeCli(pi) {
  pi.registerProvider('bosch-claude-code', {
    apiKey: 'cli',
    api: 'anthropic-messages',
    baseUrl: 'local://claude-code/bosch',
    isReady: isClaudeCodeReady,
    streamSimple: streamViaBoschClaudeCode,
    models: BOSCH_MODELS,
  });

  pi.registerProvider('claude-code', {
    apiKey: 'cli',
    api: 'anthropic-messages',
    baseUrl: 'local://claude-code',
    isReady: isClaudeCodeReady,
    streamSimple: streamViaClaudeCode,
    models: MODELS,
  });
}
