import { useEffect, useRef, useState } from "react";
import { EDITIONS } from "./devotionals/index.js";
import { NVI_NOTICE, phraseOfTheDay } from "./phrases.js";

const ICONS = {
  general: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  musicos: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  soundOn: <><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>,
  soundOff: <><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></>,
};

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// La animación de bienvenida se muestra una sola vez por apertura de la app.
let splashAlreadyShown = false;

function readMuted() {
  try { return localStorage.getItem("manantial:muted") === "true"; } catch { return false; }
}

// Sonidos sintetizados con Web Audio (sin archivos): una gota de agua y un acorde suave.
let audioContext = null;
function playTone(context, { frequency, endFrequency, start, duration, volume, type = "sine" }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * 0.6);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function playEditionSound(edition) {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime + 0.01;
    if (edition === "musicos") {
      // Arpegio de Re mayor que se queda sonando como un acorde.
      [293.66, 369.99, 440, 587.33].forEach((frequency, index) => {
        playTone(audioContext, { frequency, start: now + index * 0.09, duration: 1.6, volume: 0.07, type: "triangle" });
      });
    } else {
      // Gota de agua: un tono que sube rápido, y un eco suave.
      playTone(audioContext, { frequency: 520, endFrequency: 1400, start: now, duration: 0.35, volume: 0.12 });
      playTone(audioContext, { frequency: 880, endFrequency: 1760, start: now + 0.16, duration: 0.5, volume: 0.04 });
    }
  } catch { /* audio no disponible */ }
}

function Splash({ onDone }) {
  const [start, highlight, reference] = phraseOfTheDay("general");
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), 6300);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <button type="button" className="splash" onClick={onDone} aria-label="Continuar a la portada">
      <span className="splash-drop" aria-hidden="true" />
      <span className="splash-ripples" aria-hidden="true"><i /><i /><i /></span>
      <span className="splash-brand">
        <span className="brand-name">manantial<span>.</span></span>
        <span className="splash-phrase">“{start} <em>{highlight}</em>”</span>
        {reference && <span className="splash-ref">{reference} · NVI</span>}
      </span>
      <span className="splash-skip">Toca para continuar</span>
    </button>
  );
}

function GeneralScene() {
  return (
    <span className="door-scene" aria-hidden="true">
      <span className="door-layer door-rays" />
      <span className="door-layer door-drop"><span /></span>
      {Array.from({ length: 6 }, (_, index) => <span key={index} className="door-spark" />)}
    </span>
  );
}

function MusicScene() {
  return (
    <span className="door-scene" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => <span key={index} className="door-star" />)}
      <span className="door-layer door-staff"><i /><i /><i /><i /><i /></span>
      <span className="door-layer door-notes">{["♪", "♫", "♬", "♩", "♪"].map((note, index) => <span key={index} className="door-note">{note}</span>)}</span>
      <span className="door-equalizer">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</span>
    </span>
  );
}

// Tarjeta que se inclina en 3D siguiendo el dedo o el mouse.
function Door({ item, isLast, onChoose }) {
  const ref = useRef(null);

  function tilt(event) {
    if (prefersReducedMotion()) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    ref.current.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    ref.current.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    ref.current.style.setProperty("--mx", `${x * 100}%`);
    ref.current.style.setProperty("--my", `${y * 100}%`);
    ref.current.style.setProperty("--px", (x - 0.5).toFixed(3));
    ref.current.style.setProperty("--py", (y - 0.5).toFixed(3));
    ref.current.classList.add("is-tilting");
  }

  function reset() {
    ref.current.classList.remove("is-tilting");
    ["--rx", "--ry", "--px", "--py"].forEach((name) => ref.current.style.setProperty(name, name.startsWith("--r") ? "0deg" : "0"));
  }

  return (
    <button ref={ref} type="button" className={`door door-${item.id} tone-${item.id}`} aria-label={`Entrar a la edición ${item.label}`}
      onPointerMove={tilt} onPointerDown={tilt} onPointerLeave={reset} onPointerCancel={reset}
      onClick={() => onChoose(item.id, ref.current.getBoundingClientRect())}>
      {item.id === "musicos" ? <MusicScene /> : <GeneralScene />}
      <span className="door-glare" aria-hidden="true" />
      {isLast && <span className="door-badge">Última vez</span>}
      <span className="door-body">
        <span className="door-heading">
          <span className="door-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[item.id]}</svg>
          </span>
          <strong className="door-title">{item.label}</strong>
        </span>
        <span className="door-go" aria-hidden="true">→</span>
      </span>
    </button>
  );
}

// Portada: aparece cada vez que se abre la app para elegir la edición del día.
export default function EditionIntro({ onSelect, lastEdition, greeting, dateLabel }) {
  const [showSplash, setShowSplash] = useState(() => !splashAlreadyShown && !prefersReducedMotion());
  const [muted, setMuted] = useState(readMuted);
  const [expanding, setExpanding] = useState(null);

  useEffect(() => { splashAlreadyShown = true; }, []);

  function toggleMuted() {
    setMuted((current) => {
      try { localStorage.setItem("manantial:muted", String(!current)); } catch { /* sin almacenamiento */ }
      return !current;
    });
  }

  function choose(id, rect) {
    if (expanding) return;
    if (!muted) playEditionSound(id);
    if (prefersReducedMotion()) {
      onSelect(id);
      return;
    }
    // La tarjeta elegida crece hasta llenar la pantalla antes de mostrar el devocional.
    setExpanding({ id, rect, open: false });
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setExpanding({ id, rect, open: true })));
    window.setTimeout(() => onSelect(id), 650);
  }

  const expandStyle = expanding && (expanding.open
    ? { top: 0, left: 0, width: "100vw", height: "100vh", borderRadius: 0 }
    : { top: expanding.rect.top, left: expanding.rect.left, width: expanding.rect.width, height: expanding.rect.height });

  return (
    <main className={`portal ${showSplash ? "is-hidden" : ""}`}>
      {/* Continúa la escena de la bienvenida: ondas en el agua y luces que suben */}
      <span className="portal-water" aria-hidden="true">
        <span className="portal-ripples"><i /><i /><i /><i /></span>
        {Array.from({ length: 16 }, (_, index) => <span key={index} className="portal-mote" />)}
      </span>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <header className="portal-header">
        <span className="brand">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">manantial<span>.</span><small>Un encuentro cada día</small></span>
        </span>
        <span className="portal-tools">
          <span className="portal-date">{dateLabel}</span>
          <button type="button" className="portal-sound" onClick={toggleMuted} aria-pressed={!muted} aria-label={muted ? "Activar sonido" : "Silenciar sonido"} title={muted ? "Activar sonido" : "Silenciar sonido"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{muted ? ICONS.soundOff : ICONS.soundOn}</svg>
          </button>
        </span>
      </header>

      <section className="portal-hero">
        <div className="eyebrow"><span className="eyebrow-line" /> {greeting}</div>
        <h1>Elige tu <em>encuentro de hoy.</em></h1>
      </section>

      <div className="portal-doors">
        {EDITIONS.map((item) => <Door key={item.id} item={item} isLast={lastEdition === item.id} onChoose={choose} />)}
      </div>

      <footer className="portal-footer">© {new Date().getFullYear()} Manantial · <strong>@luisniquen</strong><small>{NVI_NOTICE}</small></footer>

      {expanding && <div className={`door-expand tone-${expanding.id}`} style={expandStyle} aria-hidden="true" />}
    </main>
  );
}
