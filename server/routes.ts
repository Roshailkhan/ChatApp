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

const OPENROUTER_MODELS = new Set([
  "deepseek/deepseek-chat",
  "qwen/qwen-2.5-72b-instruct",
  "mistralai/mistral-small-3.1-24b-instruct",
  "mistralai/mistral-7b-instruct",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-pro-1.5",
]);

const SEARCH_MODEL = "compound-beta";
const CODE_MODEL = "deepseek/deepseek-chat";

const CODE_SYSTEM_PROMPT = `You are an expert code generation assistant. When writing code:
- Always specify the programming language in code blocks
- Write clean, readable, well-commented code
- Explain key implementation decisions briefly after the code
- Point out potential edge cases or limitations
- If the request is ambiguous, ask one clarifying question before proceeding
- Prefer idiomatic patterns for each language
- Include error handling where appropriate`;

const RESEARCH_SYSTEM_PROMPT = `You are a deep research assistant. When given a topic or question, provide a comprehensive, structured report with the following sections:

## Executive Summary
A 2-3 sentence overview of the key findings.

## Key Findings
Detailed findings with supporting evidence and sources cited inline.

## Multiple Perspectives
Different viewpoints, counterarguments, or alternative interpretations.

## Confidence Assessment
Rate your confidence in the information (High/Medium/Low) and explain any limitations.

## Recommendations
Actionable takeaways or next steps.

Always cite your sources inline when possible. Use clear headings and bullet points for readability.`;

function usesCompletionTokens(model: string): boolean {
  return /^o[0-9]|^gpt-5/i.test(model);
}

function getClientForModel(model: string): OpenAI {
  if (OPENROUTER_MODELS.has(model) && process.env.OPENROUTER_API_KEY) {
    return new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://privateai.app",
        "X-Title": "Private AI",
      },
    });
  }
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
      const { messages, systemPrompt, model, language, mode } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const allMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

      let selectedModel = model || getDefaultModel();
      if (mode === "search" || mode === "research") {
        selectedModel = SEARCH_MODEL;
      } else if (mode === "code") {
        selectedModel = CODE_MODEL;
      }

      let effectivePrompt = systemPrompt || "";
      if (mode === "research") {
        effectivePrompt = RESEARCH_SYSTEM_PROMPT + (effectivePrompt ? "\n\n" + effectivePrompt : "");
      } else if (mode === "code") {
        effectivePrompt = CODE_SYSTEM_PROMPT + (effectivePrompt ? "\n\n" + effectivePrompt : "");
      }
      if (language && language !== "English") {
        effectivePrompt = effectivePrompt
          ? `${effectivePrompt}\n\nPlease respond in ${language}.`
          : `Please respond in ${language}.`;
      }
      if (effectivePrompt.trim()) {
        allMessages.push({ role: "system", content: effectivePrompt });
      }
      allMessages.push(...messages);

      const client = getClientForModel(selectedModel);

      const tokenParam = usesCompletionTokens(selectedModel)
        ? { max_completion_tokens: 8192 }
        : { max_tokens: 8192 };

      const stream = await client.chat.completions.create({
        model: selectedModel,
        messages: allMessages,
        stream: true,
        ...tokenParam,
      } as any);

      let thinkingBuffer = "";
      let inThinkTag = false;

      for await (const chunk of stream as any) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        const reasoningContent = (delta as any).reasoning_content || "";
        if (reasoningContent) {
          res.write(`data: ${JSON.stringify({ thinking: reasoningContent })}\n\n`);
        }

        let content = delta.content || "";
        if (content) {
          if (content.includes("<think>") || inThinkTag) {
            if (content.includes("<think>")) {
              const parts = content.split("<think>");
              if (parts[0]) res.write(`data: ${JSON.stringify({ content: parts[0] })}\n\n`);
              inThinkTag = true;
              thinkingBuffer = parts[1] || "";
              content = "";
            } else if (inThinkTag) {
              if (content.includes("</think>")) {
                const parts = content.split("</think>");
                thinkingBuffer += parts[0];
                res.write(`data: ${JSON.stringify({ thinking: thinkingBuffer })}\n\n`);
                thinkingBuffer = "";
                inThinkTag = false;
                content = parts[1] || "";
              } else {
                thinkingBuffer += content;
                content = "";
              }
            }
          }
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }

        const citations = (chunk as any).citations;
        if (citations && citations.length > 0) {
          res.write(`data: ${JSON.stringify({ citations })}\n\n`);
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

  app.post("/api/summarize", async (req, res) => {
    try {
      const { messages } = req.body;
      const summaryModel = getTitleModel();
      const client = getClientForModel(summaryModel);
      const tokenParam = usesCompletionTokens(summaryModel)
        ? { max_completion_tokens: 300 }
        : { max_tokens: 300 };

      const transcript = (messages as any[])
        .map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n");

      const response = await client.chat.completions.create({
        model: summaryModel,
        messages: [
          {
            role: "system",
            content:
              "Summarize this conversation in 3-5 sentences, capturing the key topics, decisions, and important context. This summary will be injected into a new conversation so the AI can continue where this left off.",
          },
          { role: "user", content: transcript },
        ],
        ...tokenParam,
      });
      const summary = response.choices[0]?.message?.content?.trim() || "";
      res.json({ summary });
    } catch (err) {
      console.error("Summarize error:", err);
      res.json({ summary: "" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
