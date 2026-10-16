import { useEffect, useMemo, useRef, useState } from "react";
import AuthScreen from "./AuthScreen.jsx";
import { AdminGroups, MyGroup } from "./GroupsPanel.jsx";

const BOOKS = [
  ["Génesis", 50], ["Éxodo", 40], ["Levítico", 27], ["Números", 36], ["Deuteronomio", 34],
  ["Josué", 24], ["Jueces", 21], ["Rut", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Reyes", 22], ["2 Reyes", 25], ["1 Crónicas", 29], ["2 Crónicas", 36], ["Esdras", 10],
  ["Nehemías", 13], ["Ester", 10], ["Job", 42], ["Salmos", 150], ["Proverbios", 31],
  ["Eclesiastés", 12], ["Cantares", 8], ["Isaías", 66], ["Jeremías", 52], ["Lamentaciones", 5],
  ["Ezequiel", 48], ["Daniel", 12], ["Oseas", 14], ["Joel", 3], ["Amós", 9],
  ["Abdías", 1], ["Jonás", 4], ["Miqueas", 7], ["Nahúm", 3], ["Habacuc", 3],
  ["Sofonías", 3], ["Hageo", 2], ["Zacarías", 14], ["Malaquías", 4],
  ["Mateo", 28], ["Marcos", 16], ["Lucas", 24], ["Juan", 21], ["Hechos", 28],
  ["Romanos", 16], ["1 Corintios", 16], ["2 Corintios", 13], ["Gálatas", 6], ["Efesios", 6],
  ["Filipenses", 4], ["Colosenses", 4], ["1 Tesalonicenses", 5], ["2 Tesalonicenses", 3],
  ["1 Timoteo", 6], ["2 Timoteo", 4], ["Tito", 3], ["Filemón", 1], ["Hebreos", 13],
  ["Santiago", 5], ["1 Pedro", 5], ["2 Pedro", 3], ["1 Juan", 5], ["2 Juan", 1],
  ["3 Juan", 1], ["Judas", 1], ["Apocalipsis", 22],
];

const TOTAL_CHAPTERS = BOOKS.reduce((sum, [, chapters]) => sum + chapters, 0);
const DAY_COUNT = 365;
const DAYS = Array.from({ length: DAY_COUNT }, (_, index) => {
  const first = Math.floor((index * TOTAL_CHAPTERS) / DAY_COUNT);
  const last = Math.floor(((index + 1) * TOTAL_CHAPTERS) / DAY_COUNT);
  const segments = [];
  let chapterOffset = 0;

  for (const [book, chapters] of BOOKS) {
    const bookStart = chapterOffset;
    const bookEnd = chapterOffset + chapters;
    const start = Math.max(first, bookStart);
    const end = Math.min(last, bookEnd);
    if (start < end) {
      const from = start - bookStart + 1;
      const to = end - bookStart;
      segments.push(`${book} ${from}${from === to ? "" : `–${to}`}`);
    }
    chapterOffset = bookEnd;
    if (chapterOffset >= last) break;
  }

  return { day: index + 1, reading: segments.join("; ") };
});

const REFLECTIONS = [
  {
    title: "Un nuevo comienzo en Sus manos",
    reflection: "Dios sigue obrando incluso cuando no alcanzamos a ver el cuadro completo. La historia de la fe comienza con una invitación a confiar: dar el siguiente paso, aunque el camino todavía se esté revelando. Hoy puedes descansar en que no caminas a solas.",
    meditation: "¿Qué área de tu vida necesitas volver a poner en las manos de Dios?",
    prayer: "Señor, ayúdame a confiar en Ti en este nuevo día. Guía mis pasos y enséñame a reconocer Tu presencia en cada momento. Amén.",
    practice: "Toma un momento para entregarle a Dios, en una oración sencilla, una preocupación que has estado cargando.",
  },
  {
    title: "Fuerza para el camino de hoy",
    reflection: "No tienes que resolver toda tu vida en un solo día. La sabiduría de la Palabra nos invita a recibir con humildad lo que Dios nos ofrece para este momento. Su fidelidad sostiene cada paso, también los pequeños y silenciosos.",
    meditation: "¿Cuál sería un paso pequeño, pero fiel, que puedes dar hoy?",
    prayer: "Padre, dame sabiduría para vivir este día con esperanza. Sostén mi corazón y enséñame a depender de Ti en lo sencillo. Amén.",
    practice: "Haz una pausa de dos minutos antes de una decisión importante y pide a Dios sabiduría.",
  },
  {
    title: "Una esperanza que permanece",
    reflection: "Las temporadas cambian, pero la presencia de Dios no depende de cómo se vea el día. La lectura de hoy nos recuerda que podemos encontrar dirección y esperanza al volver nuestro corazón hacia Él, un día a la vez.",
    meditation: "¿Qué verdad sobre el carácter de Dios quieres recordar hoy?",
    prayer: "Dios de esperanza, vuelve mi mirada hacia Ti. Ayúdame a llevar Tu paz a mis conversaciones y a confiar en Tu cuidado. Amén.",
    practice: "Comparte una palabra de ánimo con alguien que necesite esperanza.",
  },
];

const NAV_ITEMS = [
  { id: "hoy", label: "Hoy", icon: "sun" },
  { id: "plan", label: "Mi plan", icon: "book" },
  { id: "guardados", label: "Guardados", icon: "bookmark" },
  { id: "users", label: "Mi grupo", icon: "users" },
];

function getTodayDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);
  return Math.min(Math.max(day, 1), DAY_COUNT);
}

