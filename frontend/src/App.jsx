import { useState, useEffect, useRef, useCallback } from "react";

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:       "#0D1117",
  surface:  "#161B22",
  panel:    "#1C2128",
  border:   "#30363D",
  accent:   "#3D8EF0",
  accentHover: "#5AA3F5",
  text:     "#E6EDF3",
  muted:    "#8B949E",
  green:    "#3FB950",
  yellow:   "#D29922",
  orange:   "#DB6D28",
  red:      "#F85149",
  purple:   "#BC8CFF",
};

const katColors = {
  "Duygusal ve Fizyolojik Durum":         { bg: "#0D2818", border: "#3FB950", text: "#3FB950" },
  "Kaygı, Travma ve Sosyal İşlevsellik":  { bg: "#2B1A0A", border: "#D29922", text: "#D29922" },
  "Bilişsel ve Algısal Değerlendirme":    { bg: "#0A1929", border: "#3D8EF0", text: "#3D8EF0" },
  "Davranışsal Değerlendirme":            { bg: "#1E0D2B", border: "#BC8CFF", text: "#BC8CFF" },
};

const SEVERITY_META = {
  1: { label: "Hafif",     color: C.green,  bg: "#0D2818" },
  2: { label: "Orta",      color: C.yellow, bg: "#2B1F0A" },
  3: { label: "Ağır",      color: C.orange, bg: "#2B1108" },
  4: { label: "Çok Ağır",  color: C.red,    bg: "#2B0A08" },
};

const API = "http://localhost:8000";

// ── Global styles injected once ────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body {
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  * { scrollbar-width: thin; scrollbar-color: ${C.border} transparent; }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(61,142,240,0.4); }
    50%      { box-shadow: 0 0 0 12px rgba(61,142,240,0); }
  }
  @keyframes ripple {
    0%   { transform:scale(1);   opacity:1; }
    100% { transform:scale(2.5); opacity:0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .fade-up { animation: fadeUp 0.4s ease both; }
`;

function injectStyles() {
  if (document.getElementById("psy-global")) return;
  const s = document.createElement("style");
  s.id = "psy-global";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

// ── Tiny UI components ─────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = "primary", style = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 22px", borderRadius: 8, border: "none",
    fontWeight: 600, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .18s", opacity: disabled ? 0.45 : 1, ...style,
  };
  const styles = {
    primary: { background: C.accent, color: "#fff" },
    ghost:   { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    danger:  { background: C.red, color: "#fff" },
  };
  return (
    <button style={{ ...base, ...styles[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 24, ...style,
    }}>
      {children}
    </div>
  );
}

function Progress({ value, max }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        flex: 1, height: 4, background: C.border, borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`,
          transition: "width .4s ease",
        }} />
      </div>
      <span style={{ fontSize: 12, color: C.muted, minWidth: 40 }}>{value}/{max}</span>
    </div>
  );
}

function Tag({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: .4,
      color, background: bg, border: `1px solid ${color}`,
    }}>
      {label}
    </span>
  );
}

