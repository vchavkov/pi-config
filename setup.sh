#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="$HOME/.pi/agent"

# ── Preflight ────────────────────────────────────────────────────────
# Accept either a direct clone at ~/.pi/agent or a symlink pointing here
RESOLVED_AGENT="$(readlink -f "$AGENT_DIR" 2>/dev/null || true)"
RESOLVED_SELF="$(readlink -f "$SCRIPT_DIR")"

if [[ "$RESOLVED_AGENT" != "$RESOLVED_SELF" ]]; then
  echo "⚠️  ~/.pi/agent does not resolve to this directory"
  echo "   Expected: $RESOLVED_SELF"
  echo "   Got:      ${RESOLVED_AGENT:-(does not exist)}"
  echo ""
  echo "   Fix: ln -s $SCRIPT_DIR $AGENT_DIR"
  echo "   Or:  brain setup"
  exit 1
fi

echo "==> pi-config setup ($SCRIPT_DIR)"

# ── 1. Check pi is available ─────────────────────────────────────────
if ! command -v pi &>/dev/null; then
  echo "⚠️  pi not found — install it first (npm install -g @mariozechner/pi-coding-agent)"
  exit 1
fi
echo "pi $(pi --version 2>/dev/null || echo '?') found"

# ── 2. Seed settings.json (skip if exists) ──────────────────────────
if [[ ! -f "$SCRIPT_DIR/settings.json" ]]; then
  echo "Creating default settings.json..."
  cat > "$SCRIPT_DIR/settings.json" << 'SETTINGS'
{
  "defaultProvider": "bosch-anthropic",
  "defaultModel": "claude-sonnet-4-6",
  "defaultThinkingLevel": "medium",
  "enabledModels": [
    "claude-haiku-latest",
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "openai-codex/gpt-5.3-codex",
    "openai-codex/gpt-5.4",
    "openai-codex/gpt-5.4-mini"
  ],
  "packages": [
    "../_pi/packages/pi-mcp-adapter",
    {
      "source": "../_pi/packages/pi-smart-sessions",
      "extensions": ["+extensions/smart-sessions.ts"]
    },
    {
      "source": "../_pi/packages/pi-parallel",
      "extensions": ["+extension/index.ts"]
    },
    "../_pi/packages/pi-diff-review",
    "../_pi/packages/chrome-cdp-skill",
    "../_pi/packages/glimpse",
    "../_pi/packages/pi-interactive-subagents",
    "../_pi/packages/pi-autoresearch"
  ],
  "hideThinkingBlock": false,
  "extensions": [
    "+extensions/cmux/index.ts",
    "+extensions/claude-tool/index.ts",
    "extensions/claude-code-cli/index.mjs",
    "extensions/vertex-anthropic-providers/index.mjs"
  ]
}
SETTINGS
else
  echo "settings.json exists — skipping"
fi

# ── 3. Install pi packages ──────────────────────────────────────────
echo "Installing pi packages..."
PACKAGES=(
  ../_pi/packages/pi-mcp-adapter
  ../_pi/packages/pi-smart-sessions
  ../_pi/packages/pi-parallel
  ../_pi/packages/pi-diff-review
  ../_pi/packages/chrome-cdp-skill
  ../_pi/packages/glimpse
  ../_pi/packages/pi-interactive-subagents
  ../_pi/packages/pi-autoresearch
)
for pkg in "${PACKAGES[@]}"; do
  pi install "$pkg" 2>/dev/null || echo "  ${pkg##*/} — already installed or failed"
done

# ── 4. Extension dependencies ───────────────────────────────────────
if [[ -f "$SCRIPT_DIR/extensions/claude-tool/package.json" ]]; then
  echo "Installing claude-tool extension deps..."
  (cd "$SCRIPT_DIR/extensions/claude-tool" && npm install --silent)
fi

# ── 5. Auth check ───────────────────────────────────────────────────
if [[ ! -f "$SCRIPT_DIR/auth.json" ]]; then
  echo ""
  echo "⚠️  No auth.json found — create $SCRIPT_DIR/auth.json with your API keys:"
  echo '  { "anthropic": "sk-ant-...", "openai-codex": { "type": "oauth", ... } }'
fi

echo ""
echo "✅ Done — restart pi to pick up changes."
