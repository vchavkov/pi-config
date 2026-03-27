#!/usr/bin/env bash
# Stop hook for pi-spawned Claude sessions.
# Writes a sentinel file when Claude completes autonomously (no user interjection).

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Guard: if stop_hook_active is true, we're in a loop — bail out
stop_hook_active=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stop_hook_active', False))" 2>/dev/null || echo "False")
if [ "$stop_hook_active" = "True" ]; then
  exit 0
fi

# Guard: only act for pi-spawned sessions
if [ -z "${PI_CLAUDE_SENTINEL:-}" ]; then
  exit 0
fi

# Get transcript path
transcript_path=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('transcript_path', ''))" 2>/dev/null || echo "")
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  exit 0
fi

# Count user messages in transcript
# Claude's transcript format: {"type": "user", "message": {"role": "user", ...}}
user_msg_count=$(python3 - "$transcript_path" <<'EOF'
import sys, json

transcript_path = sys.argv[1]
count = 0
with open(transcript_path, 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            if entry.get('type') == 'user':
                count += 1
        except json.JSONDecodeError:
            pass
print(count)
EOF
)

# If exactly 1 user message (the initial prompt), this was autonomous — signal completion
if [ "$user_msg_count" -eq 1 ]; then
  # Write last_assistant_message to sentinel so the watcher gets a clean result
  echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('last_assistant_message', ''))" > "$PI_CLAUDE_SENTINEL" 2>/dev/null || touch "$PI_CLAUDE_SENTINEL"
fi

exit 0
