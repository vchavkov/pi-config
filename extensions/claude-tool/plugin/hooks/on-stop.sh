#!/usr/bin/env bash
# Stop hook for pi-spawned Claude sessions.
# Writes a sentinel file when Claude completes autonomously (no user interjection).

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Debug log
debug="/tmp/pi-claude-hook-debug.json"
echo "$input" > "$debug"
echo "PI_CLAUDE_SENTINEL=${PI_CLAUDE_SENTINEL:-UNSET}" >> "$debug"

# Guard: if stop_hook_active is true, we're in a loop — bail out
stop_hook_active=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stop_hook_active', False))" 2>/dev/null || echo "False")
echo "stop_hook_active=$stop_hook_active" >> "$debug"
if [ "$stop_hook_active" = "True" ]; then
  echo "EXITING: stop_hook_active" >> "$debug"
  exit 0
fi

# Guard: only act for pi-spawned sessions
if [ -z "${PI_CLAUDE_SENTINEL:-}" ]; then
  echo "EXITING: no sentinel env" >> "$debug"
  exit 0
fi

# Get transcript path
transcript_path=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('transcript_path', ''))" 2>/dev/null || echo "")
echo "transcript_path=$transcript_path" >> "$debug"
echo "transcript_exists=$(test -f "$transcript_path" && echo yes || echo no)" >> "$debug"
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  echo "EXITING: no transcript" >> "$debug"
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

echo "user_msg_count=$user_msg_count" >> "$debug"

# If exactly 1 user message (the initial prompt), this was autonomous — signal completion
if [ "$user_msg_count" -eq 1 ]; then
  echo "WRITING SENTINEL: $PI_CLAUDE_SENTINEL" >> "$debug"
  # Write the last assistant message to the sentinel file so the watcher can read it
  echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('last_assistant_message', ''))" > "$PI_CLAUDE_SENTINEL" 2>/dev/null || touch "$PI_CLAUDE_SENTINEL"
else
  echo "SKIPPING: user_msg_count=$user_msg_count != 1" >> "$debug"
fi

exit 0
