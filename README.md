## Revolt Motors Chatbot (Gemini API + Voice + TTS)

This is a **voice-enabled chatbot** powered by Google’s Gemini API.
It answers **only Revolt Motors related questions**, politely refusing any unrelated queries.

The chatbot supports:
- Text + Voice input
- Text-to-Speech responses
- Interrupting the AI mid-response and asking a new question

### Features
- #### Frontend (HTML + TailwindCSS + JavaScript)
  - Clean chat UI with message bubbles
  - Voice input via browser microphone
  - Text-to-Speech output
  - Interrupt button to stop speaking and accept new query

- ### Backend (Node.js + Express)
  - Uses Gemini API (gemini-1.5-flash)
  - Restricts responses to Revolt Motors domain
  - Handles interruptions gracefully

### Setup & Installation
1. Select folder
```
cd revolt-chatbot
```
2. Install Dependencies
```
npm install
```
3. Setup Environment Variables
Create a .env file in the project root:
```
GEMINI_API_KEY=your_google_api_key_here
```
4. Start the Server
```
npm start
```

**Server will run at:**
```
http://localhost:3000
```

Thankyou!
