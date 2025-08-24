import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash";

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

let controller = null;

function extractTextFromResponse(json) {
  const results = [];
  function walk(obj) {
    if (!obj) return;
    if (Array.isArray(obj)) return obj.forEach(walk);
    if (typeof obj === "object") {
      for (const k in obj) {
        const v = obj[k];
        if (k === "text" && typeof v === "string") results.push(v);
        else walk(v);
      }
    }
  }
  walk(json);
  return results.join("\n").trim() || null;
}

app.post("/api/generate", async (req, res) => {
  try {
    const userText = req.body.prompt;
    if (!userText || typeof userText !== "string")
      return res.status(400).json({ error: "prompt (string) required in body" });

    controller = new AbortController();

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are REV, Revolt Motors' official assistant. 
                    Answer ONLY about Revolt Motors related questions. 
                    If asked about unrelated topics, politely refuse and redirect the user to Revolt topics.`
            }
          ]
        },
        {
          role: "user",
          parts: [{ text: userText }]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 800
      }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const json = await r.json();

    if (!r.ok) {
      console.error("Generative API error:", json);
      return res.status(500).json({ error: "Model request failed", details: json });
    }

    const text = extractTextFromResponse(json) || "(no response)";
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for (let i = 0; i < text.length; i += 20) {
      if (controller.signal.aborted) break;
      res.write(text.slice(i, i + 20));
      await new Promise(r => setTimeout(r, 30));
    }

    res.end();
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("✅ Request aborted by user");
      return res.end();
    }
    console.error("Server error:", err);
    return res.status(500).json({ error: "internal_error", details: err.toString() });
  }
});

app.post("/api/stop", (req, res) => {
  if (controller) {
    controller.abort();
    controller = null;
  }
  res.json({ stopped: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
