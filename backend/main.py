import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qdrant_client import QdrantClient
from openai import OpenAI
from agents import Agent, Runner

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mohsinmirzamaad.github.io"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

qdrant = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
)
openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

COLLECTION = "textbook_chunks"
EMBED_MODEL = "text-embedding-3-small"

textbook_agent = Agent(
    name="TextbookAssistant",
    model="gpt-4o-mini",
    instructions=(
        "You are a helpful assistant for a textbook on Physical AI and Humanoid Robotics. "
        "Answer questions using only the provided context from the textbook. "
        "If the answer is not in the context, say you don't know."
    ),
)


class ChatRequest(BaseModel):
    question: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(req: ChatRequest):
    # Embed the question
    embedding = openai_client.embeddings.create(
        model=EMBED_MODEL, input=req.question
    ).data[0].embedding

    # Retrieve top-5 chunks from Qdrant
    result = qdrant.query_points(
        collection_name=COLLECTION,
        query=embedding,
        limit=5,
    )
    context = "\n\n---\n\n".join(hit.payload["text"] for hit in result.points)

    # Run the agent with question + retrieved context
    prompt = f"Context from textbook:\n{context}\n\nQuestion: {req.question}"
    result = await Runner.run(textbook_agent, prompt)

    return {"answer": result.final_output}
