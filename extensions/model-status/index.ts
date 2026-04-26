import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("model_select", async (event, ctx) => {
		ctx.ui.setStatus("model", `🤖 ${event.model.id}`);
	});
}
