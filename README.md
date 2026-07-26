# Enterprise AI Code Reviewer Pro (Python Backend + Next.js Frontend)

An enterprise-grade automated code quality, security, and performance inspector built with Python Flask and Next.js.

---

## 🌟 Key Features

- **Multi-Language Analysis**: Supports JavaScript, TypeScript, Python, SQL, Java, C++, Go, and React.
- **CWE / OWASP Security Mapping**: Automatic identification of vulnerability standards (`CWE-95`, `CWE-89`, `CWE-798`).
- **Real-Time Code Diff Inspector**: Line-by-line red/green diff viewer showing original vs refactored code.
- **1-Click Apply Fix**: Instant button to update code in the editor with AI refactored code.
- **Export Audit Report**: 1-Click download for markdown audit reports (`.md`).
- **File Drag & Drop Upload**: Upload any source code file (`.js`, `.py`, `.ts`, `.sql`, `.java`, `.cpp`, `.tsx`).
- **Dual-Engine Architecture**: Uses OpenAI API when available with fallback to offline local static analyzer.

---

## 🚀 Quick Start Guide

### 1. Start Python Backend (Flask API)

```bash
# Navigate to project root
cd e:\AI\STUDY

# Ensure virtual environment is activated
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Run the Flask backend server (Port 5001)
python app.py
```

The Flask API will start at: `http://127.0.0.1:5001`
- Endpoint Health: `http://127.0.0.1:5001/api/health`
- Endpoint Review: `http://127.0.0.1:5001/api/review`

---

### 2. Start Next.js Frontend

```bash
# Open a new terminal and navigate to frontend
cd e:\AI\STUDY\frontend

# Install dependencies (if not installed)
npm install

# Run the Next.js development server (Port 3000)
npm run dev
```

Open `http://localhost:3000` in your web browser!