// ── useSpeech hook ─────────────────────────────────────────────────────────
function useSpeech({ onResult }) {
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  // onResult her render'da güncel kalır, stale closure olmaz
  useEffect(() => { onResultRef.current = onResult; });

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "tr-TR";
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      const isFinal = e.results[e.results.length - 1].isFinal;
      onResultRef.current(transcript, isFinal);
    };
    r.onend = () => setListening(false);
    r.onerror = (err) => { console.warn("Speech error:", err); setListening(false); };
    recRef.current = r;
  }, []);

  const start = useCallback(() => {
    try { recRef.current?.start(); setListening(true); }
    catch (e) { console.warn("Mic start error:", e); }
  }, []);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch (e) {}
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE 1 — HomePage
// ══════════════════════════════════════════════════════════════════════════
function HomePage({ onStart }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(61,142,240,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="fade-up" style={{ maxWidth: 680, width: "100%", textAlign: "center" }}>
        {/* Logo mark */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, margin: "0 auto 28px",
          boxShadow: `0 0 40px rgba(61,142,240,0.3)`,
        }}>
          🧠
        </div>

        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 3,
          color: C.accent, textTransform: "uppercase", marginBottom: 16,
        }}>
          Psikiyatrik Ön Değerlendirme Sistemi
        </div>

        <h1 style={{
          fontSize: 42, fontWeight: 800, lineHeight: 1.15,
          background: `linear-gradient(135deg, ${C.text}, ${C.muted})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 20,
        }}>
          Ruh sağlığınızı<br />birlikte değerlendirelim
        </h1>

        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 36 }}>
          Bu sistem, 24 klinik soruyu sesli veya yazılı olarak cevaplamanıza
          olanak tanır. Cevaplarınız yapay zeka destekli ön değerlendirme
          algoritmasıyla analiz edilir ve size özel bir ön rapor oluşturulur.
        </p>

        {/* Warning banner */}
        <div style={{
          background: "rgba(248,81,73,0.08)", border: `1px solid rgba(248,81,73,0.3)`,
          borderRadius: 10, padding: "14px 20px", marginBottom: 32,
          display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left",
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: 13, color: "#F2A49E", lineHeight: 1.6 }}>
            <strong>Önemli Uyarı:</strong> Bu sistem kesin tanı koymaz.
            Yalnızca eğitim ve araştırma amaçlıdır. Sonuçlar hiçbir şekilde
            profesyonel psikiyatrik değerlendirmenin yerini tutmaz.
            Acil durumda lütfen 182 (ALO Psikiyatri) hattını arayınız.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn onClick={onStart} style={{ padding: "14px 36px", fontSize: 16 }}>
            Değerlendirmeye Başla →
          </Btn>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
          {["🎤 Sesli yanıt desteği", "🔒 Veri saklanmaz", "📊 Anlık analiz", "🇹🇷 Türkçe arayüz"].map(f => (
            <span key={f} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12,
              background: C.panel, border: `1px solid ${C.border}`, color: C.muted,
            }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE 2 — DemographicForm
// ══════════════════════════════════════════════════════════════════════════
const DEMO_FIELDS = [
  { key: "yas",          label: "Yaş",                           type: "number", placeholder: "20–70" },
  { key: "cinsiyet",     label: "Cinsiyet",                      type: "select", options: ["Kadın","Erkek","Diğer"] },
  { key: "egitim",       label: "Eğitim Durumu",                 type: "select", options: ["İlkokul","Ortaokul","Lise","Önlisans","Lisans","Yüksek Lisans","Doktora"] },
  { key: "meslek",       label: "Meslek",                        type: "text",   placeholder: "Örn: Öğretmen, Mühendis..." },
  { key: "istihdam",     label: "Çalışma Durumu",                type: "select", options: ["Tam zamanlı çalışan","Yarı zamanlı çalışan","Öğrenci","İşsiz","Emekli","Serbest meslek"] },
  { key: "medeni",       label: "Medeni Durum",                  type: "select", options: ["Bekar","Evli","Boşanmış","Dul"] },
  { key: "sosyal_destek",label: "Sosyal Destek Düzeyi",          type: "select", options: ["Düşük","Orta","Yüksek"] },
  { key: "travma",       label: "Travma Geçmişi",                type: "select", options: ["Hayır","Evet"] },
  { key: "aile_gecmis", label: "Ailede Psikiyatrik Hastalık",   type: "select", options: ["Hayır","Evet"] },
  { key: "onceki_tani",  label: "Daha Önce Psikiyatrik Tanı",   type: "select", options: ["Yok","Depresyon","Anksiyete","Bipolar Bozukluk","OKB","PTSD","Şizofreni","Diğer"] },
  { key: "madde",        label: "Madde / Alkol Kullanımı",       type: "select", options: ["Yok","Sigara","Alkol","Alkol ve Sigara","Madde"] },
];

function Field({ field, value, onChange }) {
  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    background: C.panel, border: `1px solid ${C.border}`,
    color: C.text, fontSize: 14, outline: "none",
    transition: "border-color .2s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{field.label}</label>
      {field.type === "select" ? (
        <select style={{ ...inputStyle, cursor: "pointer" }} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Seçiniz —</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={field.type} placeholder={field.placeholder}
          style={inputStyle} value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function DemographicForm({ onNext, onBack }) {
  const [form, setForm] = useState({});
  const valid = DEMO_FIELDS.every(f => form[f.key] && String(form[f.key]).trim() !== "");

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div className="fade-up" style={{ maxWidth: 680, margin: "0 auto" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.muted,
          cursor: "pointer", fontSize: 14, marginBottom: 24, display: "flex", alignItems: "center", gap: 6,
        }}>← Geri</button>

        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Kişisel Bilgiler</h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>
          Bu bilgiler risk değerlendirmesinde kullanılır ve hiçbir yerde saklanmaz.
        </p>

        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {DEMO_FIELDS.map(f => (
              <div key={f.key} style={{ gridColumn: f.key === "meslek" ? "1 / -1" : undefined }}>
                <Field field={f} value={form[f.key] || ""} onChange={v => setForm(p => ({ ...p, [f.key]: v }))} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={() => onNext(form)} disabled={!valid}>
              Soruları Başlat →
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE 3 — QuestionInterviewPage
// ══════════════════════════════════════════════════════════════════════════
function MicButton({ listening, onStart, onStop, supported }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {listening && (
        <div style={{
          position: "absolute", inset: -8, borderRadius: "50%",
          border: `2px solid ${C.accent}`,
          animation: "ripple 1.2s ease-out infinite",
        }} />
      )}
      <button
        onClick={listening ? onStop : onStart}
        disabled={!supported}
        style={{
          width: 56, height: 56, borderRadius: "50%", border: "none",
          background: listening
            ? `linear-gradient(135deg, ${C.red}, #c0392b)`
            : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          color: "#fff", fontSize: 22, cursor: supported ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all .2s",
          animation: listening ? "pulse 1.5s ease infinite" : "none",
          boxShadow: listening ? `0 0 20px rgba(248,81,73,0.5)` : `0 0 20px rgba(61,142,240,0.3)`,
        }}
      >
        {listening ? "⏹" : "🎤"}
      </button>
    </div>
  );
}

