import path from 'node:path';
import { pathToFileURL } from 'node:url';

const claudeCodeCliDir = path.join(
  path.dirname(path.dirname(process.execPath)),
  'lib',
  'node_modules',
  'gsd-pi',
  'dist',
  'resources',
  'extensions',
  'claude-code-cli',
);

const [{ isClaudeCodeReady }, { streamViaClaudeCode }, { CLAUDE_CODE_MODELS }] = await Promise.all([
  import(pathToFileURL(path.join(claudeCodeCliDir, 'readiness.js')).href),
  import(pathToFileURL(path.join(claudeCodeCliDir, 'stream-adapter.js')).href),
  import(pathToFileURL(path.join(claudeCodeCliDir, 'models.js')).href),
]);

export default function claudeCodeCli(pi) {
  pi.registerProvider('claude-code', {
    apiKey: 'cli',
    api: 'anthropic-messages',
    baseUrl: 'local://claude-code',
    isReady: isClaudeCodeReady,
    streamSimple: streamViaClaudeCode,
    models: CLAUDE_CODE_MODELS,
  });
}
