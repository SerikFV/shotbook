import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth_utils import get_current_user
import models

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# ─── MODELS ───
class EnhanceTextRequest(BaseModel):
    text: str

class MatchmakerRequest(BaseModel):
    query: str

class IdeasRequest(BaseModel):
    topic: str

class VisionRequest(BaseModel):
    image_url: str

async def call_groq(messages: list, model: str = "llama-3.3-70b-versatile", max_tokens: int = 1000):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY табылмады")
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.7
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)
        if response.status_code != 200:
            print("Groq Error:", response.text)
            raise HTTPException(status_code=response.status_code, detail="Groq API қателігі")
        data = response.json()
        return data["choices"][0]["message"]["content"]

@router.post("/enhance-text")
async def enhance_text(req: EnhanceTextRequest, current_user: models.User = Depends(get_current_user)):
    system_prompt = "Сен кәсіби копирайтерсің. Мобилографтың жазған қысқаша мәтінін алып, оны клиенттерге тартымды, әдемі, кәсіби стильде қайта жазып бер. Жазу стилі: сатуға бағытталған, эстетикалық. Мәтін тым ұзын болмасын. Тек дайын мәтінді ғана жаз, артық түсіндірмесіз."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.text}
    ]
    result = await call_groq(messages)
    return {"enhanced_text": result.strip()}

@router.post("/extract-filters")
async def extract_filters(req: MatchmakerRequest):
    system_prompt = """Сен іздеу жүйесінің көмекшісісің. Клиенттің сөзінен келесі фильтрлерді тап: 'city' (қала), 'max_price' (ең үлкен баға санмен), 'keywords' (сөздер тізімі).
Егер мәлімет болмаса null немесе бос массив қалдыр. 
Мысалы: 'Алматыдан 15 мыңға дрон керек' -> {"city": "Алматы", "max_price": 15000, "keywords": ["дрон", "drone"]}
Тек дұрыс JSON қайтар, басқа ештеңе жазба."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.query}
    ]
    result = await call_groq(messages)
    return {"filters_json": result.strip()}

@router.post("/generate-ideas")
async def generate_ideas(req: IdeasRequest, current_user: models.User = Depends(get_current_user)):
    system_prompt = "Сен мобилографтарға арналған креативті продюсерсің. Берілген тақырып бойынша Instagram/TikTok үшін 3 креативті Reels идеясын (сценарий, ракурс, әуен) Markdown форматта жазып бер. Әдемі, құрылымды болсын. МАҢЫЗДЫ: Қазақ тілінің грамматикасы мен стилистикасын қатаң сақта. Жалған, мағынасыз немесе қате сөздерді (мысалы 'тоқылдықтар') мүлдем қолданба. Тілің табиғи әрі түсінікті болсын."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Тақырып: {req.topic}"}
    ]
    result = await call_groq(messages)
    return {"ideas": result.strip()}

@router.post("/analyze-image")
async def analyze_image(req: VisionRequest, current_user: models.User = Depends(get_current_user)):
    system_prompt = "Бұл суреттен не көріп тұрсың? Мобилографтың портфолиосына сәйкес келетін 3-5 кілт сөзді (hashtag) қайтар (мыс: #үйленутойы, #репортаж, #тамақ, #эстетика). Тек хештегтерді үтірмен бөліп жаз."
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": system_prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": req.image_url
                    }
                }
            ]
        }
    ]
    # Use Llama 3.2 Vision Preview model for images
    result = await call_groq(messages, model="llama-3.2-90b-vision-preview")
    return {"tags": result.strip()}
