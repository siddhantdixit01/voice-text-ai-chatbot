const chat = document.getElementById("chat");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");

let recognition = null;
let recognizing = false;
let stopResponse = false;
let synthUtter = null;

function appendBubble(role, text) {
  const el = document.createElement("div");
  el.className = role === "user" ? "text-right" : "text-left";
  el.innerHTML = `
    <div class="inline-block ${role === "user" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-100"} p-3 rounded-lg max-w-[80%]">
      <div class="font-medium text-sm">${role === "user" ? "You" : "Assistant"}</div>
      <div class="mt-1 text-sm whitespace-pre-wrap">${escapeHtml(text)}</div>
    </div>
  `;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function escapeHtml(str) {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  if (synthUtter) window.speechSynthesis.cancel();
  synthUtter = new SpeechSynthesisUtterance(text);
  synthUtter.rate = 1;
  synthUtter.pitch = 1;
  window.speechSynthesis.speak(synthUtter);
}

async function sendPrompt(text) {
  if (!text?.trim()) return;

  appendBubble("user", text);
  promptEl.value = "";

  stopResponse = true;
  await fetch("/api/stop", { method: "POST" });
  stopResponse = false;
  if (synthUtter) window.speechSynthesis.cancel();

  appendBubble("assistant", "");
  const assistantEl = chat.lastChild.querySelector("div:last-child");

  try {
    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      assistantEl.textContent = "Error: " + (errJson?.error || JSON.stringify(errJson));
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      if (stopResponse) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const chunk = decoder.decode(value);
      fullText += chunk;
      assistantEl.textContent = fullText;
    }

    if (!stopResponse) speakText(fullText);
  } catch (err) {
    console.error(err);
    assistantEl.textContent = "Network/server error: " + err.toString();
  }
}

sendBtn.addEventListener("click", () => sendPrompt(promptEl.value));
promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt(promptEl.value);
  }
});

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.textContent = "Mic (not supported)";
    micBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recognizing = true;
    micBtn.textContent = "Stop";
    micBtn.classList.replace("bg-indigo-500", "bg-red-500");
  };

  recognition.onend = () => {
    recognizing = false;
    micBtn.textContent = "Speak";
    micBtn.classList.replace("bg-red-500", "bg-indigo-500");
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interim = "";
    for (let i = 0; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) finalTranscript += r[0].transcript;
      else interim += r[0].transcript;
    }
    promptEl.value = finalTranscript + (interim ? "\n" + interim : "");
  };

  recognition.onerror = (err) => console.error("Speech recognition error", err);
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  recognizing ? recognition.stop() : recognition.start();
});

initSpeechRecognition();