function formatDate(day) {
  const date = new Date(new Date().getFullYear(), 0, day);
  return new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function Icon({ name, size = 20 }) {
  const paths = {
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    bookmark: <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    heart: <path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8a4.3 4.3 0 0 1 8.8-1.2 4.3 4.3 0 0 1 8.8 1.2Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><path d="M12 20h.01" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function DemoDevotional(day) {
  const reading = DAYS[day - 1].reading;
  const reflection = REFLECTIONS[(day - 1) % REFLECTIONS.length];
  return { day, reading, passage: reading, ...reflection, generated: false };
}

function App() {
  const [day, setDay] = useState(getTodayDay);
  const [section, setSection] = useState("hoy");
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  const [connectionError, setConnectionError] = useState("");
  const [progressReady, setProgressReady] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [completed, setCompleted] = useState([]);
  const [saved, setSaved] = useState([]);
  const [devotional, setDevotional] = useState(() => DemoDevotional(getTodayDay()));
  const [generation, setGeneration] = useState("loading");
  const [installPrompt, setInstallPrompt] = useState(null);
  const syncQueue = useRef(Promise.resolve());

  useEffect(() => {
    fetch("/api/auth")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo verificar la sesión.");
        setUser(data.user);
        setAuthStatus(data.user ? "signed-in" : "signed-out");
      })
      .catch((error) => {
        setConnectionError(error.message || "No se pudo conectar con el servidor.");
        setAuthStatus("unavailable");
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setProgressReady(false);
      return;
    }
    let active = true;
    setProgressReady(false);
    fetch("/api/progress")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar tu progreso.");
        return data;
      })
      .then((data) => {
        if (!active) return;
        setCompleted(data.completed);
        setSaved(data.saved);
        setSyncError("");
        setProgressReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setSyncError(error.message || "No se pudo sincronizar tu progreso.");
      });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    const handleInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    setGeneration("loading");
    fetch(`/api/devotional?day=${day}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("La API devocional no está disponible.");
        return response.json();
      })
      .then((data) => {
        if (active) {
          setDevotional({ ...data, reading: DAYS[day - 1].reading, generated: true });
          setGeneration("ready");
        }
      })
      .catch(() => {
        if (active) {
          setDevotional(DemoDevotional(day));
          setGeneration("demo");
        }
      });
    return () => { active = false; };
  }, [day, user?.id]);

  useEffect(() => {
    if (user && progressReady) {
      localStorage.setItem(`manantial:${user.id}:completed`, JSON.stringify(completed));
    }
  }, [completed, progressReady, user]);

  useEffect(() => {
    if (user && progressReady) {
      localStorage.setItem(`manantial:${user.id}:saved`, JSON.stringify(saved));
    }
  }, [progressReady, saved, user]);

  useEffect(() => {
    if (!user || user.role === "admin" || !progressReady) return undefined;
    const timeout = window.setTimeout(() => {
      syncQueue.current = syncQueue.current
        .catch(() => {})
        .then(async () => {
          const response = await fetch("/api/progress", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ completed, saved }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "No se pudo sincronizar tu progreso.");
          setSyncError("");
        })
        .catch((error) => setSyncError(error.message || "No se pudo sincronizar tu progreso."));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [completed, progressReady, saved, user]);

  const progress = useMemo(() => Math.round((completed.length / DAY_COUNT) * 100), [completed]);
  const isCompleted = completed.includes(day);
  const isSaved = saved.includes(day);
  const weekDays = useMemo(() => {
    const start = Math.max(1, Math.min(day - 3, DAY_COUNT - 6));
    return Array.from({ length: 7 }, (_, index) => start + index);
  }, [day]);

  function markComplete() {
    setCompleted((previous) => isCompleted ? previous.filter((item) => item !== day) : [...previous, day].sort((a, b) => a - b));
  }

  function toggleSaved() {
    setSaved((previous) => isSaved ? previous.filter((item) => item !== day) : [...previous, day].sort((a, b) => a - b));
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión.");
      setUser(null);
      setAuthStatus("signed-out");
      setCompleted([]);
      setSaved([]);
      setSection("hoy");
      setSyncError("");
    } catch (error) {
      setSyncError(error.message || "No se pudo cerrar la sesión.");
    }
  }

  const navItems = user?.role === "admin"
    ? [...NAV_ITEMS.filter((item) => item.id !== "users"), { id: "grupo", label: "Grupos", icon: "users" }]
    : NAV_ITEMS;
  const sectionTitle = section === "hoy"
    ? "DEVOCIONAL DIARIO"
    : section === "plan"
      ? "PLAN DE LECTURA"
      : section === "guardados"
        ? "TUS GUARDADOS"
        : user?.role === "admin" ? "SEGUIMIENTO DE GRUPOS" : "TU COMUNIDAD";

  if (authStatus === "checking") {
    return <main className="auth-page"><div className="auth-loading">Preparando tu espacio de encuentro…</div></main>;
  }
  if (authStatus !== "signed-in") {
    return <AuthScreen connectionError={authStatus === "unavailable" ? connectionError : ""} onLogin={(nextUser) => { setUser(nextUser); setAuthStatus("signed-in"); setConnectionError(""); }} />;
  }

  const selectedSavedDays = saved.map((savedDay) => ({ day: savedDay, devotional: savedDay === day ? devotional : DemoDevotional(savedDay) }));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("hoy"); }}>
          <span className="brand-mark"><span /></span>
          <span className="brand-name">manantial<span>.</span><small>UN ENCUENTRO CADA DÍA</small></span>
        </a>
        <div className="sidebar-label">TU ESPACIO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-link ${section === item.id ? "active" : ""}`} onClick={() => setSection(item.id)}>
              <Icon name={item.icon} size={19} />{item.label}
              {item.id === "guardados" && saved.length > 0 && <span className="nav-count">{saved.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="journey-card">
          <div className="journey-heading"><span>Tu recorrido</span><Icon name="book" size={17} /></div>
          <p>Un año en la Palabra</p>
          <div className="journey-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="journey-caption"><span>{completed.length} de 365 días</span><strong>{progress}%</strong></div>
        </div>
        <div className="sidebar-footer"><span className="online-dot" /> Un momento para tu alma</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-context"><span>UN ESPACIO PARA TU FE</span><span className="topbar-divider">/</span><span>{sectionTitle}</span></div>
          <div className="topbar-actions">
            {installPrompt && <button className="install-button" onClick={installApp}><Icon name="download" size={16} /> Instalar app</button>}
            <span className="streak-chip"><span>✳</span> Día {day} de 365</span>
            <button className="avatar account-button" aria-label={`Cerrar sesión de ${user.name}`} title={`Cerrar sesión de ${user.name}`} onClick={logout}>{user.name.slice(0, 1).toUpperCase()}</button>
          </div>
        </header>
        {syncError && <div className="sync-warning" role="alert">{syncError}</div>}

        {section === "hoy" && (
          <div className="page-content">
            <section className="welcome-row">
              <div><div className="eyebrow"><span className="eyebrow-line" /> TU PAUSA SAGRADA DE HOY</div><h1>Un momento para <em>estar.</em></h1><p className="welcome-date">{formatDate(day)} <span>·</span> respira, estás en casa</p></div>
              <button className={`save-button ${isSaved ? "saved" : ""}`} aria-label={isSaved ? "Quitar de guardados" : "Guardar devocional"} onClick={toggleSaved}><Icon name="bookmark" size={19} /><span>{isSaved ? "Guardado" : "Guardar"}</span></button>
            </section>

            <section className="week-strip" aria-label="Seleccionar día">
              <button className="week-arrow" disabled={day <= 1} onClick={() => setDay((current) => Math.max(1, current - 1))} aria-label="Día anterior"><span className="flip"><Icon name="chevron" size={17} /></span></button>
              <div className="days-row">
                {weekDays.map((number) => {
                  const date = new Date(new Date().getFullYear(), 0, number);
                  const label = new Intl.DateTimeFormat("es", { weekday: "short" }).format(date).replace(".", "");
                  return <button key={number} className={`day-cell ${day === number ? "selected" : ""} ${completed.includes(number) ? "done" : ""}`} onClick={() => setDay(number)}><span>{label}</span><strong>{date.getDate()}</strong>{completed.includes(number) && <i />}</button>;
                })}
              </div>
              <button className="week-arrow" disabled={day >= DAY_COUNT} onClick={() => setDay((current) => Math.min(DAY_COUNT, current + 1))} aria-label="Día siguiente"><Icon name="chevron" size={17} /></button>
            </section>

            <div className="reading-banner">
              <div className="reading-icon"><Icon name="book" size={19} /></div>
              <div className="reading-copy"><span>LECTURA DE HOY <b>·</b> DÍA {day}</span><strong>{DAYS[day - 1].reading}</strong></div>
              <div className="reading-plan-label"><span className="reading-dot" /> RV60</div>
            </div>

            <article className="devotional-card">
              <div className="card-topline"><span className="card-category"><Icon name="sparkles" size={15} /> REFLEXIÓN DEL DÍA</span><span className={`generated-badge ${generation === "ready" ? "ai-badge" : ""}`}><i />{generation === "loading" ? "Preparando…" : generation === "ready" ? "Creado con IA" : "Lectura de muestra"}</span></div>
              <h2>{devotional.title}</h2>
              <p className="scripture-reference"><span className="tiny-cross">✳</span> Para meditar <b>·</b> {devotional.passage}</p>
              <div className="card-rule" />
              <div className="reflection-copy"><p>{devotional.reflection}</p></div>
              <div className="meditation-box"><span className="meditation-symbol">“</span><div><span>PARA REFLEXIONAR</span><p>{devotional.meditation}</p></div></div>
              <div className="card-bottom">
                <div className="reading-time"><Icon name="clock" size={15} /> 5 min de lectura</div>
                <button className={`complete-button ${isCompleted ? "completed" : ""}`} onClick={markComplete}>{isCompleted ? <><Icon name="check" size={17} /> Día completado</> : <>Marcar como leído <Icon name="arrow" size={16} /></>}</button>
              </div>
            </article>

            <section className="practice-grid">
              <div className="practice-card prayer-card"><div className="practice-heading"><span className="practice-icon prayer-icon">✧</span><span>UNA ORACIÓN</span></div><p>{devotional.prayer}</p></div>
              <div className="practice-card action-card"><div className="practice-heading"><span className="practice-icon action-icon"><Icon name="heart" size={17} /></span><span>VÍVELO HOY</span></div><p>{devotional.practice}</p></div>
            </section>
            <footer className="daily-footer"><span>Un día a la vez, cerca de Su corazón.</span><span>MANANTIAL <b>✳</b> 365</span></footer>
          </div>
        )}

        {section === "plan" && (
          <div className="page-content secondary-page">
            <div className="eyebrow"><span className="eyebrow-line" /> TU CAMINO EN LA PALABRA</div>
            <h1>365 días de <em>propósito.</em></h1>
            <p className="secondary-intro">Un recorrido completo por las Escrituras, desde Génesis hasta Apocalipsis. Un día a la vez.</p>
            <div className="plan-summary"><div><strong>{completed.length}<span> / 365</span></strong><small>DÍAS COMPLETADOS</small></div><div><strong>{progress}<span>%</span></strong><small>DE TU RECORRIDO</small></div><div><strong>{Math.max(0, DAY_COUNT - completed.length)}</strong><small>DÍAS POR DESCUBRIR</small></div></div>
            <div className="plan-list">
              {DAYS.map((item) => <button key={item.day} className={`plan-row ${item.day === day ? "current" : ""}`} onClick={() => { setDay(item.day); setSection("hoy"); }}><span className={`plan-day ${completed.includes(item.day) ? "plan-done" : ""}`}>{completed.includes(item.day) ? <Icon name="check" size={14} /> : String(item.day).padStart(2, "0")}</span><span className="plan-reading"><small>DÍA {item.day}{item.day === getTodayDay() ? " · HOY" : ""}</small><strong>{item.reading}</strong></span><Icon name="chevron" size={17} /></button>)}
            </div>
          </div>
        )}

        {section === "guardados" && (
          <div className="page-content secondary-page">
            <div className="eyebrow"><span className="eyebrow-line" /> LO QUE QUIERES RECORDAR</div>
            <h1>Tus momentos <em>guardados.</em></h1>
            <p className="secondary-intro">Reflexiones para volver a ellas cuando tu corazón lo necesite.</p>
            {selectedSavedDays.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="bookmark" size={24} /></span><h2>Aún no has guardado reflexiones</h2><p>Cuando una reflexión te acompañe, guárdala para volver a leerla.</p><button onClick={() => setSection("hoy")}>Ir al devocional de hoy <Icon name="arrow" size={16} /></button></div> : <div className="saved-list">{selectedSavedDays.map(({ day: savedDay, devotional: item }) => <button className="saved-card" key={savedDay} onClick={() => { setDay(savedDay); setSection("hoy"); }}><span className="saved-day">DÍA {savedDay} <span>·</span> {DAYS[savedDay - 1].reading}</span><strong>{item.title}</strong><p>{item.reflection}</p><span className="saved-open">Volver a esta reflexión <Icon name="arrow" size={15} /></span></button>)}</div>}
          </div>
        )}
        {section === "grupo" && user.role === "admin" && <AdminGroups onError={setSyncError} />}
        {section === "users" && user.role !== "admin" && <MyGroup user={user} />}
      </main>

      <nav className="mobile-nav" aria-label="Navegación inferior">
        {navItems.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}><Icon name={item.icon} size={20} /><span>{item.label}</span>{item.id === "guardados" && saved.length > 0 && <i />}</button>)}
      </nav>
    </div>
  );
}

export default App;
