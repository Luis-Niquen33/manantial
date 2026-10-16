import { EDITIONS } from "./devotionals/index.js";
import { phraseOfTheDay } from "./phrases.js";

const ICONS = {
  general: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  musicos: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
};

// Fondo de la puerta General: rayos de luz y una gota de manantial.
function GeneralScene() {
  return (
    <span className="door-scene" aria-hidden="true">
      <span className="door-rays" />
      <span className="door-drop"><span /></span>
      {Array.from({ length: 8 }, (_, index) => <span key={index} className="door-spark" />)}
    </span>
  );
}

// Fondo de la puerta de Música y Alabanza: pentagrama, notas y ecualizador.
function MusicScene() {
  return (
    <span className="door-scene" aria-hidden="true">
      <span className="door-staff"><i /><i /><i /><i /><i /></span>
      {["♪", "♫", "♬", "♩", "♪"].map((note, index) => <span key={index} className="door-note">{note}</span>)}
      <span className="door-equalizer">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</span>
    </span>
  );
}

// Portada: aparece cada vez que se abre la app para elegir la edición del día.
export default function EditionIntro({ onSelect, lastEdition, greeting, dateLabel }) {
  return (
    <main className="portal">
      <header className="portal-header">
        <span className="brand">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">manantial<span>.</span><small>Un encuentro cada día</small></span>
        </span>
        <span className="portal-date">{dateLabel}</span>
      </header>

      <section className="portal-hero">
        <div className="eyebrow"><span className="eyebrow-line" /> {greeting}</div>
        <h1>Hoy Dios tiene una palabra <em>para ti.</em></h1>
        <p>¿Dónde quieres encontrarte con Él hoy? Elige tu edición.</p>
      </section>

      <div className="portal-doors">
        {EDITIONS.map((item) => {
          const [start, highlight] = phraseOfTheDay(item.id);
          return (
            <button key={item.id} type="button" className={`door door-${item.id}`} onClick={() => onSelect(item.id)}>
              {item.id === "musicos" ? <MusicScene /> : <GeneralScene />}
              {lastEdition === item.id && <span className="door-badge">Tu última elección</span>}
              <span className="door-body">
                <span className="door-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[item.id]}</svg>
                </span>
                <span className="door-tag">Edición</span>
                <strong className="door-title">{item.label}</strong>
                <span className="door-description">{item.description}</span>
                <span className="door-phrase"><small>La frase de hoy</small>“{start} <em>{highlight}</em>”</span>
                <span className="door-cta">Entrar <span aria-hidden="true">→</span></span>
              </span>
            </button>
          );
        })}
      </div>

      <footer className="portal-footer">Puedes cambiar de edición cuando quieras · © {new Date().getFullYear()} Manantial · <strong>@luisniquen</strong></footer>
    </main>
  );
}
