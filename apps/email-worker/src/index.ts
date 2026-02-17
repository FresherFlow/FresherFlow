import PostalMime from "postal-mime";

type Env = {
  API_BASE_URL: string;
  INGESTION_WORKER_TOKEN: string;
  SOURCE_LABEL?: string;
  FALLBACK_FORWARD_TO?: string;
};

type ParsedEmail = {
  subject?: string;
  text?: string;
  html?: string;
  messageId?: string;
  date?: string;
};

function extractLinks(input?: string): string[] {
  if (!input) return [];
  const regex = /https?:\/\/[^\s"'<>]+/gi;
  const matches = input.match(regex) || [];
  return Array.from(new Set(matches.map((item) => item.trim())));
}

async function parseMessage(message: ForwardableEmailMessage): Promise<ParsedEmail> {
  const parser = new PostalMime();
  const parsed = await parser.parse(await new Response(message.raw).arrayBuffer());

  return {
    subject: parsed.subject || "",
    text: parsed.text || "",
    html: typeof parsed.html === "string" ? parsed.html : "",
    messageId: parsed.messageId || message.headers.get("message-id") || "",
    date: parsed.date ? new Date(parsed.date).toISOString() : undefined
  };
}

function buildPayload(message: ForwardableEmailMessage, parsed: ParsedEmail, sourceLabel: string) {
  const links = [
    ...extractLinks(parsed.text),
    ...extractLinks(parsed.html)
  ];

  return {
    sourceLabel,
    envelope: {
      from: message.from,
      to: message.to
    },
    messageId: parsed.messageId || null,
    subject: parsed.subject || "",
    text: parsed.text || "",
    html: parsed.html || "",
    links,
    receivedAt: parsed.date || new Date().toISOString()
  };
}

async function sendToApi(env: Env, payload: unknown) {
  const apiBase = env.API_BASE_URL?.replace(/\/+$/, "");
  if (!apiBase) throw new Error("API_BASE_URL is missing");
  if (!env.INGESTION_WORKER_TOKEN) throw new Error("INGESTION_WORKER_TOKEN is missing");

  const response = await fetch(`${apiBase}/api/ingestion/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.INGESTION_WORKER_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API rejected email ingestion (${response.status}): ${body}`);
  }
}

async function handleEmail(message: ForwardableEmailMessage, env: Env): Promise<void> {
  const sourceLabel = env.SOURCE_LABEL || "company_email";
  const parsed = await parseMessage(message);
  const payload = buildPayload(message, parsed, sourceLabel);
  await sendToApi(env, payload);
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      await handleEmail(message, env);
    } catch (error) {
      console.error("Email ingestion worker failed", {
        from: message.from,
        to: message.to,
        error: error instanceof Error ? error.message : String(error)
      });

      if (env.FALLBACK_FORWARD_TO) {
        await message.forward(env.FALLBACK_FORWARD_TO);
        return;
      }

      message.setReject("Temporary processing error. Please retry.");
    }
  },

  async fetch(): Promise<Response> {
    return new Response(
      JSON.stringify({ ok: true, service: "fresherflow-email-worker" }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  }
};
