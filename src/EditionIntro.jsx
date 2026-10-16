import { EDITIONS } from "./devotionals/index.js";

const ICONS = {
  general: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  musicos: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
};

// Fondo del botón General: rayos de luz, chispas y la gota de manantial.
function GeneralScene() {
  return (
    <span className="door-scene" aria-hidden="true">
      <span className="door-rays" />
      <span className="door-drop"><span /></span>
      {Array.from({ length: 6 }, (_, index) => <span key={index} className="door-spark" />)}
    </span>
  );
}

// Fondo del botón de Música y Alabanza: pentagrama, notas y ecualizador en tonos pastel.
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
        <h1>Elige tu <em>encuentro de hoy.</em></h1>
      </section>

      <div className="portal-doors">
        {EDITIONS.map((item) => (
          <button key={item.id} type="button" className={`door door-${item.id}`} onClick={() => onSelect(item.id)} aria-label={`Entrar a la edición ${item.label}`}>
            {item.id === "musicos" ? <MusicScene /> : <GeneralScene />}
            {lastEdition === item.id && <span className="door-badge">Última vez</span>}
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
        ))}
      </div>

      <footer className="portal-footer">© {new Date().getFullYear()} Manantial · <strong>@luisniquen</strong></footer>
    </main>
  );
}
