# 🧠 Psikiyatrik Ön Değerlendirme Sistemi

> ⚠️ Bu sistem kesin tanı koymaz. Yalnızca eğitim ve araştırma amaçlıdır.

---

## 📁 Klasör Yapısı

```
project/
├── backend/
│   ├── main.py
│   ├── dataset.json     ← Bu dosya backend/ içinde olmalı!
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        └── App.jsx
```

---

## 🚀 Adım Adım Kurulum

### 1. Backend — Python 3.10 veya üstü gerekli

Terminal açın ve şu komutları çalıştırın:

```bash
# Proje klasörüne girin
cd project/backend

# Bağımlılıkları yükleyin
pip install fastapi uvicorn pydantic

# Sunucuyu başlatın
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**✅ Başarılı çıktı şöyle görünmeli:**
```
✅ Dataset yüklendi: 1000 kayıt
📊 TF-IDF vektörleri oluşturuluyor...
✅ Hazır.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**🔍 Backend çalışıyor mu kontrol et:**
Tarayıcıda şunu aç: http://localhost:8000/health
`{"status":"ok","dataset_size":1000}` görünmeli.

---

### 2. Frontend — Node.js 16 veya üstü gerekli

Yeni bir terminal açın:

```bash
# Frontend klasörüne girin
cd project/frontend

# Bağımlılıkları yükleyin (ilk seferde ~2 dakika sürebilir)
npm install

# Uygulamayı başlatın
npm start
```

Tarayıcı otomatik açılır: http://localhost:3000

---

## ❌ Sık Karşılaşılan Hatalar

### "Backend'e bağlanılamadı" hatası

**Sebep 1: Backend hiç başlamadı**
- `cd project/backend` komutunu verip `uvicorn main:app --reload --port 8000` çalıştırdığınızdan emin olun
- Terminal çıktısında hata var mı kontrol edin

**Sebep 2: dataset.json yanlış yerde**
- `dataset.json` dosyası `backend/` klasörü içinde olmalı
- `main.py` ile aynı klasörde olmalı
- Kontrol: `ls project/backend/` → hem `main.py` hem `dataset.json` görünmeli

**Sebep 3: Port 8000 kullanımda**
```bash
# Farklı port dene
uvicorn main:app --reload --port 8001
```
Sonra `App.jsx` içinde `const API = "http://localhost:8001"` olarak değiştirin (ilk satırlarda).

**Sebep 4: pip kurulu değil veya Python bulunamıyor**
```bash
# Python versiyonunu kontrol et
python --version      # veya python3 --version

# pip ile kurun
pip3 install fastapi uvicorn pydantic
# sonra
python3 -m uvicorn main:app --reload --port 8000
```

**Sebep 5: Windows'ta güvenlik duvarı**
- Windows Defender → "Erişime izin ver" seçin
- Veya şu komutla başlatın: `python -m uvicorn main:app --host 127.0.0.1 --port 8000`

### "npm install" çok uzun sürüyor
Normaldir, ilk kurulum 2-5 dakika sürebilir.

### Ses tanıma çalışmıyor
- Yalnızca Chrome ve Edge destekliyor (Firefox desteklemiyor)
- Tarayıcı mikrofon iznini sorarsa "İzin Ver" seçin
- HTTP üzerinde değil, HTTPS veya localhost üzerinde çalışmalı (localhost zaten çalışır)

---

## 🧪 Backend Test (opsiyonel)

Swagger UI: http://localhost:8000/docs
Buradan /predict endpointini doğrudan test edebilirsiniz.

---

## 📞 Acil Durum

- **ALO Psikiyatri:** 182
- **İntihar Önleme:** 182
