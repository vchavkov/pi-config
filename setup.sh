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

# ── 1. Install pi if missing ────────────────────────────────────────
if ! command -v pi &>/dev/null; then
  echo "Installing @mariozechner/pi-coding-agent..."
  npm install -g @mariozechner/pi-coding-agent
else
  echo "pi $(pi --version 2>/dev/null || echo '?') already installed"
fi

# ── 2. Seed settings.json (skip if exists) ──────────────────────────
if [[ ! -f "$SCRIPT_DIR/settings.json" ]]; then
  echo "Creating default settings.json..."
  cat > "$SCRIPT_DIR/settings.json" << 'SETTINGS'
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-opus-4-6",
  "defaultThinkingLevel": "medium",
  "packages": [
    "git:github.com/nicobailon/pi-mcp-adapter",
    {
      "source": "git:github.com/HazAT/pi-smart-sessions",
      "extensions": ["+extensions/smart-sessions.ts"]
    },
    {
      "source": "git:github.com/HazAT/pi-parallel",
      "extensions": ["+extension/index.ts"]
    },
    "git:github.com/pasky/chrome-cdp-skill",
    "git:github.com/HazAT/glimpse",
    "git:github.com/HazAT/pi-interactive-subagents",
    "git:github.com/HazAT/pi-autoresearch"
  ],
  "hideThinkingBlock": false,
  "extensions": [
    "+extensions/cmux/index.ts",
    "+extensions/claude-tool/index.ts"
  ]
}
SETTINGS
else
  echo "settings.json exists — skipping"
fi

# ── 3. Install pi packages ──────────────────────────────────────────
echo "Installing pi packages..."
PACKAGES=(
  git:github.com/nicobailon/pi-mcp-adapter
  git:github.com/HazAT/pi-smart-sessions
  git:github.com/HazAT/pi-parallel
  git:github.com/pasky/chrome-cdp-skill
  git:github.com/HazAT/glimpse
  git:github.com/HazAT/pi-interactive-subagents
  git:github.com/HazAT/pi-autoresearch
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
  echo '  { "anthropic": "sk-ant-...", "openai": "sk-..." }'
fi

echo ""
echo "✅ Done — restart pi to pick up changes."
