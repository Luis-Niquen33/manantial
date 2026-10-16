import { useState } from "react";

export default function AuthScreen({ onLogin, connectionError }) {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", groupCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(registering ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar la solicitud.");
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextRegistering) {
    setRegistering(nextRegistering);
    setError("");
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <aside className="auth-aside">
          <a className="brand" href="/">
            <span className="brand-mark"><span /></span>
            <span className="brand-name">manantial<span>.</span><small>Un encuentro cada día</small></span>
          </a>
          <blockquote className="auth-verse">
            <p>“Lámpara es a mis pies tu palabra, y lumbrera a mi camino.”</p>
            <cite>Salmos 119:105</cite>
          </blockquote>
          <ul className="auth-features">
            <li><span>✳</span>Un devocional nuevo cada día</li>
            <li><span>✧</span>La Biblia completa en 365 días</li>
            <li><span>♡</span>Camina junto a tu grupo de fe</li>
          </ul>
        </aside>
        <section className="auth-card">
          <div className="auth-eyebrow"><span className="eyebrow-line" /> Tu camino de fe</div>
          <h1>{registering ? <>Comienza tu <em>recorrido.</em></> : <>Qué bueno tenerte <em>de vuelta.</em></>}</h1>
          <p className="auth-intro">{registering ? "Crea tu cuenta para guardar tu progreso y compartir este camino con tu grupo." : "Inicia sesión para continuar tu recorrido por la Palabra."}</p>
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={!registering} className={!registering ? "active" : ""} onClick={() => switchMode(false)}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={registering} className={registering ? "active" : ""} onClick={() => switchMode(true)}>Crear cuenta</button>
          </div>
          {connectionError && <div className="form-error" role="alert">{connectionError} Inicia el servidor con <code>npm run dev:api</code>.</div>}
          <form className="auth-form" onSubmit={submit}>
            {registering && <label>Tu nombre<input autoComplete="name" maxLength={80} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="¿Cómo te llamas?" /></label>}
            <label>{registering ? "Correo electrónico" : "Correo o usuario"}<input autoComplete={registering ? "email" : "username"} type={registering ? "email" : "text"} autoCapitalize="none" maxLength={254} required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="tu@correo.com" /></label>
            <label>Contraseña<span className="password-field"><input autoComplete={registering ? "new-password" : "current-password"} type={showPassword ? "text" : "password"} minLength={10} maxLength={128} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={registering ? "Al menos 10 caracteres" : "Tu contraseña"} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? "Ocultar" : "Mostrar"}</button></span></label>
            {registering && <label>Código de grupo <span className="optional-label">Opcional</span><input autoCapitalize="characters" maxLength={10} value={form.groupCode} onChange={(event) => setForm({ ...form, groupCode: event.target.value.toUpperCase() })} placeholder="Pídelo al administrador" /></label>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Un momento…" : registering ? "Crear mi cuenta" : "Iniciar sesión"} <span>→</span></button>
          </form>
          <div className="auth-note">El administrador del grupo puede ver tu nombre, correo y avance de lectura. Tus reflexiones guardadas permanecen privadas.</div>
        </section>
      </div>
    </main>
  );
}
