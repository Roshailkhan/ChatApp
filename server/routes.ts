import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

      const selectedModel = model || "gpt-5.2";

      const stream = await openai.chat.completions.create({
        model: selectedModel,
        messages: allMessages,
        stream: true,
        max_completion_tokens: 8192,
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
      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content:
              "Generate a very short 3-5 word title for this conversation. Return ONLY the title, no quotes, no punctuation at the end, no explanation.",
          },
          { role: "user", content: message },
        ],
        max_completion_tokens: 20,
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
