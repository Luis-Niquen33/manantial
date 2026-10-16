import { useEffect, useMemo, useRef, useState } from "react";
import AuthScreen from "./AuthScreen.jsx";
import EditionIntro from "./EditionIntro.jsx";
import { AdminGroups, AdminUsers, MyGroup } from "./GroupsPanel.jsx";
import { EDITIONS, loadDevotional } from "./devotionals/index.js";
import { phraseOfTheDay } from "./phrases.js";

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

// Nombres en inglés (mismo orden que BOOKS) para que Bible Gateway reconozca la referencia.
const GATEWAY_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];
const GATEWAY_NAMES = new Map(BOOKS.map(([book], index) => [book, GATEWAY_BOOKS[index]]));

function bibleReadingUrl(reading) {
  const search = reading.split("; ").map((segment) => {
    const split = segment.lastIndexOf(" ");
    const book = segment.slice(0, split);
    return `${GATEWAY_NAMES.get(book) ?? book} ${segment.slice(split + 1).replace("–", "-")}`;
  }).join("; ");
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=RVR1960`;
}
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

const NAV_ITEMS = [
  { id: "hoy", label: "Hoy", icon: "sun" },
  { id: "plan", label: "Mi plan", icon: "book" },
  { id: "guardados", label: "Guardados", icon: "bookmark" },
  { id: "users", label: "Mi grupo", icon: "users" },
];

const PLAN_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "pendientes", label: "Pendientes" },
  { id: "completados", label: "Completados" },
];

const TEXT_SCALES = [0.92, 1, 1.12, 1.25];

function isLeapYear(year) {
  return new Date(year, 1, 29).getMonth() === 1;
}

// Día del plan (1–365) para una fecha. Se calcula con fechas de calendario (no con horas),
// para que el horario de verano no cambie el día. En años bisiestos, el 29 de febrero
// repite el día 59 y el 31 de diciembre sigue siendo el día 365.
function planDayFor(date) {
  const year = date.getFullYear();
  let day = Math.round((Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  if (isLeapYear(year) && day > 59) day -= 1;
  return Math.min(Math.max(day, 1), DAY_COUNT);
}

function getTodayDay() {
  return planDayFor(new Date());
}

function dateForPlanDay(day) {
  const year = new Date().getFullYear();
  return new Date(year, 0, isLeapYear(year) && day > 59 ? day + 1 : day);
}

function formatDate(day) {
  return new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(dateForPlanDay(day));
}

function formatUnlockDate(day) {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "long" }).format(dateForPlanDay(day));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getStreak(completed) {
  const done = new Set(completed);
  let cursor = getTodayDay();
  if (!done.has(cursor)) cursor -= 1;
  let streak = 0;
  while (cursor >= 1 && done.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* almacenamiento no disponible */ }
}

function Icon({ name, size = 20 }) {
  const paths = {
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    bookmark: <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></>,
    guitar: <><path d="m14 10 7-7M18.5 3.5l2 2" /><path d="M10.5 9.5c-1.5-1.5-4.4-1.2-5.9.6-1 1.2-.8 2.5-1.8 3.4-1.2 1-1.9 2.6-.8 4.1l3.9 3.9c1.5 1.1 3.1.4 4.1-.8.9-1 2.2-.8 3.4-1.8 1.8-1.5 2.1-4.4.6-5.9Z" /><circle cx="9" cy="15" r="1.5" /></>,
    keys: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 13v7M12 13v7M17 13v7" /><path d="M5.8 4h2.4v9H5.8zM10.8 4h2.4v9h-2.4zM15.8 4h2.4v9h-2.4z" /></>,
    drum: <><ellipse cx="12" cy="9" rx="8" ry="3" /><path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9" /><path d="m4 3 6 4.5M20 3l-6 4.5" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    heart: <path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8a4.3 4.3 0 0 1 8.8-1.2 4.3 4.3 0 0 1 8.8 1.2Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    userPlus: <><path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    flame: <path d="M12 22c4 0 7-2.7 7-6.8 0-3.6-2.4-6-4.2-8.2-.4 2-1.5 3.2-2.8 3.6.4-3.2-1-6.3-3.6-8.6.2 3.4-1.6 5.7-3.2 7.8C4.1 11.3 5 12.6 5 15.2 5 19.3 8 22 12 22Z" />,
    external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
    feather: <><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76Z" /><path d="M16 8 2 22M17.5 15H9" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    text: <><path d="M4 7V5h16v2M9 19h6M12 5v14" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function ProgressRing({ value, size = 112, stroke = 9, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle className="ring-value" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" stroke="url(#ring-gradient)" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(value, 100) / 100)} />
      </svg>
      <div className="progress-ring-label">{children}</div>
    </div>
  );
}

function Celebration() {
  return (
    <div className="celebration" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--angle": `${index * 20}deg`, "--delay": `${(index % 3) * 40}ms` }} />)}
    </div>
  );
}

// Pentagrama y notas que flotan en la tarjeta principal de la edición de Música y Alabanza.
function MusicDecor() {
  return (
    <div className="music-decor" aria-hidden="true">
      <span className="music-staff"><i /><i /><i /><i /><i /></span>
      {["♪", "♫", "♬", "♩", "♪", "♫"].map((note, index) => <span key={index} className="music-note">{note}</span>)}
    </div>
  );
}

const MINISTRY_INSTRUMENTS = [
  { icon: "mic", label: "Voces" },
  { icon: "guitar", label: "Cuerdas" },
  { icon: "keys", label: "Teclas" },
  { icon: "drum", label: "Ritmo" },
];

function pendingDevotional(day) {
  const reading = DAYS[day - 1].reading;
  return {
    day,
    reading,
    passage: reading,
    title: "Tu lectura de hoy",
    reflection: "El devocional de este día todavía no está disponible. Lee los capítulos de hoy con calma y pídele a Dios que te hable a través de Su Palabra.",
    meditation: "¿Qué te enseña la lectura de hoy sobre Dios y sobre ti?",
    prayer: "Señor, abre mis ojos para ver las maravillas de Tu Palabra. Amén.",
    practice: "Escribe una frase de la lectura de hoy que quieras recordar.",
  };
}

// Versión sin servidor (GitHub Pages): sin cuentas ni grupos; el progreso queda en este dispositivo.
const STATIC_MODE = import.meta.env.VITE_STATIC === "true";
const LOCAL_USER = { id: "local", name: "", role: "user" };

function App() {
  const [day, setDay] = useState(getTodayDay);
  const [todayDay, setTodayDay] = useState(getTodayDay);
  const [section, setSection] = useState("hoy");
  const [user, setUser] = useState(STATIC_MODE ? LOCAL_USER : null);
  const [authStatus, setAuthStatus] = useState(STATIC_MODE ? "signed-in" : "checking");
  const [connectionError, setConnectionError] = useState("");
  const [progressReady, setProgressReady] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [completed, setCompleted] = useState([]);
  const [saved, setSaved] = useState([]);
  const [devotional, setDevotional] = useState(() => pendingDevotional(getTodayDay()));
  const [savedDevotionals, setSavedDevotionals] = useState({});
  const [generation, setGeneration] = useState("loading");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [theme, setTheme] = useState(() => readStored("manantial:theme", null));
  const [textScale, setTextScale] = useState(() => readStored("manantial:text-scale", 1));
  // La portada aparece en cada visita; solo se recuerda la última edición elegida para destacarla.
  const [edition, setEdition] = useState(null);
  const [lastEdition, setLastEdition] = useState(() => readStored("manantial:edition-choice", null));
  const activeEdition = edition ?? "general";
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
  const [planFilter, setPlanFilter] = useState("todos");
  const [planQuery, setPlanQuery] = useState("");
  const syncQueue = useRef(Promise.resolve());
  const menuRef = useRef(null);
  const maxDayRef = useRef(DAY_COUNT);

  useEffect(() => {
    if (STATIC_MODE) return;
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
    if (STATIC_MODE) {
      setCompleted(readStored(`manantial:${user.id}:completed`, []));
      setSaved(readStored(`manantial:${user.id}:saved`, []));
      setProgressReady(true);
      return undefined;
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
    if (user.role !== "admin" && day > getTodayDay()) return undefined;
    let active = true;
    const reading = DAYS[day - 1].reading;
    setGeneration("loading");
    (async () => {
      // 1) Devocional escrito para este día. 2) Si no existe, se intenta generarlo con IA.
      const written = await loadDevotional(day, activeEdition);
      if (written) return { devotional: { ...written, reading }, source: "daily" };
      const response = STATIC_MODE ? null : await fetch(`/api/devotional?day=${day}`).catch(() => null);
      if (response?.ok) return { devotional: { ...(await response.json()), reading }, source: "ai" };
      return { devotional: pendingDevotional(day), source: "pending" };
    })().then(({ devotional: next, source }) => {
      if (!active) return;
      setDevotional(next);
      setGeneration(source);
    });
    return () => { active = false; };
  }, [day, activeEdition, user?.id]);

  useEffect(() => {
    if (section !== "guardados") return undefined;
    let active = true;
    Promise.all(saved.map(async (savedDay) => [savedDay, (await loadDevotional(savedDay, activeEdition)) ?? pendingDevotional(savedDay)]))
      .then((entries) => { if (active) setSavedDevotionals(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [activeEdition, saved, section]);

  useEffect(() => {
    if (user && progressReady) writeStored(`manantial:${user.id}:completed`, completed);
  }, [completed, progressReady, user]);

  useEffect(() => {
    if (user && progressReady) writeStored(`manantial:${user.id}:saved`, saved);
  }, [progressReady, saved, user]);

  useEffect(() => {
    if (STATIC_MODE || !user || user.role === "admin" || !progressReady) return undefined;
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

  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    writeStored("manantial:theme", theme);
  }, [theme]);

  useEffect(() => {
    if (edition) {
      writeStored("manantial:edition-choice", edition);
      setLastEdition(edition);
    }
    // La edición de Ministerios de Música y Alabanza tiene su propia paleta (ver styles.css).
    const root = document.documentElement;
    if (edition === "musicos") root.dataset.edition = "musicos";
    else delete root.dataset.edition;
  }, [edition]);

  useEffect(() => {
    const dark = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const colors = edition === "musicos" ? ["#110c17", "#f5f1f8"] : ["#0e1613", "#f6f3ec"];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? colors[0] : colors[1]);
  }, [edition, theme]);

  useEffect(() => { writeStored("manantial:text-scale", textScale); }, [textScale]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (section !== "hoy") return undefined;
    const handleKey = (event) => {
      if (event.target.closest?.("input, textarea, select") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft") setDay((current) => Math.max(1, current - 1));
      if (event.key === "ArrowRight") setDay((current) => Math.min(maxDayRef.current, current + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [section]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [section]);

  useEffect(() => {
    const interval = window.setInterval(() => setTodayDay(getTodayDay()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin" && day > todayDay) setDay(todayDay);
  }, [day, todayDay, user]);

  const progress = useMemo(() => Math.round((completed.length / DAY_COUNT) * 100), [completed]);
  const streak = useMemo(() => getStreak(completed), [completed]);
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const isCompleted = completedSet.has(day);
  const isSaved = saved.includes(day);
  // Los devocionales se habilitan día a día: nadie ve días futuros, salvo el
  // administrador, que puede revisarlos como vista previa.
  const isAdmin = user?.role === "admin";
  const unlockedUntil = isAdmin ? DAY_COUNT : todayDay;
  const isLocked = (number) => number > unlockedUntil;
  maxDayRef.current = unlockedUntil;
  const weekDays = useMemo(() => {
    const start = Math.max(1, Math.min(day - 3, DAY_COUNT - 6));
    return Array.from({ length: 7 }, (_, index) => start + index);
  }, [day]);
  const filteredPlan = useMemo(() => {
    const query = planQuery.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");
    return DAYS.filter((item) => {
      if (planFilter === "pendientes" && completedSet.has(item.day)) return false;
      if (planFilter === "completados" && !completedSet.has(item.day)) return false;
      if (!query) return true;
      const haystack = `dia ${item.day} ${item.reading}`.toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");
      return haystack.includes(query);
    });
  }, [completedSet, planFilter, planQuery]);

  function notify(message) {
    setToast({ message, id: Date.now() });
  }

  function markComplete() {
    if (isCompleted) {
      setCompleted((previous) => previous.filter((item) => item !== day));
      return;
    }
    setCompleted((previous) => [...previous, day].sort((a, b) => a - b));
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 1100);
    notify(`¡Día ${day} completado! Sigue así.`);
  }

  function toggleSaved() {
    setSaved((previous) => isSaved ? previous.filter((item) => item !== day) : [...previous, day].sort((a, b) => a - b));
    notify(isSaved ? "Reflexión quitada de guardados" : "Reflexión guardada");
  }

  function removeSaved(savedDay) {
    setSaved((previous) => previous.filter((item) => item !== savedDay));
    notify("Reflexión quitada de guardados");
  }

  function selectDay(nextDay) {
    if (isLocked(nextDay)) {
      notify(`Este devocional se habilitará el ${formatUnlockDate(nextDay)}`);
      return false;
    }
    setDay(nextDay);
    return true;
  }

  function goToDay(nextDay) {
    if (!selectDay(nextDay)) return;
    setSection("hoy");
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      notify(message);
    } catch {
      notify("No se pudo copiar el texto");
    }
  }

  async function shareDevotional() {
    const story = devotional.story ? `\n\n${devotional.storyTitle}\n${devotional.story}\nLección: ${devotional.lesson}` : "";
    const text = `${devotional.title}\n${DAYS[day - 1].reading}\n\n${devotional.reflection}${story}\n\nOración: ${devotional.prayer}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: devotional.title, text });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    copyText(text, "Devocional copiado para compartir");
  }

  function toggleTheme() {
    const currentlyDark = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(currentlyDark ? "light" : "dark");
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  async function logout() {
    setMenuOpen(false);
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

  const isDark = theme === "dark" || (!theme && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const navItems = user?.role === "admin"
    ? [...NAV_ITEMS.filter((item) => item.id !== "users"), { id: "grupo", label: "Grupos", icon: "users" }, { id: "usuarios", label: "Usuarios", icon: "userPlus" }]
    : STATIC_MODE ? NAV_ITEMS.filter((item) => item.id !== "users") : NAV_ITEMS;
  const sectionTitle = section === "hoy"
    ? "Devocional diario"
    : section === "plan"
      ? "Plan de lectura"
      : section === "guardados"
        ? "Tus guardados"
        : section === "usuarios" ? "Gestión de usuarios"
          : user?.role === "admin" ? "Seguimiento de grupos" : "Tu comunidad";

  if (authStatus === "checking") {
    return <main className="auth-page"><div className="auth-loading"><span className="loading-drop" />Preparando tu espacio de encuentro…</div></main>;
  }
  if (authStatus !== "signed-in") {
    return <AuthScreen connectionError={authStatus === "unavailable" ? connectionError : ""} onLogin={(nextUser) => { setUser(nextUser); setAuthStatus("signed-in"); setConnectionError(""); }} />;
  }
  if (!edition) {
    return <EditionIntro onSelect={(next) => { setEdition(next); setSection("hoy"); window.scrollTo(0, 0); }} lastEdition={lastEdition} greeting={getGreeting()} dateLabel={formatDate(todayDay)} />;
  }

  const firstName = user.name.split(" ")[0];
  const heroPhrase = phraseOfTheDay(activeEdition);
  const selectedSavedDays = saved.map((savedDay) => ({ day: savedDay, devotional: savedDevotionals[savedDay] ?? pendingDevotional(savedDay) }));
  const remainingWeek = weekDays.filter((number) => completedSet.has(number)).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("hoy"); }}>
          <span className="brand-mark"><span /></span>
          <span className="brand-name">manantial<span>.</span><small>Un encuentro cada día</small></span>
        </a>
        <div className="sidebar-label">Tu espacio</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-link ${section === item.id ? "active" : ""}`} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>
              <Icon name={item.icon} size={19} />{item.label}
              {item.id === "guardados" && saved.length > 0 && <span className="nav-count">{saved.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="journey-card">
          <div className="journey-heading"><span>Tu recorrido</span><span className="journey-streak"><Icon name="flame" size={14} />{streak}</span></div>
          <p>Un año en la Palabra</p>
          <div className="journey-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="journey-caption"><span>{completed.length} de 365 días</span><strong>{progress}%</strong></div>
        </div>
        <button className="theme-toggle" onClick={toggleTheme}><Icon name={isDark ? "sun" : "moon"} size={16} />{isDark ? "Modo claro" : "Modo oscuro"}</button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-context"><span className="topbar-brand-mobile"><span className="brand-mark small"><span /></span></span><span className="topbar-crumb">Un espacio para tu fe</span><span className="topbar-divider">/</span><strong>{sectionTitle}</strong></div>
          <div className="topbar-actions">
            {installPrompt && <button className="install-button" onClick={installApp}><Icon name="download" size={16} /> <span>Instalar app</span></button>}
            <span className="streak-chip" title="Días seguidos completados"><Icon name="flame" size={15} /> {streak} {streak === 1 ? "día" : "días"}</span>
            {STATIC_MODE ? (
              <button className="avatar account-button" aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={toggleTheme}><Icon name={isDark ? "sun" : "moon"} size={16} /></button>
            ) : <div className="account-menu" ref={menuRef}>
              <button className="avatar account-button" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Cuenta de ${user.name}`} onClick={() => setMenuOpen((open) => !open)}>{user.name.slice(0, 1).toUpperCase()}</button>
              {menuOpen && (
                <div className="menu-panel" role="menu">
                  <div className="menu-identity"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email ?? (user.role === "admin" ? "Administrador" : "Participante")}</small></span></div>
                  <button role="menuitem" onClick={() => { toggleTheme(); setMenuOpen(false); }}><Icon name={isDark ? "sun" : "moon"} size={16} />{isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}</button>
                  <button role="menuitem" className="danger" onClick={logout}><Icon name="logout" size={16} />Cerrar sesión</button>
                </div>
              )}
            </div>}
          </div>
        </header>
        {syncError && <div className="sync-warning" role="alert">{syncError}</div>}

        {section === "hoy" && (
          <div className="page-content" key="hoy">
            <section className="hero-card">
              {activeEdition === "musicos" && <MusicDecor />}
              <div className="hero-copy">
                <div className="eyebrow light"><span className="eyebrow-line" /> {getGreeting()}{firstName && `, ${firstName}`}</div>
                <h1>{heroPhrase[0]} <em>{heroPhrase[1]}</em></h1>
                <p className="welcome-date">{formatDate(day)} <span>·</span> Día {day} de tu recorrido por la Biblia</p>
                <div className="hero-stats">
                  <div><Icon name="flame" size={16} /><strong>{streak}</strong><span>{streak === 1 ? "día seguido" : "días seguidos"}</span></div>
                  <div><Icon name="target" size={16} /><strong>{remainingWeek}/7</strong><span>esta semana</span></div>
                </div>
                {activeEdition === "musicos" && (
                  <ul className="ministry-instruments" aria-label="Ministerios de Música y Alabanza">
                    {MINISTRY_INSTRUMENTS.map((item) => <li key={item.icon}><Icon name={item.icon} size={15} />{item.label}</li>)}
                  </ul>
                )}
              </div>
              <ProgressRing value={progress}><strong>{progress}%</strong><span>del año</span></ProgressRing>
            </section>

            <section className="week-strip" aria-label="Seleccionar día">
              <button className="week-arrow" disabled={day <= 1} onClick={() => setDay((current) => Math.max(1, current - 1))} aria-label="Día anterior"><span className="flip"><Icon name="chevron" size={17} /></span></button>
              <div className="days-row">
                {weekDays.map((number) => {
                  const date = dateForPlanDay(number);
                  const label = new Intl.DateTimeFormat("es", { weekday: "short" }).format(date).replace(".", "");
                  return <button key={number} className={`day-cell ${day === number ? "selected" : ""} ${completedSet.has(number) ? "done" : ""} ${number === todayDay ? "today" : ""} ${isLocked(number) ? "locked" : ""}`} aria-pressed={day === number} aria-disabled={isLocked(number) || undefined} title={isLocked(number) ? `Se habilita el ${formatUnlockDate(number)}` : undefined} onClick={() => selectDay(number)}><span>{label}</span><strong>{date.getDate()}</strong>{completedSet.has(number) ? <i className="day-check"><Icon name="check" size={10} /></i> : isLocked(number) ? <i className="day-lock"><Icon name="lock" size={10} /></i> : null}</button>;
                })}
              </div>
              <button className="week-arrow" disabled={day >= unlockedUntil} onClick={() => selectDay(day + 1)} aria-label="Día siguiente" title={day >= unlockedUntil && day < DAY_COUNT ? `El próximo devocional se habilita el ${formatUnlockDate(day + 1)}` : undefined}><Icon name="chevron" size={17} /></button>
            </section>
            {day !== todayDay && <button className="back-today" onClick={() => setDay(todayDay)}>Volver a hoy <Icon name="arrow" size={14} /></button>}
            <div className="edition-switch">
              <span>Edición del devocional <button type="button" className="portal-link" onClick={() => setEdition(null)}>Ver portada</button></span>
              <div className="segmented" role="group" aria-label="Edición del devocional">
                {EDITIONS.map((item) => <button key={item.id} className={edition === item.id ? "active" : ""} aria-pressed={edition === item.id} onClick={() => setEdition(item.id)}>{item.id === "musicos" && <Icon name="music" size={14} />}{item.label}</button>)}
              </div>
            </div>

            <div className="reading-banner">
              <div className="reading-icon"><Icon name="book" size={20} /></div>
              <div className="reading-copy"><span>Lectura de hoy <b>·</b> Día {day}</span><strong>{DAYS[day - 1].reading}</strong></div>
              <a className="read-passage-button" href={bibleReadingUrl(DAYS[day - 1].reading)} target="_blank" rel="noopener noreferrer" title="Abrir el texto bíblico en Reina-Valera 1960 (Bible Gateway)"><Icon name="book" size={17} /><span>Leer pasaje</span><small>RVR1960</small><Icon name="external" size={14} /></a>
            </div>

            <article className={`devotional-card ${generation === "loading" ? "is-loading" : ""}`} style={{ "--reading-scale": textScale }} key={day}>
              <div className="card-topline">
                <span className="card-category">{activeEdition === "musicos" ? <><Icon name="music" size={15} /> Reflexión para el ministerio</> : <><Icon name="sparkles" size={15} /> Reflexión del día</>}</span>
                <div className="card-tools">
                  <span className={`generated-badge ${generation === "daily" || generation === "ai" ? "ai-badge" : ""}`}><i />{generation === "loading" ? "Preparando…" : generation === "daily" ? (day > todayDay ? `Vista previa · se publica el ${formatUnlockDate(day)}` : `Devocional del día ${day}`) : generation === "ai" ? "Creado con IA" : "Próximamente"}</span>
                  <div className="text-size" role="group" aria-label="Tamaño del texto">
                    <button disabled={textScale <= TEXT_SCALES[0]} onClick={() => setTextScale(TEXT_SCALES[Math.max(0, TEXT_SCALES.indexOf(textScale) - 1)] ?? 1)} aria-label="Reducir texto">A−</button>
                    <button disabled={textScale >= TEXT_SCALES.at(-1)} onClick={() => setTextScale(TEXT_SCALES[Math.min(TEXT_SCALES.length - 1, TEXT_SCALES.indexOf(textScale) + 1)] ?? 1)} aria-label="Aumentar texto">A+</button>
                  </div>
                </div>
              </div>
              <h2>{devotional.title}</h2>
              <p className="scripture-reference"><span className="tiny-cross">✳</span> Para meditar <b>·</b> {devotional.passage}</p>
              <div className="card-rule" />
              <div className="reflection-copy"><p>{devotional.reflection}</p></div>
              <div className="meditation-box"><span className="meditation-symbol">“</span><div><span>Para reflexionar</span><p>{devotional.meditation}</p></div></div>
              <div className="card-bottom">
                <div className="card-actions">
                  <span className="reading-time"><Icon name="clock" size={15} /> 5 min</span>
                  <button className={`icon-button ${isSaved ? "saved" : ""}`} aria-pressed={isSaved} onClick={toggleSaved} title={isSaved ? "Quitar de guardados" : "Guardar"}><Icon name="bookmark" size={17} /><span>{isSaved ? "Guardado" : "Guardar"}</span></button>
                  <button className="icon-button" onClick={shareDevotional} title="Compartir"><Icon name="share" size={17} /><span>Compartir</span></button>
                </div>
                <div className="complete-wrap">
                  {celebrating && <Celebration />}
                  <button className={`complete-button ${isCompleted ? "completed" : ""}`} onClick={markComplete}>{isCompleted ? <><Icon name="check" size={17} /> Día completado</> : <>Marcar como leído <Icon name="arrow" size={16} /></>}</button>
                </div>
              </div>
            </article>

            {devotional.story && (
              <section className="story-card" key={`story-${day}`}>
                <div className="story-topline">
                  <span className="story-kicker"><span className="practice-icon story-icon"><Icon name="feather" size={17} /></span>Aplicación cristiana</span>
                </div>
                <h3>{devotional.storyTitle}</h3>
                <p className="story-text">{devotional.story}</p>
                <div className="lesson-box">
                  <span className="lesson-icon"><Icon name="target" size={18} /></span>
                  <div><span>Lección aprendida</span><p>{devotional.lesson}</p></div>
                </div>
              </section>
            )}

            <section className="practice-grid">
              <div className="practice-card prayer-card">
                <div className="practice-heading"><span className="practice-icon prayer-icon">✧</span><span>Una oración</span><button className="mini-action" onClick={() => copyText(devotional.prayer, "Oración copiada")} aria-label="Copiar oración"><Icon name="copy" size={15} /></button></div>
                <p>{devotional.prayer}</p>
              </div>
              <div className="practice-card action-card">
                <div className="practice-heading"><span className="practice-icon action-icon"><Icon name="heart" size={17} /></span><span>Vívelo hoy</span></div>
                <p>{devotional.practice}</p>
              </div>
            </section>
            <footer className="daily-footer"><span>Un día a la vez, cerca de Su corazón.</span><span className="kbd-hint"><kbd>←</kbd><kbd>→</kbd> cambiar de día</span></footer>
          </div>
        )}

        {section === "plan" && (
          <div className="page-content secondary-page" key="plan">
            <div className="eyebrow"><span className="eyebrow-line" /> Tu camino en la Palabra</div>
            <h1>365 días de <em>propósito.</em></h1>
            <p className="secondary-intro">Un recorrido completo por las Escrituras, desde Génesis hasta Apocalipsis. Un día a la vez.</p>
            <div className="plan-summary">
              <div><span className="summary-icon"><Icon name="check" size={18} /></span><strong>{completed.length}<span> / 365</span></strong><small>Días completados</small></div>
              <div><span className="summary-icon gold"><Icon name="flame" size={18} /></span><strong>{streak}</strong><small>Racha actual</small></div>
              <div><span className="summary-icon"><Icon name="book" size={18} /></span><strong>{Math.max(0, DAY_COUNT - completed.length)}</strong><small>Por descubrir</small></div>
            </div>

            <section className="year-map" aria-label="Mapa del año">
              <div className="year-map-head"><strong>Tu año de un vistazo</strong><span className="year-legend"><i /> Pendiente <i className="done" /> Leído <i className="current" /> Hoy</span></div>
              <div className="year-grid">
                {DAYS.map((item) => <button key={item.day} className={`year-cell ${completedSet.has(item.day) ? "done" : ""} ${item.day === todayDay ? "current" : ""} ${item.day > todayDay ? "future" : ""} ${isLocked(item.day) ? "locked" : ""}`} title={isLocked(item.day) ? `Día ${item.day}: se habilita el ${formatUnlockDate(item.day)}` : `Día ${item.day}: ${item.reading}`} aria-label={`Día ${item.day}: ${item.reading}`} onClick={() => goToDay(item.day)} />)}
              </div>
            </section>

            <div className="plan-toolbar">
              <label className="search-field"><Icon name="search" size={17} /><input type="search" value={planQuery} onChange={(event) => setPlanQuery(event.target.value)} placeholder="Buscar libro o día…" aria-label="Buscar en el plan" /></label>
              <div className="segmented" role="tablist" aria-label="Filtrar días">
                {PLAN_FILTERS.map((filter) => <button key={filter.id} role="tab" aria-selected={planFilter === filter.id} className={planFilter === filter.id ? "active" : ""} onClick={() => setPlanFilter(filter.id)}>{filter.label}</button>)}
              </div>
            </div>
            {filteredPlan.length === 0 ? <div className="empty-state compact"><p>No hay días que coincidan con tu búsqueda.</p></div> : (
              <div className="plan-list">
                {filteredPlan.map((item) => <button key={item.day} className={`plan-row ${item.day === day ? "current" : ""} ${isLocked(item.day) ? "locked" : ""}`} aria-disabled={isLocked(item.day) || undefined} onClick={() => goToDay(item.day)}><span className={`plan-day ${completedSet.has(item.day) ? "plan-done" : ""}`}>{completedSet.has(item.day) ? <Icon name="check" size={14} /> : String(item.day).padStart(2, "0")}</span><span className="plan-reading"><small>Día {item.day}{item.day === todayDay ? <b className="today-pill">Hoy</b> : null}{isLocked(item.day) ? <b className="unlock-pill">Se habilita el {formatUnlockDate(item.day)}</b> : null}</small><strong>{item.reading}</strong></span><Icon name={isLocked(item.day) ? "lock" : "chevron"} size={17} /></button>)}
              </div>
            )}
          </div>
        )}

        {section === "guardados" && (
          <div className="page-content secondary-page" key="guardados">
            <div className="eyebrow"><span className="eyebrow-line" /> Lo que quieres recordar</div>
            <h1>Tus momentos <em>guardados.</em></h1>
            <p className="secondary-intro">Reflexiones para volver a ellas cuando tu corazón lo necesite.</p>
            {selectedSavedDays.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="bookmark" size={24} /></span><h2>Aún no has guardado reflexiones</h2><p>Cuando una reflexión te acompañe, guárdala para volver a leerla.</p><button onClick={() => setSection("hoy")}>Ir al devocional de hoy <Icon name="arrow" size={16} /></button></div> : <div className="saved-list">{selectedSavedDays.map(({ day: savedDay, devotional: item }) => (
              <article className="saved-card" key={savedDay}>
                <div className="saved-head"><span className="saved-day">Día {savedDay} <span>·</span> {DAYS[savedDay - 1].reading}</span><button className="mini-action" onClick={() => removeSaved(savedDay)} aria-label="Quitar de guardados" title="Quitar de guardados"><Icon name="trash" size={15} /></button></div>
                <strong>{item.title}</strong>
                <p>{item.reflection}</p>
                <button className="saved-open" onClick={() => goToDay(savedDay)}>Volver a esta reflexión <Icon name="arrow" size={15} /></button>
              </article>
            ))}</div>}
          </div>
        )}
        {section === "grupo" && user.role === "admin" && <AdminGroups onError={setSyncError} />}
        {section === "usuarios" && user.role === "admin" && <AdminUsers />}
        {section === "users" && user.role !== "admin" && <MyGroup user={user} />}
        <footer className="app-footer">© {new Date().getFullYear()} Manantial · Todos los derechos reservados · <strong>@luisniquen</strong></footer>
      </main>

      <nav className="mobile-nav" aria-label="Navegación inferior">
        {navItems.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}><Icon name={item.icon} size={20} /><span>{item.label}</span>{item.id === "guardados" && saved.length > 0 && <i />}</button>)}
      </nav>

      {toast && <div className="toast" role="status" key={toast.id}><Icon name="check" size={16} />{toast.message}</div>}
    </div>
  );
}

export default App;
