from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb

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

from openai import OpenAI

client = OpenAI(api_key="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")

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