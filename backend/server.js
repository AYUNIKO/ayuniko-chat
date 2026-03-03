/**
 * server.js (backend) - gemini + rag locale dai 4 json
 * requisiti env su vercel (backend):
 * - GEMINI_API_KEY = chiave google ai studio
 * opzionali:
 * - PORT
 * - API_PAYLOAD_MAX_SIZE (es: 7mb)
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(
  express.json({
    limit: process?.env?.API_PAYLOAD_MAX_SIZE || '7mb',
  })
);

// rate limit base
app.set('trust proxy', 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'too_many_requests',
      message: 'has superado el límite de peticiones, inténtalo más tarde.',
    },
  })
);

const PORT = process?.env?.PORT || 5000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('manca la variabile di ambiente GEMINI_API_KEY');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ========= carico i 4 json dalla cartella backend/ (come li hai caricati tu) =========
function loadJsonArray(fileName) {
  const fullPath = path.join(__dirname, fileName);
  if (!fs.existsSync(fullPath)) {
    console.warn(`file non trovato: ${fileName}`);
    return [];
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const parsed = JSON.parse(raw);

  // caso 1: il file è già un array
  if (Array.isArray(parsed)) return parsed;

  // caso 2: formato kb_* che ti ho generato io: { items: [...] }
  if (parsed && Array.isArray(parsed.items)) return parsed.items;

  // caso 3: fallback (se un domani cambia struttura)
  return [];
}

const KB_SAFETY = loadJsonArray('kb_safety_es.json');
const KB_POSTVENTA = loadJsonArray('kb_postventa_es.json');
const KB_PRODUCTS = loadJsonArray('kb_products_es.json');
const KB_GUIDE = loadJsonArray('kb_guide_es.json');

// ordine = priorità (sistema c): safety > postventa > products > guide
const KB_ALL = [
  ...KB_SAFETY.map((x) => ({ ...x, __lane: 'safety', __priority: 100 })),
  ...KB_POSTVENTA.map((x) => ({ ...x, __lane: 'postventa', __priority: 90 })),
  ...KB_PRODUCTS.map((x) => ({ ...x, __lane: 'products', __priority: 80 })),
  ...KB_GUIDE.map((x) => ({ ...x, __lane: 'guide', __priority: 60 })),
  
];

console.log('kb sizes', {
  safety: KB_SAFETY.length,
  postventa: KB_POSTVENTA.length,
  products: KB_PRODUCTS.length,
  guide: KB_GUIDE.length,
});

function getItemText(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item.content === 'string') return item.content;
  if (typeof item.text === 'string') return item.text;
  return '';
}

function tokenize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function score(tokens, text) {
  const t = (text || '').toLowerCase();
  let s = 0;
  for (const tok of tokens) {
    const hits = t.split(tok).length - 1;
    s += hits;
  }
  return s;
}

// routing leggero: sceglie la corsia migliore prima del retrieval
function routeLane(query) {
  const q = (query || '').toLowerCase();

  const safetyHints = [
    'dolor',
    'dolor de',
    'mal',
    'náusea',
    'diarrea',
    'estreñimiento',
    'efectos',
    'efecto secundario',
    'embarazo',
    'embarazada',
    'lactancia',
    'medicación',
    'medicamento',
    'diabetes',
    'hipertensión',
    'contraindic',
    'alerg',
  ];
  if (safetyHints.some((k) => q.includes(k))) return 'safety';

  const postventaHints = [
    'cómo tomar',
    'como tomar',
    'toma',
    'dosis',
    'pastillas',
    'protocolo',
    'horario',
    'antes de',
    'después de',
    'hambre',
    'ansiedad',
    'no adelgazo',
    'no bajo',
    'primeros días',
    'me pasa',
    'me siento',
    'bebe',
    'preparar',
  ];
  if (postventaHints.some((k) => q.includes(k))) return 'postventa';

  const productHints = ['ingrediente', 'contiene', 'glucoman', 'griffonia', 'mate', 'bromel', 'vitamina'];
  if (productHints.some((k) => q.includes(k))) return 'products';

  return 'guide';
}

function retrieveContext(query, { topK = 6, maxChars = 6500 } = {}) {
  const tokens = tokenize(query);
  if (!tokens.length) return { context: '', hits: [] };

  const primaryLane = routeLane(query);
  const laneOrder =
    primaryLane === 'safety'
      ? ['safety', 'postventa', 'products', 'guide']
      : primaryLane === 'postventa'
      ? ['postventa', 'safety', 'products', 'guide']
      : primaryLane === 'products'
      ? ['products', 'postventa', 'safety', 'guide']
      : ['guide', 'postventa', 'products', 'safety'];

  let selected = [];

  for (const lane of laneOrder) {
    const pool = KB_ALL.filter((x) => x.__lane === lane);

    const ranked = pool
      .map((item) => {
        const text = getItemText(item);
        const base = score(tokens, text);
        // piccolo boost per corsie più importanti
        const boosted = base + (item.__priority || 0) * 0.0001;
        return { item, text, s: boosted };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, topK);

    if (ranked.length) {
      selected = ranked;
      break;
    }
  }

  let out = '';
  const hits = [];

  for (const r of selected) {
    const title = r.item?.title ? `título: ${r.item.title}\n` : '';
    const source =
      r.item?.source?.file || r.item?.source?.pages
        ? `fuente: ${r.item?.source?.file || ''} ${r.item?.source?.pages ? `(pág. ${r.item.source.pages})` : ''}\n`
        : '';
    const chunk = `${title}${source}${r.text}`.trim();
    if (!chunk) continue;

    if (out.length + chunk.length + 2 > maxChars) break;
    out += (out ? '\n\n---\n\n' : '') + chunk;

    hits.push({
      id: r.item?.id,
      title: r.item?.title,
      lane: r.item?.__lane,
      source: r.item?.source,
    });
  }

  return { context: out, hits };
}

// ===== health check =====
app.get('/', (_req, res) => res.status(200).send('ok'));
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// ===== endpoint chat =====
app.post('/chat', async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim();
    if (!message) return res.status(400).json({ error: 'bad_request', message: 'message è obbligatorio' });

    const { context } = retrieveContext(message);

const system = `
Eres el asistente post-venta oficial de AYÚNIKO.
Tu rol es ayudar exclusivamente a clientes que ya han comprado uno o más productos AYÚNIKO.

IDIOMA Y TONO
- Responde siempre en español y con trato de tú.
- Tono profesional, calmado, natural y tranquilizador.
- No uses tono comercial agresivo.
- Puedes usar como máximo 1 emoji 😊 cuando sea apropiado.
- No uses formato markdown ni asteriscos (**). Texto limpio.

SEGURIDAD
- No inventes información.
- No hagas diagnósticos médicos.
- No sustituyes a un médico.
- Si hay síntomas fuertes, alergias, embarazo/lactancia o medicación relevante, prioriza seguridad y sugiere consultar a un profesional.

FUENTE ÚNICA DE VERDAD (OBLIGATORIO)
- Usa exclusivamente el CONTEXTO recuperado por el sistema (knowledge base).
- Si el contexto no contiene la respuesta o el dato exacto, dilo claramente y pide el dato que falta.
- No añadas dosis, protocolos o promesas si no están en el contexto.

IDENTIFICACIÓN DE PRODUCTO
- Antes de dar instrucciones específicas, identifica el producto.
- Excepción: si el producto ya es claramente identificable por el mensaje del usuario o por el contexto, NO preguntes de nuevo.

PRIMER MENSAJE DEL CHAT (OBLIGATORIO SI EL PRODUCTO NO ESTÁ CLARO)
- Si es el primer mensaje y el producto no está claro, responde:
  "Hola, gracias por tu mensaje 😊
   Para poder ayudarte correctamente, ¿podrías decirme qué productos AYÚNIKO has comprado?"
- No des instrucciones antes de identificar el producto.

TÉRMINOS GENÉRICOS (OBLIGATORIO SI NO ESTÁ CLARO)
- Si el usuario usa términos genéricos (p. ej. “pastillas”, “sobres”) y el producto no está claro, pide confirmación:
  "Gracias 😊 Solo para confirmarlo bien:
   ¿son pastillas (COME o ESPERA) o sobres?
   Si son sobres, ¿de qué color: amarillos (DISFRUTA), azules (BEBE) o rojos (RECARGA)?"
- No des instrucciones hasta confirmarlo, salvo que el contexto ya lo haga inequívoco.

INTERPRETACIÓN PRÁCTICA
- Cuando el usuario dice “pastillas”, interpreta que se refiere a AYÚNIKO COME y AYÚNIKO ESPERA.

REGLA CRÍTICA: RESULTADOS INSUFICIENTES / HAMBRE / NO BAJA PESO
Si el usuario dice que no nota resultados, sigue con hambre o no baja de peso, sigue SIEMPRE este orden:
PASO 1 — verificar protocolo exacto (COME/ESPERA: cuántas, cuántas veces, horarios) y corregir si no coincide con el contexto.
PASO 2 — explicar el principio fundamental (equilibrio entre ingesta calórica, gasto energético y equilibrio glucémico) según el contexto.
PASO 3 — evaluar alimentación (azúcares y carbohidratos) solo después de que el protocolo sea correcto, según el contexto.

ESTRUCTURA Y NO REDUNDANCIA
- Responde a lo que te preguntan.
- Estructura: 1 respuesta directa + 1 breve explicación basada en contexto + 1 siguiente paso o pregunta concreta.
- No copies grandes bloques del contexto.

FOLLOW-UP (OBLIGATORIO CUANDO DES INSTRUCCIONES O CORRECCIONES)
- Cierra con: "Cuéntame dentro de unos días cómo te va, así puedo ayudarte mejor según tu evolución."

RESEÑA (SOLO SI EXPERIENCIA POSITIVA)
- Solo si el cliente dice que le va bien, tiene menos hambre o está mejorando:
  "Me alegra mucho saberlo 😊
   Si lo deseas, tu experiencia puede ayudar a otras personas. Puedes dejar una reseña aquí:
   https://g.page/r/CcQdXydtXwLPEBM/review"

ESCALADO A HUMANO (WHATSAPP)
- Si el cliente pide soporte humano, duda compleja o ayuda personalizada, añade al final:
  "Si lo prefieres, también puedes hablar directamente con una persona aquí:
   https://api.whatsapp.com/send/?phone=34621364947&text=Hola%2C+tengo+una+pregunta+y+me+gustaría+hablar+con+una+persona&type=phone_number&app_absent=0"

CAMBIO DE DIRECCIÓN / DATOS DEL PEDIDO
- Si el cliente pide cambiar dirección, teléfono, nombre o datos del pedido:
  - No preguntes por productos.
  - Responde máximo 3 frases.
  - Indica que escriba por WhatsApp e incluye el enlace:
    "Para modificar los datos del pedido, escríbenos lo antes posible por WhatsApp:
     https://api.whatsapp.com/send/?phone=34621364947&text=Hola%2C+tengo+una+pregunta+y+me+gustaría+hablar+con+una+persona&type=phone_number&app_absent=0
     Así lo gestionamos al momento."
`;

const prompt = `CONTEXTO (knowledge base):
${context || '(sin contexto relevante)'}

MENSAJE DEL CLIENTE:
${message}

INSTRUCCIÓN:
Responde siguiendo estrictamente las reglas del sistema y usando solo el contexto cuando aportes datos o instrucciones.
`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: system,
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    });

    const result = await model.generateContent(prompt);
    const reply = result?.response?.text?.() || '';

    return res.json({ reply });
  } catch (err) {
    console.error('errore /chat:', err);
    return res.status(500).json({ error: 'server_error', message: 'errore interno' });
  }
});

app.listen(PORT, () => {
  console.log(`backend attivo sulla porta ${PORT}`);
});
