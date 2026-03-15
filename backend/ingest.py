import os
import re
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

load_dotenv()

DOCS_DIR = Path(__file__).parent.parent / "docs" / "docs"
COLLECTION = "textbook_chunks"
CHUNK_SIZE = 500   # approx words
CHUNK_OVERLAP = 50
EMBED_MODEL = "text-embedding-3-small"
VECTOR_SIZE = 1536  # output dim for text-embedding-3-small

openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
qdrant = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
)


def strip_frontmatter(text: str) -> str:
    return re.sub(r"^---\n.*?\n---\n", "", text, flags=re.DOTALL)


def strip_mdx_imports(text: str) -> str:
    text = re.sub(r"^(import|export)\s+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"<[A-Z][^>]*/>", "", text)
    text = re.sub(r"<[A-Z][^>]*>.*?</[A-Z][^>]*>", "", text, flags=re.DOTALL)
    return text


def split_chunks(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        chunks.append(" ".join(words[start : start + size]))
        start += size - overlap
    return [c for c in chunks if c.strip()]


def embed_batch(texts: list[str]) -> list[list[float]]:
    response = openai_client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [item.embedding for item in response.data]


def main():
    md_files = list(DOCS_DIR.rglob("*.md")) + list(DOCS_DIR.rglob("*.mdx"))
    print(f"Found {len(md_files)} doc files")

    all_chunks = []
    for path in md_files:
        raw = path.read_text(encoding="utf-8")
        text = strip_frontmatter(raw)
        text = strip_mdx_imports(text)
        chunks = split_chunks(text)
        rel = str(path.relative_to(DOCS_DIR))
        for i, chunk in enumerate(chunks):
            all_chunks.append({"source_file": rel, "chunk_index": i, "text": chunk})

    print(f"Total chunks: {len(all_chunks)}")

    if qdrant.collection_exists(COLLECTION):
        qdrant.delete_collection(COLLECTION)
    qdrant.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )

    # Embed in batches of 100 (OpenAI limit is 2048 inputs, but 100 keeps payloads small)
    batch_size = 100
    points = []
    for start in range(0, len(all_chunks), batch_size):
        batch = all_chunks[start : start + batch_size]
        vectors = embed_batch([c["text"] for c in batch])
        for i, (chunk, vector) in enumerate(zip(batch, vectors)):
            points.append(PointStruct(id=start + i, vector=vector, payload=chunk))
        print(f"  Embedded {min(start + batch_size, len(all_chunks))}/{len(all_chunks)}")

    # Upsert in batches
    for start in range(0, len(points), batch_size):
        qdrant.upsert(collection_name=COLLECTION, points=points[start : start + batch_size])
        print(f"  Upserted {min(start + batch_size, len(points))}/{len(points)}")

    print("Done")


if __name__ == "__main__":
    main()
