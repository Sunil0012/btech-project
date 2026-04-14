import { getAISettings } from "./aiCoach";
import { generateWithOllama } from "./ollama";

export async function getAIRecommendation(userStats: any) {
  const settings = getAISettings();

  if (!settings.apiKey) {
    if (settings.provider !== "ollama") {
      return "Fallback: Focus on weak topics and practice daily.";
    }
  }

  const prompt = `
You are a GATE DA preparation coach.

User stats:
Accuracy: ${userStats.accuracy}
Weak Topics: ${Array.isArray(userStats.weakTopics) ? userStats.weakTopics.join(", ") : userStats.weakTopics || "None"}
Strong Topics: ${Array.isArray(userStats.strongTopics) ? userStats.strongTopics.join(", ") : userStats.strongTopics || "None"}

Give:
1. What to improve
2. What to practice next
3. Strategy for next 3 days
`;

  try {
    if (settings.provider === "fallback") {
      return "Fallback: Focus on weak topics and practice daily.";
    }

    if (settings.provider === "ollama") {
      const response = await generateWithOllama(
        prompt,
        settings.model,
        settings.baseUrl,
        "You are a concise GATE DA prep coach.",
        0.4,
        undefined,
        settings.apiKey
      );
      return response || "Fallback: Focus on weak topics and practice daily.";
    }

    const response = await fetch(
      `${settings.baseUrl.replace(/\/$/, "")}/models/${settings.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": settings.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Fallback: Focus on weak topics and practice daily.";
  } catch {
    return "Fallback: Focus on weak topics and practice daily.";
  }
}
