import { useState } from "react";

export default function AuthScreen({ onLogin, connectionError }) {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", groupCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="/">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">manantial<span>.</span><small>UN ENCUENTRO CADA DÍA</small></span>
        </a>
        <div className="auth-eyebrow"><span className="eyebrow-line" /> TU CAMINO DE FE</div>
        <h1>{registering ? <>Comienza tu <em>recorrido.</em></> : <>Qué bueno tenerte <em>de vuelta.</em></>}</h1>
        <p className="auth-intro">{registering ? "Crea tu cuenta para guardar tu progreso y compartir este camino con tu grupo." : "Inicia sesión para continuar tu recorrido por la Palabra."}</p>
        {connectionError && <div className="form-error" role="alert">{connectionError} Inicia el servidor con <code>npm run dev:api</code>.</div>}
        <form className="auth-form" onSubmit={submit}>
          {registering && <label>Tu nombre<input autoComplete="name" maxLength={80} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="¿Cómo te llamas?" /></label>}
          <label>Correo electrónico<input autoComplete="email" type="email" maxLength={254} required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="tu@correo.com" /></label>
          <label>Contraseña<input autoComplete={registering ? "new-password" : "current-password"} type="password" minLength={10} maxLength={128} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={registering ? "Al menos 10 caracteres" : "Tu contraseña"} /></label>
          {registering && <label>Código de grupo <span className="optional-label">OPCIONAL</span><input autoCapitalize="characters" maxLength={10} value={form.groupCode} onChange={(event) => setForm({ ...form, groupCode: event.target.value.toUpperCase() })} placeholder="Pídelo al administrador" /></label>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Un momento…" : registering ? "Crear mi cuenta" : "Iniciar sesión"} <span>→</span></button>
        </form>
        <div className="auth-switch">{registering ? "¿Ya tienes cuenta?" : "¿Es tu primera vez?"} <button onClick={() => { setRegistering(!registering); setError(""); }}> {registering ? "Inicia sesión" : "Crear cuenta"}</button></div>
        <div className="auth-note">El administrador del grupo puede ver tu nombre, correo y avance de lectura. Tus reflexiones guardadas permanecen privadas.</div>
      </section>
    </main>
  );
}
