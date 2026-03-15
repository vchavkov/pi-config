import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";
import {
  isCmuxAvailable,
  createSurface,
  sendCommand,
  pollForExit,
  closeSurface,
} from "./cmux.ts";
import {
  getLeafId,
  getEntryCount,
  getNewEntries,
  findLastAssistantMessage,
  appendBranchSummary,
} from "./session.ts";

const PanelAgentParams = Type.Object({
  name: Type.String({ description: "Display name for the cmux panel" }),
  task: Type.String({ description: "Task/prompt for the sub-agent" }),
  systemPrompt: Type.Optional(
    Type.String({ description: "Appended to system prompt (role instructions)" })
  ),
  interactive: Type.Optional(
    Type.Boolean({ description: "true = user collaborates, false = autonomous (-p mode). Default: true" })
  ),
  model: Type.Optional(Type.String({ description: "Model override" })),
  skills: Type.Optional(Type.String({ description: "Comma-separated skills to load" })),
  tools: Type.Optional(Type.String({ description: "Comma-separated tools to enable" })),
});

function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function panelAgentsExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "panel_agent",
    label: "Panel Agent",
    description:
      "Spawn a sub-agent in a dedicated cmux panel with shared session context. " +
      "The sub-agent branches from the current session, works independently (interactive or autonomous), " +
      "and returns results via a branch summary. Requires cmux to be running (CMUX_SOCKET_PATH must be set).",
    parameters: PanelAgentParams,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const interactive = params.interactive !== false; // default true
      const startTime = Date.now();

      // Validate prerequisites
      if (!isCmuxAvailable()) {
        return {
          content: [
            {
              type: "text",
              text: "Error: cmux is not available. Set CMUX_SOCKET_PATH to use panel agents.",
            },
          ],
          details: { error: "cmux not available" },
        };
      }

      const sessionFile = ctx.sessionManager.getSessionFile();
      if (!sessionFile) {
        return {
          content: [
            {
              type: "text",
              text: "Error: no session file. Start pi with a persistent session to use panel agents.",
            },
          ],
          details: { error: "no session file" },
        };
      }

      let surface: string | null = null;

      try {
        // Record branch point before sub-agent writes
        const branchPointId = getLeafId(sessionFile);
        const entryCount = getEntryCount(sessionFile);

        // Create cmux surface
        surface = createSurface(params.name);

        // Wait for surface to initialize
        await new Promise<void>((resolve) => setTimeout(resolve, 500));

        // Build system prompt
        const summaryInstruction =
          "Your FINAL message should be a clear summary of what you accomplished.";
        const fullSystemPrompt = params.systemPrompt
          ? `${params.systemPrompt}\n\n${summaryInstruction}`
          : summaryInstruction;

        // Build pi command
        const parts: string[] = ["pi"];
        parts.push("--session", shellEscape(sessionFile));
        parts.push("--no-extensions");

        if (params.skills) {
          // Replace --no-skills with explicit --skill flags
          for (const skill of params.skills.split(",").map((s) => s.trim()).filter(Boolean)) {
            parts.push("--skill", shellEscape(skill));
          }
        } else {
          parts.push("--no-skills");
        }

        parts.push("--append-system-prompt", shellEscape(fullSystemPrompt));

        if (params.model) {
          parts.push("--model", shellEscape(params.model));
        }

        if (params.tools) {
          parts.push("--tools", shellEscape(params.tools));
        }

        if (!interactive) {
          parts.push("-p");
        }

        parts.push(shellEscape(params.task));

        const piCommand = parts.join(" ");
        const command = `${piCommand}; echo '__PANEL_DONE_'$?'__'`;

        // Send to surface
        sendCommand(surface, command);

        // Poll for exit
        const interval = interactive ? 3000 : 1000;

        const exitCode = await pollForExit(surface, signal ?? new AbortController().signal, {
          interval,
          onTick() {
            onUpdate?.({
              content: [{ type: "text", text: `${formatElapsed(Math.floor((Date.now() - startTime) / 1000))} elapsed` }],
              details: {
                name: params.name,
                interactive,
                task: params.task,
                startTime,
              },
            });
          },
        });

        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        // Read new entries and extract summary
        const newEntries = getNewEntries(sessionFile, entryCount);
        const lastEntry = newEntries.length > 0 ? newEntries[newEntries.length - 1] : null;
        const lastEntryId = lastEntry?.id ?? null;

        const summary =
          findLastAssistantMessage(newEntries) ??
          (exitCode !== 0
            ? `Sub-agent exited with code ${exitCode}`
            : "Sub-agent exited without output");

        // Append branch summary
        if (branchPointId) {
          appendBranchSummary(sessionFile, branchPointId, lastEntryId, summary);
        }

        // Close surface
        closeSurface(surface);
        surface = null;

        const resultText =
          exitCode !== 0
            ? `Sub-agent exited with code ${exitCode}.\n\n${summary}`
            : summary;

        return {
          content: [{ type: "text", text: resultText }],
          details: {
            name: params.name,
            interactive,
            exitCode,
            elapsed,
            entriesAdded: newEntries.length,
            branchPoint: branchPointId,
          },
        };
      } catch (err: any) {
        if (surface) {
          try {
            closeSurface(surface);
          } catch {
            // ignore cleanup errors
          }
          surface = null;
        }

        if (signal?.aborted) {
          return {
            content: [{ type: "text", text: "Panel agent cancelled." }],
            details: { error: "cancelled" },
          };
        }

        const message = err?.message ?? String(err);
        return {
          content: [{ type: "text", text: `Panel agent error: ${message}` }],
          details: { error: message },
        };
      }
    },

    renderCall(args, theme) {
      const interactive = args.interactive !== false;
      const icon = interactive ? "🧠" : "⚡";
      const mode = interactive ? "interactive session" : "autonomous";
      const text =
        `${icon} ` +
        theme.fg("toolTitle", theme.bold(args.name ?? "(unnamed)")) +
        theme.fg("dim", ` — ${mode}`);
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as any;
      const name = details?.name ?? "(unnamed)";
      const interactive = details?.interactive !== false;

      if (isPartial) {
        // Show progress/instructions while running
        const startTime: number | undefined = details?.startTime;
        const elapsedText = startTime
          ? formatElapsed(Math.floor((Date.now() - startTime) / 1000))
          : "running…";

        const icon = interactive ? "🧠" : "⚡";
        let text =
          `${icon} ` +
          theme.fg("toolTitle", theme.bold(name)) +
          theme.fg("dim", ` — ${elapsedText}`);

        if (interactive) {
          text +=
            "\n" +
            theme.fg("accent", `Switch to the "${name}" panel. `) +
            theme.fg("dim", "Exit (Ctrl+D) to return.");
        } else {
          const taskPreview: string = details?.task ?? "";
          const preview = taskPreview.length > 80 ? taskPreview.slice(0, 80) + "…" : taskPreview;
          if (preview) {
            text += "\n" + theme.fg("dim", `Task: ${preview}`);
          } else {
            text += "\n" + theme.fg("dim", "Running...");
          }
        }

        return new Text(text, 0, 0);
      }

      // Completed
      const exitCode = details?.exitCode ?? 0;
      const elapsed = details?.elapsed != null ? formatElapsed(details.elapsed) : "?";
      const summaryText =
        typeof result.content?.[0]?.text === "string" ? result.content[0].text : "";

      if (exitCode !== 0) {
        const text =
          theme.fg("error", "✗") +
          " " +
          theme.fg("toolTitle", theme.bold(name)) +
          theme.fg("dim", ` — failed (exit code ${exitCode})`);
        return new Text(text, 0, 0);
      }

      const preview =
        expanded || summaryText.length <= 120
          ? summaryText
          : summaryText.slice(0, 120) + "…";

      const text =
        theme.fg("success", "✓") +
        " " +
        theme.fg("toolTitle", theme.bold(name)) +
        theme.fg("dim", ` — completed (${elapsed})`) +
        (preview ? "\n" + theme.fg("text", preview) : "");

      return new Text(text, 0, 0);
    },
  });
}
