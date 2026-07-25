from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
import os
from dotenv import load_dotenv

# --------------------------
# Read PDF
# --------------------------

reader = PdfReader("company_handbook_rag_sample.pdf")

text = ""

for page in reader.pages:
    text += page.extract_text()

print("PDF Content:\n")
# print(text)

# --------------------------
# Split into chunks
# --------------------------

chunks = text.split("\n")

chunks = [c.strip() for c in chunks if c.strip()]

print("\nChunks:")
# print(chunks)

# --------------------------
# Load Embedding Model
# --------------------------

model = SentenceTransformer("all-MiniLM-L6-v2")

embeddings = model.encode(chunks).tolist()

# --------------------------
# Create Vector Database
# --------------------------

client = chromadb.Client()

collection = client.create_collection("company")

collection.add(
    documents=chunks,
    embeddings=embeddings,
    ids=[str(i) for i in range(len(chunks))]
)

# --------------------------
# User Question
# --------------------------

question = input("\nAsk a question: ")

query_embedding = model.encode(question).tolist()

# --------------------------
# Semantic Search
# --------------------------

results = collection.query(
    query_embeddings=[query_embedding],
    n_results=1
)

context = results["documents"][0][0]

print("\nRetrieved Context:")
# print(context)

# --------------------------
# Send to GPT
# --------------------------

# Load environment variables from .env file
load_dotenv()

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.responses.create(
    model="gpt-4.1-mini",
    input=f"""
Context:
{context}

Question:
{question}

Answer only from the context.
"""
)

print("\nAI Answer:\n")
print(response.output_text)