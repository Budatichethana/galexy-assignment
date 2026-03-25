import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const llmNodeTask = task({
  id: "llm-node",
  run: async (payload: { prompt: string }): Promise<{ output: string }> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      const client = new GoogleGenerativeAI(apiKey);
      const configuredModel = process.env.GEMINI_MODEL?.trim();
      const candidateModels = [
        configuredModel || "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash",
      ].filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);

      let lastError: unknown;
      for (const modelName of candidateModels) {
        try {
          const model = client.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(payload.prompt);
          const generatedText = result.response.text();

          return { output: generatedText };
        } catch (modelError) {
          lastError = modelError;
        }
      }

      throw lastError ?? new Error("No Gemini model could generate content");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini API call failed: ${errorMessage}`);
    }
  },
});