function QuestionInterviewPage({ questions, onFinish, onBack }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [interim, setInterim] = useState("");

  // ref ile her zaman güncel soru id'sini tut
  const currentQIdRef = useRef(questions[0]?.id);
  const q = questions[idx];
  currentQIdRef.current = q?.id;

  const currentAnswer = answers[q?.id] || "";
  const katMeta = katColors[q?.kategori] || { bg: C.panel, border: C.border, text: C.muted };

  const { listening, supported, start, stop } = useSpeech({
    onResult: (text, isFinal) => {
      const qId = currentQIdRef.current;
      if (isFinal) {
        setAnswers(p => ({
          ...p,
          [qId]: (p[qId] ? p[qId].trimEnd() + " " : "") + text,
        }));
        setInterim("");
      } else {
        setInterim(text);
      }
    },
  });

  const goNext = () => {
    if (idx < questions.length - 1) setIdx(i => i + 1);
    else onFinish(answers);
    setInterim("");
  };

  const goPrev = () => {
    if (idx > 0) setIdx(i => i - 1);
    else onBack();
    setInterim("");
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div className="fade-up" style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <button onClick={goPrev} style={{
            background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6,
          }}>← Geri</button>
          <Progress value={answeredCount} max={questions.length} />
        </div>

        {/* Category badge */}
        <div style={{ marginBottom: 16 }}>
          <Tag label={q.kategori} color={katMeta.text} bg={katMeta.bg} />
        </div>

        {/* Question card */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: 2, textTransform: "uppercase", marginBottom: 12,
          }}>
            Soru {idx + 1} / {questions.length}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, marginBottom: 24, color: C.text }}>
            {q.text}
          </h2>

          {/* Answer textarea — sadece kesinleşmiş metni gösterir */}
          <textarea
            value={currentAnswer}
            onChange={e => {
              const qId = q.id;
              setAnswers(p => ({ ...p, [qId]: e.target.value }));
            }}
            placeholder="Cevabınızı buraya yazabilir veya mikrofon butonunu kullanabilirsiniz..."
            style={{
              width: "100%", minHeight: 120, padding: "12px 16px",
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 14,
              resize: "vertical", outline: "none", lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />
          {/* Interim transcript — gri italik, textarea'nın altında */}
          {interim && (
            <div style={{
              marginTop: 6, padding: "8px 12px",
              background: "rgba(61,142,240,0.07)",
              border: `1px dashed ${C.accent}55`,
              borderRadius: 6, fontSize: 13,
              color: C.muted, fontStyle: "italic",
            }}>
              🎤 <span style={{ color: C.accent }}>{interim}</span>
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>(henüz tamamlanmadı...)</span>
            </div>
          )}

          {/* Mic controls */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, marginTop: 16,
            paddingTop: 16, borderTop: `1px solid ${C.border}`,
          }}>
            <MicButton listening={listening} onStart={start} onStop={stop} supported={supported} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: listening ? C.accent : C.muted }}>
                {listening ? "Dinleniyor..." : supported ? "Sesli yanıt ver" : "Tarayıcınız ses desteklemiyor"}
              </div>
              {listening && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  Konuşmayı bitirince ⏹ tuşuna basın
                </div>
              )}
            </div>
            {currentAnswer && (
              <button onClick={() => setAnswers(p => ({ ...p, [q.id]: "" }))} style={{
                marginLeft: "auto", background: "none", border: "none",
                color: C.muted, cursor: "pointer", fontSize: 12,
              }}>✕ Temizle</button>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Btn variant="ghost" onClick={goPrev}>← Önceki</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            {idx < questions.length - 1 && (
              <Btn variant="ghost" onClick={goNext} disabled={!currentAnswer.trim()}>
                Atla
              </Btn>
            )}
            <Btn onClick={goNext} disabled={!currentAnswer.trim()}>
              {idx === questions.length - 1 ? "Analizi Tamamla →" : "Sonraki →"}
            </Btn>
          </div>
        </div>

        {/* Question mini-map */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 28, justifyContent: "center" }}>
          {questions.map((qx, i) => (
            <button
              key={qx.id}
              onClick={() => setIdx(i)}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: i === idx ? C.accent : answers[qx.id] ? C.green + "44" : C.panel,
                border: i === idx ? `1px solid ${C.accent}` : answers[qx.id] ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                color: i === idx ? "#fff" : answers[qx.id] ? C.green : C.muted,
                fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .15s",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE 4 — ResultPage
// ══════════════════════════════════════════════════════════════════════════
function RadarChart({ data }) {
  const entries = Object.entries(data).slice(0, 6);
  const size = 220;
  const cx = size / 2, cy = size / 2, r = 80;
  const n = entries.length;

  const pts = entries.map(([, v], i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const pct = v / 100;
    return { x: cx + r * pct * Math.cos(angle), y: cy + r * pct * Math.sin(angle) };
  });

  const poly = pts.map(p => `${p.x},${p.y}`).join(" ");

  const rings = [0.25, 0.5, 0.75, 1].map(f => ({
    pts: Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return `${cx + r * f * Math.cos(angle)},${cy + r * f * Math.sin(angle)}`;
    }).join(" "),
  }));

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {rings.map((ring, i) => (
        <polygon key={i} points={ring.pts} fill="none" stroke={C.border} strokeWidth={0.8} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const [label] = entries[i];
        const lx = cx + (r + 22) * Math.cos(angle);
        const ly = cy + (r + 22) * Math.sin(angle);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke={C.border} strokeWidth={0.8} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fill={C.muted} fontSize={9} fontFamily="Inter, sans-serif">
              {label.length > 18 ? label.slice(0, 16) + "…" : label}
            </text>
          </g>
        );
      })}
      <polygon points={poly} fill={`${C.accent}33`} stroke={C.accent} strokeWidth={2} />
    </svg>
  );
}

