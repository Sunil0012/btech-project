import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProxyBody = {
  action?: "generate" | "test";
  prompt?: string;
  model?: string;
  system?: string;
  temperature?: number;
  format?: "json";
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getEnvConfig() {
  return {
    baseUrl: (Deno.env.get("OLLAMA_BASE_URL") || "").replace(/\/$/, ""),
    model: Deno.env.get("OLLAMA_MODEL") || "llama3:latest",
    authToken: Deno.env.get("OLLAMA_AUTH_TOKEN") || "",
  };
}

function getAuthHeaders(authToken: string) {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function callOllamaGenerate(options: {
  baseUrl: string;
  authToken: string;
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  format?: "json";
}) {
  const response = await fetch(`${options.baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(options.authToken),
    },
    body: JSON.stringify({
      model: options.model,
      prompt: options.prompt,
      system: options.system,
      stream: false,
      format: options.format,
      options: {
        temperature: options.temperature ?? 0.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama generate request failed with status ${response.status}.`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ProxyBody;
    const action = body.action || "generate";
    const env = getEnvConfig();
    const model = body.model || env.model;

    if (!env.baseUrl) {
      return jsonResponse(
        {
          ok: false,
          response: "",
          message: "Missing OLLAMA_BASE_URL. Set it in Supabase Edge Function secrets.",
        },
        500
      );
    }

    if (action === "test") {
      const tagsRes = await fetch(`${env.baseUrl}/api/tags`, {
        headers: getAuthHeaders(env.authToken),
      });

      if (!tagsRes.ok) {
        return jsonResponse(
          {
            ok: false,
            message: `Ollama tags request failed with status ${tagsRes.status}.`,
          },
          502
        );
      }

      const tagsData = await tagsRes.json();
      const models = Array.isArray(tagsData?.models) ? tagsData.models : [];
      const modelExists = models.some((entry: { name?: string }) => entry?.name === model);

      if (!modelExists) {
        return jsonResponse({
          ok: false,
          message: `Connected to Ollama, but model ${model} was not found.`,
        });
      }

      const generated = await callOllamaGenerate({
        baseUrl: env.baseUrl,
        authToken: env.authToken,
        model,
        prompt: "Reply with the single word ok.",
      });

      const reply = typeof generated?.response === "string" ? generated.response.trim() : "";

      return jsonResponse({
        ok: Boolean(reply),
        message: reply
          ? `Connected to Ollama successfully using ${model}.`
          : "Connected to Ollama, but the model returned an empty response.",
      });
    }

    if (!body.prompt?.trim()) {
      return jsonResponse(
        {
          ok: false,
          response: "",
          message: "Missing prompt.",
        },
        400
      );
    }

    const data = await callOllamaGenerate({
      baseUrl: env.baseUrl,
      authToken: env.authToken,
      model,
      prompt: body.prompt,
      system: body.system || "You are a helpful study coach.",
      temperature: body.temperature ?? 0.5,
      format: body.format,
    });

    return jsonResponse({
      ok: true,
      response: typeof data?.response === "string" ? data.response : "",
      raw: data,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        response: "",
        message: error instanceof Error ? error.message : "Failed to call Ollama.",
      },
      500
    );
  }
});
