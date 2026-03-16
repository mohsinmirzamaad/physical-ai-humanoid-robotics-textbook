import os
from datetime import datetime, timedelta, timezone

import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
import jwt as pyjwt
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from openai import OpenAI
from agents import Agent, Runner

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mohsinmirzamaad.github.io"],
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

qdrant = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
)
openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

COLLECTION = "textbook_chunks"
EMBED_MODEL = "text-embedding-3-small"
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

bearer_scheme = HTTPBearer(auto_error=False)

textbook_agent = Agent(
    name="TextbookAssistant",
    model="gpt-4o-mini",
    instructions=(
        "You are a helpful assistant for a textbook on Physical AI and Humanoid Robotics. "
        "Answer questions using only the provided context from the textbook. "
        "If the answer is not in the context, say you don't know."
    ),
)

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def get_db_conn():
    return psycopg2.connect(os.environ["NEON_DATABASE_URL"])


def ensure_users_table():
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    software_level TEXT NOT NULL DEFAULT 'beginner',
                    jetson_access BOOLEAN NOT NULL DEFAULT false,
                    rtx_gpu_access BOOLEAN NOT NULL DEFAULT false,
                    created_at TIMESTAMPTZ DEFAULT now()
                )
            """)
        conn.commit()
    finally:
        conn.close()


ensure_users_table()

# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_token(user_id: str, email: str, name: str, software_level: str,
                 jetson_access: bool, rtx_gpu_access: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "software_level": software_level,
        "jetson_access": jetson_access,
        "rtx_gpu_access": rtx_gpu_access,
        "exp": expire,
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(credentials.credentials)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    software_level: str  # "beginner" | "intermediate" | "advanced"
    jetson_access: bool
    rtx_gpu_access: bool


class SigninRequest(BaseModel):
    email: str
    password: str


class PersonalizeRequest(BaseModel):
    chapter_slug: str
    token: str


class TranslateRequest(BaseModel):
    content: str

# ---------------------------------------------------------------------------
# Existing endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(req: ChatRequest):
    embedding = openai_client.embeddings.create(
        model=EMBED_MODEL, input=req.question
    ).data[0].embedding

    result = qdrant.query_points(
        collection_name=COLLECTION,
        query=embedding,
        limit=5,
    )
    context = "\n\n---\n\n".join(hit.payload["text"] for hit in result.points)

    prompt = f"Context from textbook:\n{context}\n\nQuestion: {req.question}"
    result = await Runner.run(textbook_agent, prompt)

    return {"answer": result.final_output}

# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.post("/auth/signup")
def signup(req: SignupRequest):
    hashed = hash_password(req.password)
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, hashed_password, software_level, jetson_access, rtx_gpu_access)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (req.name, req.email, hashed, req.software_level, req.jetson_access, req.rtx_gpu_access),
            )
            user_id = str(cur.fetchone()[0])
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    finally:
        conn.close()

    token = create_token(user_id, req.email, req.name, req.software_level,
                         req.jetson_access, req.rtx_gpu_access)
    return {"token": token}


@app.post("/auth/signin")
def signin(req: SigninRequest):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, hashed_password, software_level, jetson_access, rtx_gpu_access FROM users WHERE email = %s",
                (req.email,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row or not verify_password(req.password, row[2]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, name, _, software_level, jetson_access, rtx_gpu_access = row
    token = create_token(str(user_id), req.email, name, software_level,
                         jetson_access, rtx_gpu_access)
    return {"token": token}


@app.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["sub"],
        "email": user["email"],
        "name": user["name"],
        "software_level": user["software_level"],
        "jetson_access": user["jetson_access"],
        "rtx_gpu_access": user["rtx_gpu_access"],
    }

# ---------------------------------------------------------------------------
# Personalize endpoint
# ---------------------------------------------------------------------------

@app.post("/personalize")
async def personalize(req: PersonalizeRequest):
    user = decode_token(req.token)

    scroll_result, _ = qdrant.scroll(
        collection_name=COLLECTION,
        scroll_filter=Filter(
            must=[FieldCondition(key="chapter_slug", match=MatchValue(value=req.chapter_slug))]
        ),
        limit=20,
        with_payload=True,
    )
    chunks = sorted(scroll_result, key=lambda p: p.payload.get("chunk_index", 0))[:3]
    if not chunks:
        raise HTTPException(status_code=404, detail="No content found for this chapter")

    original = "\n\n".join(c.payload["text"] for c in chunks)
    level = user.get("software_level", "beginner")
    hw = [h for h, v in [("NVIDIA Jetson", user.get("jetson_access")), ("RTX GPU", user.get("rtx_gpu_access"))] if v]
    hw_str = ", ".join(hw) or "no specialized hardware"
    prompt = (
        f"Rewrite this textbook chapter intro for a {level} student with {hw_str}. "
        f"Keep it under 300 words:\n\n{original}"
    )
    resp = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return {"personalized": resp.choices[0].message.content}

# ---------------------------------------------------------------------------
# Translate endpoint
# ---------------------------------------------------------------------------

@app.post("/translate")
async def translate_to_urdu(req: TranslateRequest):
    resp = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"Translate the following textbook content to Urdu. Preserve headings and structure:\n\n{req.content}",
        }],
    )
    return {"translated": resp.choices[0].message.content}
