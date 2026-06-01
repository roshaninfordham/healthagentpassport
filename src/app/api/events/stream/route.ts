import {
  getLatestRun,
  subscribeRunEvents,
  type PriorAuthRunEvent
} from "@/lib/live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSse(event: PriorAuthRunEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      const latest = getLatestRun();
      if (latest) {
        for (const event of latest.events) {
          controller.enqueue(encoder.encode(encodeSse(event)));
        }
      }

      const unsubscribe = subscribeRunEvents((event) => {
        controller.enqueue(encoder.encode(encodeSse(event)));
      });

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
