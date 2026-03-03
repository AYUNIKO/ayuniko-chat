/**
 * ayúniko backend (gemini + rag local)
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(
  express.json({
    limit: process?.env?.API_PAYLOAD_MAX_SIZE || "7mb",
  })
);

const PORT = process?.env?.PORT || process?.env?.API_BACKEND_PORT || 5000;

// rate limit
app.set("trust proxy", 1);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_requests",
    message: "has superado el límite de peticiones, inténtalo más tarde.",
  },
});
app.use(limiter);

// ===== env =====
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("falta la variable de entorno GEMINI_API_KEY");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ===== kb loader =====
function loadJson(fileName) {
  const fullPath = path.join(__dirname, fileName);
  if (!fs.existsSync(fullPath)) {
    console.warn(`no existe el archivo: ${fileName}`);
    return [];
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`json inválido: ${fileName}`, e);
    return [];
  }
}

const kbFiles = [
  "kb_guide_es.json",
  "kb_products_es.json",
  "kb_postventa_es.json",
  "kb_safety_es.json",
];

const KB = kbFiles.flatMap(loadJson);

// normaliza items esperados: {id, title, content, tags...}
function getText(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.content === "string") return item.content;
  if (typeof item.text === "string") return item.text;
  return JSON.stringify(item);
}

// ===== rag: búsqueda simple con scoring =====
function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function scoreText(tokens, text) {
  const t = text.toLowerCase();
  let score = 0;
  for (const tok of tokens) {
    if (!tok) continue;
    // suma por ocurrencias
    const hits = t.split(tok).length - 1;
    score += hits;
  }
  return score;
}

function retrieveContext(query, k = 6, maxChars = 6000) {
  const tokens = tokenize(query);
  if (!tokens.length) return "";

  const scored = KB.map((item) => {
    const text = getText(item);
    return { item, text, score: scoreText(tokens, text) };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  if (!scored.length) return "";

  let out = "";
  for (const s of scored) {
    const title = s.item?.title ? `título: ${s.item.title}\n` : "";
    const chunk = `${title}${s.text}`.trim();
    if (!chunk) continue;

    if (out.length + chunk.length + 2 > maxChars) break;
    out += (out ? "\n\n---\n\n" : "") + chunk;
  }
  return out;
}

// ===== endpoint salud =====
app.get("/", (_req, res) => {
  res.status(200).send("ok");
});

// ===== endpoint chat (rag + gemini) =====
app.post("/chat", async (req, res) => {
  try {
    const message = (req.body?.message || "").toString().trim();
    if (!message) {
      return res.status(400).json({ error: "bad_request", message: "message es obligatorio" });
    }

    const context = retrieveContext(message);

    const system = `
eres el asistente post-venta oficial de ayúniko.
reglas:
- responde siempre en español, trato de tú
- usa solo el contexto cuando sea relevante
- si el contexto no contiene la respuesta, dilo claramente y propone qué dato necesitas
- no inventes dosis, ingredientes o promesas
- tono: claro, breve, amable (2–6 frases)
`;

    const prompt = `
contexto:
${context || "(sin contexto relevante encontrado)"}

pregunta del cliente:
${message}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: system,
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 512,
      },
    });

    const result = await model.generateContent(prompt);
    const reply = result?.response?.text?.() || "";

    return res.json({ reply });
  } catch (err) {
    console.error("error /chat:", err);
    return res.status(500).json({ error: "server_error", message: "error interno" });
  }
});

app.listen(PORT, () => {
  console.log(`backend listo en puerto ${PORT}`);
});
