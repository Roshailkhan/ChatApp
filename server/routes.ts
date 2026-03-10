import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_TITLE_MODEL = "llama-3.1-8b-instant";

function getAIClient(): OpenAI {
  if (process.env.GROQ_API_KEY) {
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
    });
  }
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function getDefaultModel(): string {
  return process.env.GROQ_API_KEY ? GROQ_DEFAULT_MODEL : "gpt-5.2";
}

function getTitleModel(): string {
  return process.env.GROQ_API_KEY ? GROQ_TITLE_MODEL : "gpt-5-nano";
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
      const client = getAIClient();

      const stream = await client.chat.completions.create({
        model: selectedModel,
        messages: allMessages,
        stream: true,
        max_tokens: 8192,
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
      const client = getAIClient();
      const response = await client.chat.completions.create({
        model: getTitleModel(),
        messages: [
          {
            role: "system",
            content:
              "Generate a very short 3-5 word title for this conversation. Return ONLY the title, no quotes, no punctuation at the end, no explanation.",
          },
          { role: "user", content: message },
        ],
        max_tokens: 20,
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
