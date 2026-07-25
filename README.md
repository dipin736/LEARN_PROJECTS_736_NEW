# RAG Hospital Helper (Python Backend + Next.js Frontend)

This application is decoupled into:
- 🐍 **Python Flask Backend**: Handles document indexing, vector embeddings (SentenceTransformer + ChromaDB), and LLM response generation via OpenAI API.
- ⚡ **Next.js Frontend**: A modern glassmorphic chat interface with real-time status indicators, interactive prompt chips, and RAG PDF context inspection.

---

## 🚀 Quick Start Guide

### 1. Start Python Backend (Flask API)

```bash
# Navigate to project root
cd e:\AI\RAG

# Ensure virtual environment is activated
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Set your OpenAI API key in .env
# OPENAI_API_KEY=sk-...

# Run the Flask backend server (Port 5001)
python app.py
```

The Python API will start at: `http://127.0.0.1:5001`
- Endpoint Health: `http://127.0.0.1:5001/api/health`
- Endpoint Ask RAG: `http://127.0.0.1:5001/api/ask`

---

### 2. Start Next.js Frontend

```bash
# Open a new terminal and navigate to frontend
cd e:\AI\RAG\frontend

# Install dependencies
npm install

# Run the Next.js development server (Port 3000)
npm run dev
```

Open `http://localhost:3000` in your web browser!

---

## 🌟 Architecture Highlights

1. **Decoupled API & UI**:
   - Next.js fetches `/api/ask` from Python Flask on `http://127.0.0.1:5001`.
   - Flask CORS enabled for cross-origin local requests.

2. **RAG Context Transparency**:
   - Assistant answers include a **"View RAG Context Chunk"** toggle button.
   - Users can inspect the exact PDF paragraph retrieved by ChromaDB.

3. **Status Monitoring**:
   - Real-time pulse indicator in the header checks Python API status every 15s.

4. **Responsive Modern Design**:
   - Built with Next.js App Router, CSS variables, glassmorphic card design, and micro-animations.
