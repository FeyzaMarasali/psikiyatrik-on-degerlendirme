from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json, math, re, os
from collections import Counter
from pathlib import Path

app = FastAPI(title="Psikiyatrik Ön Değerlendirme API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dataset yükle (script'in bulunduğu dizinden oku) ──────────────────────
BASE_DIR = Path(__file__).parent
dataset_path = BASE_DIR / "dataset.json"

if not dataset_path.exists():
    raise FileNotFoundError(f"dataset.json bulunamadı: {dataset_path}")

with open(dataset_path, encoding="utf-8") as f:
    DATASET = json.load(f)

print(f"✅ Dataset yüklendi: {len(DATASET)} kayıt")

# ── Sorular ───────────────────────────────────────────────────────────────
QUESTIONS = [
    {"id": "Q1",  "text": "Son zamanlarda kendinizi nasıl hissediyorsunuz?",                         "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q2",  "text": "Eskiden keyif aldığınız aktivitelerden hâlâ keyif alabiliyor musunuz?",   "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q3",  "text": "Uyku düzeniniz nasıl?",                                                   "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q4",  "text": "İştahınızda değişiklik oldu mu?",                                        "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q5",  "text": "Kendinizi değersiz veya suçlu hissettiğiniz oluyor mu?",                 "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q6",  "text": "Kendinize zarar verme veya ölme düşünceleriniz oluyor mu?",              "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q7",  "text": "Günlük yaşamınızda yoğun kaygı yaşıyor musunuz?",                       "kategori": "Kaygı, Travma ve Sosyal İşlevsellik"},
    {"id": "Q8",  "text": "Panik atak geçiriyor musunuz?",                                          "kategori": "Kaygı, Travma ve Sosyal İşlevsellik"},
    {"id": "Q9",  "text": "İnsanların sizi yargıladığını düşünüyor musunuz?",                       "kategori": "Kaygı, Travma ve Sosyal İşlevsellik"},
    {"id": "Q10", "text": "Sosyal ortamlardan kaçınır mısınız?",                                    "kategori": "Kaygı, Travma ve Sosyal İşlevsellik"},
    {"id": "Q11", "text": "Aklınıza istemeden gelen rahatsız edici düşünceler oluyor mu?",          "kategori": "Bilişsel ve Algısal Değerlendirme"},
    {"id": "Q12", "text": "Bu düşünceleri azaltmak için tekrarlayan davranışlar yapıyor musunuz?",  "kategori": "Davranışsal Değerlendirme"},
    {"id": "Q13", "text": "Geçmişte yaşadığınız kötü olaylar sık sık aklınıza geliyor mu?",       "kategori": "Kaygı, Travma ve Sosyal İşlevsellik"},
    {"id": "Q14", "text": "Kabus görüyor musunuz?",                                                 "kategori": "Kaygı, Travma ve Sosyal İşlevsellik"},
    {"id": "Q15", "text": "Kendinizi zaman zaman aşırı enerjik hissediyor musunuz?",                "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q16", "text": "Çok az uyuyup yine de enerjik olduğunuz oluyor mu?",                    "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q17", "text": "Riskli kararlar alma eğiliminiz oluyor mu?",                             "kategori": "Davranışsal Değerlendirme"},
    {"id": "Q18", "text": "Başkalarının duymadığı sesleri duyuyor musunuz?",                        "kategori": "Bilişsel ve Algısal Değerlendirme"},
    {"id": "Q19", "text": "Başkalarının göremediği şeyleri görüyor musunuz?",                       "kategori": "Bilişsel ve Algısal Değerlendirme"},
    {"id": "Q20", "text": "İnsanların size zarar vermeye çalıştığını düşünüyor musunuz?",           "kategori": "Bilişsel ve Algısal Değerlendirme"},
    {"id": "Q21", "text": "Düşüncelerinizin kontrol edildiğini hissediyor musunuz?",                "kategori": "Bilişsel ve Algısal Değerlendirme"},
    {"id": "Q22", "text": "Duygularınız çok hızlı değişir mi?",                                    "kategori": "Duygusal ve Fizyolojik Durum"},
    {"id": "Q23", "text": "Yakın ilişkilerinizde yoğun iniş çıkışlar yaşar mısınız?",             "kategori": "Kaygı, Travma ve Sosyal İşlevsellik"},
    {"id": "Q24", "text": "Öfke patlamaları yaşar mısınız?",                                       "kategori": "Duygusal ve Fizyolojik Durum"},
]

# ── TF-IDF ────────────────────────────────────────────────────────────────
def tokenize(text: str):
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return [t for t in text.split() if len(t) > 1]

def build_tfidf_corpus():
    corpus = [d["clinical_interview_text"] for d in DATASET]
    df_counts: Counter = Counter()
    tf_list = []
    N = len(corpus)
    for doc in corpus:
        tokens = tokenize(doc)
        tf = Counter(tokens)
        total = max(len(tokens), 1)
        tf_norm = {t: c / total for t, c in tf.items()}
        tf_list.append(tf_norm)
        for t in set(tokens):
            df_counts[t] += 1
    idf = {t: math.log((N + 1) / (c + 1)) + 1 for t, c in df_counts.items()}
    tfidf_vecs = [{t: w * idf.get(t, 1) for t, w in tf.items()} for tf in tf_list]
    return tfidf_vecs, idf

print("📊 TF-IDF vektörleri oluşturuluyor...")
TFIDF_VECS, IDF = build_tfidf_corpus()
print("✅ Hazır.")

def query_tfidf(text: str):
    tokens = tokenize(text)
    total = max(len(tokens), 1)
    tf = Counter(tokens)
    return {t: (c / total) * IDF.get(t, 1) for t, c in tf.items()}

def cosine_sim(a: dict, b: dict) -> float:
    common = set(a) & set(b)
    if not common:
        return 0.0
    dot = sum(a[t] * b[t] for t in common)
    na = math.sqrt(sum(v**2 for v in a.values()))
    nb = math.sqrt(sum(v**2 for v in b.values()))
    return dot / (na * nb + 1e-10)

def demo_risk_score(demo: dict) -> float:
    score = 0.0
    if demo.get("sosyal_destek") == "Düşük":  score += 0.5
    if demo.get("travma") == "Evet":           score += 0.5
    if demo.get("aile_gecmis") == "Evet":      score += 0.3
    if demo.get("madde") not in ["Yok", "Sigara", None, ""]: score += 0.4
    if demo.get("onceki_tani") not in ["Yok", None, ""]:     score += 0.3
    return min(score, 2.0)

SEVERITY_LABELS = {1: "Hafif", 2: "Orta", 3: "Ağır", 4: "Çok Ağır"}
SEVERITY_COLORS = {1: "green", 2: "yellow", 3: "orange", 4: "red"}

# ── Modeller ──────────────────────────────────────────────────────────────
class Demographics(BaseModel):
    yas: int
    cinsiyet: str
    egitim: str
    meslek: str
    istihdam: str
    medeni: str
    sosyal_destek: str
    travma: str
    aile_gecmis: str
    onceki_tani: Optional[str] = "Yok"
    madde: Optional[str] = "Yok"

class PredictRequest(BaseModel):
    demographics: Demographics
    answers: dict[str, str]

# ── Endpointler ───────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "mesaj": "Psikiyatrik Ön Değerlendirme API çalışıyor"}

@app.get("/health")
def health():
    return {"status": "ok", "dataset_size": len(DATASET)}

@app.get("/questions")
def get_questions():
    return {"questions": QUESTIONS}

@app.post("/predict")
def predict(req: PredictRequest):
    interview_text = " ".join(req.answers.values())
    query_vec = query_tfidf(interview_text)
    risk_bonus = demo_risk_score(req.demographics.model_dump())

    scores = []
    for idx, (doc, vec) in enumerate(zip(DATASET, TFIDF_VECS)):
        sim = cosine_sim(query_vec, vec) + risk_bonus * 0.05
        scores.append((sim, idx))

    scores.sort(reverse=True)
    top_n = scores[:10]

    tani_scores: dict[str, float] = {}
    siddet_sum = 0.0
    siddet_w = 0.0

    for sim, idx in top_n:
        doc = DATASET[idx]
        t = doc["tani"]
        tani_scores[t] = tani_scores.get(t, 0) + sim
        siddet_sum += sim * doc["siddet"]
        siddet_w += sim

    best_tani = max(tani_scores, key=tani_scores.get)
    avg_siddet = round(siddet_sum / siddet_w) if siddet_w > 0 else 2
    avg_siddet = max(1, min(4, int(avg_siddet)))

    if risk_bonus >= 1.2 and avg_siddet < 3:
        avg_siddet = min(avg_siddet + 1, 4)

    benzer_vakalar = []
    seen: set = set()
    for sim, idx in top_n[:5]:
        doc = DATASET[idx]
        if doc["tani"] not in seen:
            benzer_vakalar.append({
                "id": doc["id"],
                "tani": doc["tani"],
                "siddet": doc["siddet"],
                "siddet_label": SEVERITY_LABELS[doc["siddet"]],
                "benzerlik": round(sim * 100, 1),
                "klinik_gorunum": doc.get("klinik_gorunum", "")[:200],
            })
            seen.add(doc["tani"])

    total_score = sum(tani_scores.values())
    return {
        "tani": best_tani,
        "siddet": avg_siddet,
        "siddet_label": SEVERITY_LABELS[avg_siddet],
        "siddet_color": SEVERITY_COLORS[avg_siddet],
        "benzerlik_skoru": round(scores[0][0] * 100, 1),
        "tani_dagilimi": {
            k: round(v / total_score * 100, 1)
            for k, v in sorted(tani_scores.items(), key=lambda x: -x[1])
        },
        "benzer_vakalar": benzer_vakalar,
        "risk_faktoru": round(risk_bonus, 2),
        "uyari": "Bu sonuç kesin tanı değildir. Yalnızca eğitim ve araştırma amaçlıdır. Lütfen bir psikiyatrist veya klinisyene başvurunuz.",
    }
