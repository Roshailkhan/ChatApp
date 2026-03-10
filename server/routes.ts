import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const GROQ_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "compound-beta",
  "compound-beta-mini",
]);

const OPENAI_MODELS = new Set([
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
]);

// Models that require max_completion_tokens instead of max_tokens
function usesCompletionTokens(model: string): boolean {
  return /^o[0-9]|^gpt-5/i.test(model);
}

function getClientForModel(model: string): OpenAI {
  if (GROQ_MODELS.has(model) && process.env.GROQ_API_KEY) {
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  if (OPENAI_MODELS.has(model) && process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  if (process.env.GROQ_API_KEY) {
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function getDefaultModel(): string {
  if (process.env.GROQ_API_KEY) return "llama-3.3-70b-versatile";
  return "gpt-4.1";
}

function getTitleModel(): string {
  if (process.env.GROQ_API_KEY) return "llama-3.1-8b-instant";
  return "gpt-4.1-mini";
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, systemPrompt, model, language } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const allMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
      let effectivePrompt = systemPrompt || "";
      if (language && language !== "English") {
        effectivePrompt = effectivePrompt
          ? `${effectivePrompt}\n\nPlease respond in ${language}.`
          : `Please respond in ${language}.`;
      }
      if (effectivePrompt.trim()) {
        allMessages.push({ role: "system", content: effectivePrompt });
      }
      allMessages.push(...messages);

      const selectedModel = model || getDefaultModel();
      const client = getClientForModel(selectedModel);

      const tokenParam = usesCompletionTokens(selectedModel)
        ? { max_completion_tokens: 8192 }
        : { max_tokens: 8192 };

      const stream = await client.chat.completions.create({
        model: selectedModel,
        messages: allMessages,
        stream: true,
        ...tokenParam,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("Chat error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to get AI response" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/title", async (req, res) => {
    try {
      const { message } = req.body;
      const titleModel = getTitleModel();
      const client = getClientForModel(titleModel);
      const tokenParam = usesCompletionTokens(titleModel)
        ? { max_completion_tokens: 20 }
        : { max_tokens: 20 };
      const response = await client.chat.completions.create({
        model: titleModel,
        messages: [
          {
            role: "system",
            content:
              "Generate a very short 3-5 word title for this conversation. Return ONLY the title, no quotes, no punctuation at the end, no explanation.",
          },
          { role: "user", content: message },
        ],
        ...tokenParam,
      });
      const title =
        response.choices[0]?.message?.content?.trim() ||
        message.substring(0, 40);
      res.json({ title });
    } catch (err) {
      console.error("Title error:", err);
      res.json({ title: (req.body.message || "New Chat").substring(0, 40) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
