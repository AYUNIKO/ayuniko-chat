import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function loadJson(fileName) {
  const fullPath = path.join(__dirname, fileName);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

const KB = [
  ...loadJson("kb_safety_es.json"),
  ...loadJson("kb_postventa_es.json"),
  ...loadJson("kb_products_es.json"),
  ...loadJson("kb_guide_es.json"),
];

function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function score(tokens, text) {
  const t = (text || "").toLowerCase();
  let s = 0;
  for (const tok of tokens) {
    const hits = t.split(tok).length - 1;
    s += hits;
  }
  return s;
}

function getItemText(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.content === "string") return item.content;
  if (typeof item.text === "string") return item.text;
  return "";
}

function retrieveContext(query, topK = 6, maxChars = 6000) {
  const tokens = tokenize(query);
  if (!tokens.length) return "";

  const ranked = KB
    .map((item) => {
      const text = getItemText(item);
      return { item, text, s: score(tokens, text) };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topK);

  let out = "";
  for (const r of ranked) {
    const title = r.item?.title ? `título: ${r.item.title}\n` : "";
    const chunk = `${title}${r.text}`.trim();
    if (!chunk) continue;
    if (out.length + chunk.length + 2 > maxChars) break;
    out += (out ? "\n\n---\n\n" : "") + chunk;
  }
  return out;
}

app.post("/chat", async (req, res) => {
  try {
    const message = (req.body?.message || "").toString().trim();
    if (!message) return res.status(400).json({ error: "message required" });

    const context = retrieveContext(message);

    const system = `
eres el asistente post-venta oficial de ayúniko.
reglas:
- responde siempre en español, trato de tú
- usa primero seguridad > postventa > productos > guía
- usa el contexto para datos (tomas, ingredientes, advertencias)
- si el contexto no contiene la respuesta, dilo y pide el dato que falta
- no inventes
- 2–6 frases, claro y amable
`;

    const prompt = `contexto:\n${context || "(sin contexto)"}\n\npregunta:\n${message}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: system,
      generationConfig: { temperature: 0.4, topP: 0.95, maxOutputTokens: 512 },
    });

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});