function ResultPage({ result, onRestart }) {
  const sev = SEVERITY_META[result.siddet] || SEVERITY_META[2];

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div className="fade-up" style={{ maxWidth: 800, margin: "0 auto" }}>

        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Ön Değerlendirme Raporu</h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>
          Cevaplarınız analiz edildi. Aşağıdaki sonuçlar yalnızca bilgilendirme amaçlıdır.
        </p>

        {/* Warning */}
        <div style={{
          background: "rgba(248,81,73,0.08)", border: `1px solid rgba(248,81,73,0.3)`,
          borderRadius: 10, padding: "14px 18px", marginBottom: 24,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: 13, color: "#F2A49E", lineHeight: 1.6 }}>
            <strong>Kesin Tanı Değildir.</strong> {result.uyari}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Primary result */}
          <Card style={{ borderColor: sev.color + "55" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
              Ön Değerlendirme Tanısı
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 12, lineHeight: 1.3 }}>
              {result.tani}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 8,
              background: sev.bg, border: `1px solid ${sev.color}`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sev.color }} />
              <span style={{ color: sev.color, fontWeight: 700, fontSize: 14 }}>
                Şiddet: {sev.label} (Düzey {result.siddet})
              </span>
            </div>
          </Card>

          {/* Similarity score */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
              Analiz Skoru
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.accent, marginBottom: 4 }}>
              %{result.benzerlik_skoru}
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>dataset benzerlik skoru</div>
            <div style={{ marginTop: 16, fontSize: 13, color: C.muted }}>
              Risk Faktörü Puanı: <span style={{ color: C.text, fontWeight: 600 }}>{result.risk_faktoru}</span>
            </div>
          </Card>
        </div>

        {/* Tanı dağılımı + radar */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
            Tanı Dağılımı
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <RadarChart data={result.tani_dagilimi} />
            <div style={{ flex: 1, minWidth: 200 }}>
              {Object.entries(result.tani_dagilimi).map(([tani, pct]) => (
                <div key={tani} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: C.text }}>{tani}</span>
                    <span style={{ color: C.muted }}>%{pct}</span>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`,
                      transition: "width 1s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Benzer vakalar */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
            Benzer Vakalar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.benzer_vakalar.map((v, i) => {
              const vm = SEVERITY_META[v.siddet] || SEVERITY_META[2];
              return (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 8,
                  background: C.panel, border: `1px solid ${C.border}`,
                  display: "flex", gap: 16, alignItems: "flex-start",
                }}>
                  <div style={{
                    minWidth: 42, height: 42, borderRadius: 8,
                    background: `${vm.color}22`, border: `1px solid ${vm.color}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: vm.color,
                  }}>
                    {v.id}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{v.tani}</span>
                      <Tag label={vm.label} color={vm.color} bg={vm.bg} />
                      <span style={{ fontSize: 12, color: C.muted }}>%{v.benzerlik} benzerlik</span>
                    </div>
                    {v.klinik_gorunum && (
                      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                        {v.klinik_gorunum}...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn variant="ghost" onClick={onRestart}>Yeni Değerlendirme</Btn>
          <Btn onClick={() => window.print()}>📄 Raporu Yazdır</Btn>
        </div>

        <p style={{ textAlign: "center", color: C.muted, fontSize: 12, marginTop: 24 }}>
          Acil destek için: <strong style={{ color: C.text }}>182 (ALO Psikiyatri)</strong> &nbsp;|&nbsp;
          İntihar önleme hattı: <strong style={{ color: C.text }}>182</strong>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  injectStyles();
  const [page, setPage] = useState("home");
  const [questions, setQuestions] = useState([]);
  const [demographics, setDemographics] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/questions`)
      .then(r => r.json())
      .then(d => setQuestions(d.questions))
      .catch(() => setError("Backend'e bağlanılamadı. Lütfen sunucuyu başlatın."));
  }, []);

  const handleFinish = async (answers) => {
    setLoading(true);
    setPage("loading");
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demographics, answers }),
      });
      const data = await res.json();
      setResult(data);
      setPage("result");
    } catch {
      setError("Analiz sırasında bir hata oluştu.");
      setPage("home");
    }
    setLoading(false);
  };

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ marginBottom: 12 }}>Bağlantı Hatası</h3>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>{error}</p>
        <Btn onClick={() => { setError(null); window.location.reload(); }}>Tekrar Dene</Btn>
      </Card>
    </div>
  );

  if (page === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: `3px solid ${C.border}`, borderTopColor: C.accent,
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: C.muted, fontSize: 15 }}>Cevaplarınız analiz ediliyor...</p>
    </div>
  );

  if (page === "home") return <HomePage onStart={() => setPage("demo")} />;
  if (page === "demo") return (
    <DemographicForm onNext={(d) => { setDemographics(d); setPage("interview"); }} onBack={() => setPage("home")} />
  );
  if (page === "interview" && questions.length > 0) return (
    <QuestionInterviewPage questions={questions} onFinish={handleFinish} onBack={() => setPage("demo")} />
  );
  if (page === "result" && result) return (
    <ResultPage result={result} onRestart={() => { setResult(null); setPage("home"); }} />
  );

  return null;
}
