import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
from openai import OpenAI
from dotenv import load_dotenv

# --------------------------
# Initialization
# --------------------------
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for Next.js frontend

# Initialize OpenAI client safely
def is_valid_key(key):
    return key and not key.startswith("your_openai_api_key") and key != "sk-placeholder"

api_key = os.getenv("OPENAI_API_KEY")
if not is_valid_key(api_key):
    print("⚠️ WARNING: Real OPENAI_API_KEY not set in .env. Running in Local RAG Context Mode.")
    openai_client = None
else:
    openai_client = OpenAI(api_key=api_key)

def get_openai_client():
    """Retrieve or dynamically initialize the OpenAI client."""
    global openai_client
    key = os.getenv("OPENAI_API_KEY")
    if is_valid_key(key):
        try:
            return OpenAI(api_key=key)
        except Exception:
            return None
    return None

# Load the embedding model once
print("Loading embedding model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded.")

# Setup ChromaDB client
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("hospital_handbook")

# --------------------------
# Data Loading and Indexing (run once at startup)
# --------------------------
def setup_vector_db():
    """Reads a PDF, chunks the text, and stores embeddings in ChromaDB."""
    if collection.count() > 0:
        print("Vector database already contains data. Skipping setup.")
        return

    print("Reading PDF and setting up vector database...")
    reader = PdfReader("company_handbook_rag_sample.pdf")
    text = "".join(page.extract_text() for page in reader.pages)
    chunks = [c.strip() for c in text.split("\n") if c.strip()]

    embeddings = embedding_model.encode(chunks).tolist()
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[str(i) for i in range(len(chunks))]
    )
    print("Vector database setup complete.")

setup_vector_db()

# --------------------------
# Flask API Routes
# --------------------------
@app.route('/')
def index():
    """API info endpoint."""
    return jsonify({
        "status": "online",
        "service": "Hospital Helper RAG API (Python Flask)",
        "endpoints": ["/api/health", "/api/ask"]
    })

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint for frontend."""
    return jsonify({
        "status": "healthy",
        "documents_indexed": collection.count()
    })

@app.route('/ask', methods=['POST'])
@app.route('/api/ask', methods=['POST'])
def ask():
    """Handle a user's question with semantic search and optional LLM synthesis."""
    data = request.get_json(silent=True) or {}
    question = data.get('question')
    if not question:
        return jsonify({"error": "No question provided"}), 400

    try:
        # 1. Semantic Search via SentenceTransformer & ChromaDB
        query_embedding = embedding_model.encode(question).tolist()
        results = collection.query(query_embeddings=[query_embedding], n_results=1)
        
        context = ""
        if results and "documents" in results and results["documents"] and results["documents"][0]:
            context = results["documents"][0][0]

        # 2. Try OpenAI completion if key is provided
        client = get_openai_client()
        if client:
            try:
                prompt = f"Context:\n{context}\n\nQuestion:\n{question}\n\nAnswer only from the context provided. Be helpful and professional."
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}]
                )
                answer = response.choices[0].message.content
                return jsonify({
                    "answer": answer,
                    "context": context
                })
            except Exception as llm_err:
                print(f"OpenAI API call failed: {llm_err}. Falling back to retrieved RAG context.")

        # Fallback / Local RAG mode (when no OpenAI key or invalid key)
        fallback_answer = f"📄 [RAG Answer from Handbook]:\n\n{context}\n\n💡 (Note: Add a valid OpenAI API key in .env to enable GPT-3.5 response synthesis)."
        return jsonify({
            "answer": fallback_answer,
            "context": context
        })

    except Exception as e:
        print(f"Error processing query: {e}")
        return jsonify({
            "error": "Failed to process question.",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)

