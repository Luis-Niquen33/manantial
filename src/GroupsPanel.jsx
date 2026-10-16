import { useEffect, useState } from "react";

async function apiRequest(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "No se pudo completar la solicitud.");
  return data;
}

export function AdminGroups({ onError }) {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/api/groups");
      setGroups(result.groups);
    } catch (requestError) {
      setError(requestError.message);
      onError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function createGroup(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await apiRequest("/api/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setGroups((previous) => [result.group, ...previous]);
      setName("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => current === code ? "" : current), 1800);
    } catch (requestError) {
      setError(`No se pudo copiar el código. Cópialo manualmente: ${code}`);
    }
  }

  const members = groups.reduce((sum, group) => sum + group.members.length, 0);
  const averageProgress = members
    ? Math.round(groups.reduce((sum, group) => sum + group.members.reduce((sub, member) => sub + member.progress, 0), 0) / members)
    : 0;

  return (
    <div className="page-content secondary-page">
      <div className="eyebrow"><span className="eyebrow-line" /> ACOMPAÑAMIENTO Y COMUNIDAD</div>
      <h1>Crezcan <em>juntos.</em></h1>
      <p className="secondary-intro">Crea grupos, comparte un código de invitación y acompaña el recorrido bíblico de cada persona.</p>
      <div className="plan-summary admin-summary">
        <div><strong>{groups.length}</strong><small>GRUPOS</small></div>
        <div><strong>{members}</strong><small>PARTICIPANTES</small></div>
        <div><strong>{averageProgress}<span>%</span></strong><small>AVANCE PROMEDIO</small></div>
      </div>
      <form className="group-create-form" onSubmit={createGroup}>
        <label htmlFor="group-name">Crear un grupo</label>
        <div><input id="group-name" maxLength={80} minLength={2} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Comunidad de los martes" /><button type="submit">Crear grupo <span>+</span></button></div>
      </form>
      {error && <div className="form-error group-error" role="alert">{error}</div>}
      {loading ? <div className="group-loading">Cargando grupos…</div> : groups.length === 0 ? <div className="empty-state"><span className="empty-icon">✳</span><h2>Aún no hay grupos</h2><p>Crea un grupo para obtener un código de invitación y comenzar a acompañar a sus participantes.</p></div> : <div className="admin-groups-list">
        {groups.map((group) => {
          const groupAverage = group.members.length ? Math.round(group.members.reduce((sum, member) => sum + member.progress, 0) / group.members.length) : 0;
          return <section className="admin-group-card" key={group.id}>
            <div className="admin-group-head"><div><span className="admin-group-kicker">GRUPO DE LECTURA</span><h2>{group.name}</h2></div><div className="group-code"><span>CÓDIGO DE INVITACIÓN</span><button onClick={() => copyCode(group.code)} title="Copiar código">{group.code} <span>{copiedCode === group.code ? "¡Copiado!" : "Copiar"}</span></button></div></div>
            <div className="group-stats"><span><strong>{group.members.length}</strong> {group.members.length === 1 ? "participante" : "participantes"}</span><span><strong>{groupAverage}%</strong> avance promedio</span><button className="group-refresh" onClick={refresh}>Actualizar</button></div>
            {group.members.length === 0 ? <p className="group-empty">Cuando alguien se una con el código, su avance aparecerá aquí.</p> : <div className="member-list"><div className="member-list-heading"><span>PARTICIPANTE</span><span>PROGRESO DEL PLAN</span></div>
              {group.members.map((member) => <div className="member-row" key={member.id}><div className="member-identity"><span className="member-avatar">{member.name.slice(0, 1).toUpperCase()}</span><span><strong>{member.name}</strong><small>{member.email}</small></span></div><div className="member-progress"><div className="member-progress-bar"><span style={{ width: `${member.progress}%` }} /></div><strong>{member.completedCount} / 365</strong></div></div>)}
            </div>}
          </section>;
        })}
      </div>}
    </div>
  );
}

export function MyGroup({ user }) {
  const [group, setGroup] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiRequest("/api/groups/mine")
      .then((result) => setGroup(result.group))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  async function joinGroup(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/api/groups/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setGroup(result.group);
      setMessage(`Ya formas parte de ${result.group.name}.`);
      setCode("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) return <div className="page-content secondary-page"><div className="group-loading">Cargando tu grupo…</div></div>;
  return (
    <div className="page-content secondary-page">
      <div className="eyebrow"><span className="eyebrow-line" /> CAMINAMOS EN COMUNIDAD</div>
      <h1>Tu grupo de <em>fe.</em></h1>
      <p className="secondary-intro">Comparte el recorrido bíblico con tu comunidad y avancen juntos, un día a la vez.</p>
      {group ? <section className="my-group-card"><span className="admin-group-kicker">TU COMUNIDAD</span><h2>{group.name}</h2><p>Estás participando como <strong>{user.name}</strong>. El administrador puede acompañar tu avance de lectura para animarte en el camino.</p><div className="privacy-note">Tus reflexiones guardadas y oraciones permanecen privadas. El administrador ve tu nombre y avance de lectura.</div></section> : <form className="join-group-card" onSubmit={joinGroup}><span className="admin-group-kicker">TIENES UNA INVITACIÓN</span><h2>Únete a tu comunidad</h2><p>Pídele el código al administrador de tu grupo para compartir el recorrido.</p><label htmlFor="invite-code">Código de invitación</label><div><input id="invite-code" autoCapitalize="characters" maxLength={10} required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ej. A1B2C3D4" /><button type="submit">Unirme al grupo <span>→</span></button></div></form>}
      {error && <div className="form-error group-error" role="alert">{error}</div>}
      {message && <div className="form-success" role="status">{message}</div>}
    </div>
  );
}

function generatePassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

const EMPTY_USER = { name: "", email: "", password: "", groupId: "" };

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(EMPTY_USER);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [userResult, groupResult] = await Promise.all([apiRequest("/api/users"), apiRequest("/api/groups")]);
      setUsers(userResult.users);
      setGroups(groupResult.groups);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function createUser(event) {
    event.preventDefault();
    setError("");
    setCreated(null);
    setSaving(true);
    try {
      const result = await apiRequest("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      setUsers((previous) => [result.user, ...previous]);
      setCreated({ name: result.user.name, email: result.user.email, password: form.password });
      setCopied(false);
      setForm(EMPTY_USER);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeGroup(user, groupId) {
    setError("");
    try {
      const result = await apiRequest(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      setUsers((previous) => previous.map((item) => item.id === user.id ? result.user : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeUser(user) {
    if (!window.confirm(`¿Eliminar la cuenta de ${user.name}? Se perderá su progreso.`)) return;
    setError("");
    try {
      await apiRequest(`/api/users/${user.id}`, { method: "DELETE" });
      setUsers((previous) => previous.filter((item) => item.id !== user.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function copyCredentials() {
    const text = `Manantial — tu acceso\nCorreo: ${created.email}\nContraseña: ${created.password}\n${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("No se pudo copiar. Copia los datos manualmente.");
    }
  }

  const search = query.trim().toLowerCase();
  const visibleUsers = search ? users.filter((user) => `${user.name} ${user.email} ${user.groupName ?? ""}`.toLowerCase().includes(search)) : users;
  const withoutGroup = users.filter((user) => !user.groupId).length;

  return (
    <div className="page-content secondary-page">
      <div className="eyebrow"><span className="eyebrow-line" /> Administración</div>
      <h1>Personas de tu <em>comunidad.</em></h1>
      <p className="secondary-intro">Crea cuentas para los participantes, asígnalas a un grupo y acompaña su avance.</p>
      <div className="plan-summary admin-summary">
        <div><strong>{users.length}</strong><small>Usuarios</small></div>
        <div><strong>{groups.length}</strong><small>Grupos</small></div>
        <div><strong>{withoutGroup}</strong><small>Sin grupo</small></div>
      </div>

      <form className="user-create-form" onSubmit={createUser}>
        <div className="user-form-head"><strong>Crear un usuario</strong><span>La persona podrá iniciar sesión con este correo y contraseña.</span></div>
        <div className="user-form-grid">
          <label>Nombre<input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre y apellido" /></label>
          <label>Correo electrónico<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="persona@correo.com" /></label>
          <label>Contraseña<span className="password-field"><input required minLength={10} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Mínimo 10 caracteres" /><button type="button" className="password-toggle" onClick={() => setForm({ ...form, password: generatePassword() })}>Generar</button></span></label>
          <label>Grupo<select value={form.groupId} onChange={(event) => setForm({ ...form, groupId: event.target.value })}><option value="">Sin grupo</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        </div>
        {groups.length === 0 && !loading && <p className="user-form-hint">Consejo: crea primero un grupo en la sección «Grupos» para poder asignarlo aquí.</p>}
        <button className="user-submit" type="submit" disabled={saving}>{saving ? "Creando…" : "Crear usuario"} <span>+</span></button>
      </form>

      {created && (
        <div className="created-card" role="status">
          <div><strong>Cuenta creada para {created.name}</strong><span>Comparte estos datos de acceso. La contraseña no se volverá a mostrar.</span></div>
          <code>{created.email}<br />{created.password}</code>
          <button onClick={copyCredentials}>{copied ? "¡Copiado!" : "Copiar acceso"}</button>
        </div>
      )}
      {error && <div className="form-error group-error" role="alert">{error}</div>}

      <section className="admin-group-card users-card">
        <div className="users-card-head">
          <div><span className="admin-group-kicker">Directorio</span><h2>Usuarios registrados</h2></div>
          <label className="search-field"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo o grupo…" aria-label="Buscar usuarios" /></label>
        </div>
        {loading ? <div className="group-loading">Cargando usuarios…</div> : visibleUsers.length === 0 ? <p className="group-empty">{users.length === 0 ? "Aún no hay usuarios. Crea el primero con el formulario de arriba." : "Nadie coincide con tu búsqueda."}</p> : (
          <div className="member-list">
            <div className="member-list-heading user-row"><span>Usuario</span><span>Grupo</span><span>Avance</span><span /></div>
            {visibleUsers.map((user) => (
              <div className="member-row user-row" key={user.id}>
                <div className="member-identity"><span className="member-avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
                <select className="group-select" value={user.groupId ?? ""} onChange={(event) => changeGroup(user, event.target.value)} aria-label={`Grupo de ${user.name}`}><option value="">Sin grupo</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                <div className="member-progress"><div className="member-progress-bar"><span style={{ width: `${user.progress}%` }} /></div><strong>{user.completedCount}/365</strong></div>
                <button className="user-delete" onClick={() => removeUser(user)} aria-label={`Eliminar a ${user.name}`} title="Eliminar usuario">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
