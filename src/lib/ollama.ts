import { studentSupabase } from "@/integrations/supabase/student-client";

async function describeEdgeFunctionError(error: unknown) {
  const fallback = "Could not connect to the online Ollama backend.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const candidate = error as {
    message?: string;
    context?: {
      status?: number;
      text?: () => Promise<string>;
    };
  };

  if (candidate.context?.status === 404) {
    return "Supabase Edge Function `ollama-proxy` was not found. Deploy it to your Supabase project.";
  }

  if (candidate.context?.status === 401 || candidate.context?.status === 403) {
    return "Supabase rejected the Edge Function request. Check the project anon key and function permissions.";
  }

  if (candidate.context?.text) {
    try {
      const text = await candidate.context.text();
      if (text) return text;
    } catch {
      // Ignore response body read failures and fall back below.
    }
  }

  if (candidate.message?.includes("Failed to send a request to the Edge Function")) {
    return "Supabase Edge Function is unreachable. Check your student Supabase URL, your internet connection, and whether `ollama-proxy` is deployed.";
  }

  return candidate.message || fallback;
}

async function invokeOllamaProxy(body: Record<string, unknown>) {
  const { data, error } = await studentSupabase.functions.invoke("ollama-proxy", { body });
  if (error) throw error;
  return data;
}

export async function generateWithOllama(
  prompt: string,
  model: string,
  _baseUrl: string,
  system = "You are a helpful study coach.",
  temperature = 0.5,
  format?: "json",
  _apiKey?: string
) {
  try {
    const data = await invokeOllamaProxy({
      action: "generate",
      model: model || "llama3:latest",
      prompt,
      system,
      temperature,
      format,
    });

    return typeof data?.response === "string" ? data.response : "";
  } catch (error) {
    console.error("Ollama proxy error:", await describeEdgeFunctionError(error));
    return "";
  }
}

export async function testOllamaConnection(_baseUrl: string, model: string) {
  try {
    const data = await invokeOllamaProxy({
      action: "test",
      model: model || "llama3:latest",
    });

    return {
      ok: Boolean(data?.ok),
      message: typeof data?.message === "string" ? data.message : "Could not connect to the online Ollama backend.",
    };
  } catch (error) {
    return {
      ok: false,
      message: await describeEdgeFunctionError(error),
    };
  }
}
