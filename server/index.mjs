import express from "express";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // .env is optional; local recommendation mode requires no configuration.
}
const app = express();
const isDev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 4173);

app.use(express.json({ limit: "300kb" }));

const allowedProductIds = new Set([
  "double-anti-serum",
  "ruby-serum",
  "source-repair-serum",
  "basic-cleanser",
  "basic-cream",
  "basic-sunscreen",
]);

const routineStepSchema = z.object({
  order: z.number().int().positive(),
  slot: z.enum(["am", "pm"]),
  productId: z.string().refine((id) => allowedProductIds.has(id)),
  productName: z.string(),
  action: z.string(),
  reason: z.string(),
});

const recommendationSchema = z.object({
  profileTitle: z.string(),
  profileSummary: z.string(),
  confidence: z.number().min(0).max(1),
  scores: z.object({ antioxidant: z.number().min(0).max(100), firming: z.number().min(0).max(100), barrier: z.number().min(0).max(100) }),
  morning: z.array(routineStepSchema),
  evening: z.array(routineStepSchema),
  cautions: z.array(z.string()).min(1),
  articles: z.array(z.object({ tag: z.string(), title: z.string(), readTime: z.string() })).min(2),
  conversion: z.object({ title: z.string(), subtitle: z.string(), cta: z.string() }),
  mode: z.literal("ai"),
});

app.post("/api/recommend", async (req, res) => {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return res.status(503).json({ code: "LOCAL_ONLY", message: "AI_API_KEY 未配置，已使用本地推荐引擎。" });

  const { profile, knowledge, baseline } = req.body ?? {};
  if (!profile || !Array.isArray(knowledge) || !baseline) return res.status(400).json({ code: "BAD_REQUEST" });
  const safeKnowledge = knowledge.filter((item) => item && allowedProductIds.has(item.id)).slice(0, 6);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${(process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4.1-mini",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "你是美妆运营内容助手。只润色给定方案，不得增加产品、功效、步骤或医疗结论。保留所有 productId、order、slot 和数值，返回与 baseline 完全同构的 JSON，并将 mode 设为 ai。语气专业、克制、清楚。",
          },
          { role: "user", content: JSON.stringify({ profile, groundedKnowledge: safeKnowledge, baseline }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = recommendationSchema.parse(JSON.parse(content));
    const expected = [...baseline.morning, ...baseline.evening].map((step) => step.productId).join("|");
    const actual = [...parsed.morning, ...parsed.evening].map((step) => step.productId).join("|");
    if (expected !== actual) throw new Error("AI changed product sequence");
    return res.json(parsed);
  } catch (error) {
    return res.status(502).json({ code: "AI_FALLBACK", message: error instanceof Error ? error.message : "AI request failed" });
  } finally {
    clearTimeout(timer);
  }
});

if (isDev) {
  const { createServer } = await import("vite");
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(root, "dist")));
  app.use((_req, res) => res.sendFile(path.join(root, "dist", "index.html")));
}

app.listen(port, "127.0.0.1", () => {
  console.log(`PROYA SkinLab running at http://127.0.0.1:${port}`);
});
