import { EDITIONS } from "./devotionals/index.js";

const ICONS = {
  general: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  musicos: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
};

// Pantalla de bienvenida: se muestra la primera vez para elegir la edición del devocional.
export default function EditionIntro({ onSelect }) {
  return (
    <main className="auth-page">
      <div className="auth-layout">
        <aside className="auth-aside">
          <span className="brand">
            <span className="brand-mark"><span /></span>
            <span className="brand-name">manantial<span>.</span><small>Un encuentro cada día</small></span>
          </span>
          <blockquote className="auth-verse">
            <p>“Cantad alegres a Dios, habitantes de toda la tierra. Servid a Jehová con alegría.”</p>
            <cite>Salmos 100:1-2</cite>
          </blockquote>
          <ul className="auth-features">
            <li><span>✳</span>Un devocional nuevo cada día</li>
            <li><span>✧</span>La Biblia completa en 365 días</li>
            <li><span>♪</span>Una edición para quienes sirven con la música</li>
          </ul>
        </aside>
        <section className="auth-card">
          <div className="auth-eyebrow"><span className="eyebrow-line" /> Bienvenido</div>
          <h1>¿Cómo quieres vivir tu <em>encuentro diario?</em></h1>
          <p className="auth-intro">Elige la edición del devocional. Las dos siguen el mismo plan de lectura de la Biblia.</p>
          <div className="edition-choices">
            {EDITIONS.map((item) => (
              <button key={item.id} type="button" className={`edition-choice ${item.id}`} onClick={() => onSelect(item.id)}>
                {item.id === "musicos" && <span className="edition-choice-notes" aria-hidden="true">♪♫♬</span>}
                <span className="edition-choice-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[item.id]}</svg>
                </span>
                <span className="edition-choice-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                <span className="edition-choice-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <div className="auth-note">Puedes cambiar de edición cuando quieras desde la pantalla Hoy.</div>
        </section>
      </div>
    </main>
  );
}
