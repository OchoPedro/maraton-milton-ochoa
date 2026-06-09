import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from './supabase';
import { DEPARTAMENTOS, MAX_CUPOS, ADMIN_PIN, EMPTY_FORM } from './data';

/* ════════════════════════════════════════════
   APP PRINCIPAL
   ════════════════════════════════════════════ */
export default function App() {
  const [view, setView] = useState('registro'); // registro | admin-login | admin

  return (
    <>
      {view === 'registro' && <RegistroView onAdmin={() => setView('admin-login')} />}
      {view === 'admin-login' && <AdminLogin onBack={() => setView('registro')} onSuccess={() => setView('admin')} />}
      {view === 'admin' && <AdminDashboard onLogout={() => setView('registro')} />}
    </>
  );
}

/* ════════════════════════════════════════════
   HEADER COMPARTIDO
   ════════════════════════════════════════════ */
function Header() {
  return (
    <header className="header">
      <div className="header__circle-1" />
      <div className="header__circle-2" />
      <div className="header__inner">
        <div className="header__brand">
          <img src="/logo-milton-ochoa.png" alt="Milton Ochoa" className="header__logo" />
          <div className="header__tagline">Expertos en Evaluación</div>
        </div>
        <h1 className="header__title">
          Maratón del Conocimiento<br /><span>con Milton Ochoa</span>
        </h1>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════
   VISTA PÚBLICA — REGISTRO
   ════════════════════════════════════════════ */
function RegistroView({ onAdmin }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (globalError) setGlobalError('');
  }

  function validate() {
    const e = {};
    if (!form.nit.trim()) e.nit = 'Ingrese el NIT de la institución';
    if (!form.colegio.trim()) e.colegio = 'Ingrese el nombre del colegio';
    if (!form.municipio.trim()) e.municipio = 'Ingrese el municipio';
    if (!form.departamento) e.departamento = 'Seleccione el departamento';
    if (!form.codigo_invitacion.trim()) e.codigo_invitacion = 'Ingrese el código de invitación';
    if (!form.nombre_contacto.trim()) e.nombre_contacto = 'Ingrese el nombre de contacto';
    if (!form.cargo_contacto.trim()) e.cargo_contacto = 'Ingrese el cargo';
    if (!form.numero_contacto.trim()) e.numero_contacto = 'Ingrese el número de contacto';
    else if (!/^\d{7,15}$/.test(form.numero_contacto.replace(/\s/g, '')))
      e.numero_contacto = 'Número inválido (solo dígitos, 7-15)';
    if (!form.correo.trim()) e.correo = 'Ingrese el correo electrónico';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo))
      e.correo = 'Formato de correo inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setGlobalError('');

    try {
      const { error } = await supabase.from('registros').insert([{
        nit: form.nit.trim(),
        colegio: form.colegio.trim(),
        municipio: form.municipio.trim(),
        departamento: form.departamento,
        codigo_invitacion: form.codigo_invitacion.trim(),
        nombre_contacto: form.nombre_contacto.trim(),
        cargo_contacto: form.cargo_contacto.trim(),
        numero_contacto: form.numero_contacto.trim(),
        correo: form.correo.trim().toLowerCase(),
      }]);

      if (error) {
        setGlobalError('Error al registrar. Intente nuevamente.');
      } else {
        setSubmitted(true);
        setForm({ ...EMPTY_FORM });
      }
    } catch {
      setGlobalError('Error de conexión. Intente nuevamente.');
    }
    setSubmitting(false);
  }

  return (
    <>
      <Header />

      {/* Descripción del evento */}
      <div className="event-banner">
        <div className="event-banner__inner">
          <p>
            Registro de cupos para instituciones educativas y directivos.
            Complete el formulario para asegurar la participación de su institución.
          </p>
        </div>
      </div>

      <main className="main">
        {submitted ? (
          <div className="result-card result-card--success">
            <div className="result-card__icon result-card__icon--success">✓</div>
            <h2 className="result-card__title result-card__title--success">¡Registro exitoso!</h2>
            <p className="result-card__text">
              Su institución ha sido inscrita en la Maratón del Conocimiento con Milton Ochoa.
              Recibirá un correo con los detalles de confirmación.
            </p>
            <button className="result-card__btn" onClick={() => setSubmitted(false)}>
              Registrar otra institución
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="card">

              <SectionHeader icon="🏫" title="Datos de la institución" />
              <div className="section-body">
                <div className="field-grid">
                  <FormField label="NIT Institución" name="nit" value={form.nit}
                    onChange={handleChange} error={errors.nit} placeholder="Ej: 890.123.456-7" />
                  <FormField label="Nombre Colegio" name="colegio" value={form.colegio}
                    onChange={handleChange} error={errors.colegio}
                    placeholder="Nombre completo de la institución" full />
                  <FormField label="Municipio" name="municipio" value={form.municipio}
                    onChange={handleChange} error={errors.municipio} placeholder="Ej: Bucaramanga" />
                  <SelectField label="Departamento" name="departamento" value={form.departamento}
                    onChange={handleChange} error={errors.departamento} options={DEPARTAMENTOS} />
                </div>
              </div>

              <div className="section-divider" />

              <SectionHeader icon="🎟️" title="Código de invitación" />
              <div className="section-body">
                <div className="field-grid">
                  <FormField label="Código de invitación" name="codigo_invitacion"
                    value={form.codigo_invitacion} onChange={handleChange}
                    error={errors.codigo_invitacion} placeholder="Ingrese su código" />
                </div>
              </div>

              <div className="section-divider" />

              <SectionHeader icon="👤" title="Información de contacto" />
              <div className="section-body">
                <div className="field-grid">
                  <FormField label="Nombre contacto" name="nombre_contacto"
                    value={form.nombre_contacto} onChange={handleChange}
                    error={errors.nombre_contacto} placeholder="Nombre y apellido" />
                  <FormField label="Cargo contacto" name="cargo_contacto"
                    value={form.cargo_contacto} onChange={handleChange}
                    error={errors.cargo_contacto} placeholder="Ej: Rector, Coordinador" />
                  <FormField label="Número de contacto" name="numero_contacto"
                    value={form.numero_contacto} onChange={handleChange}
                    error={errors.numero_contacto} placeholder="Ej: 3101234567" type="tel" />
                  <FormField label="Correo electrónico" name="correo"
                    value={form.correo} onChange={handleChange}
                    error={errors.correo} placeholder="correo@ejemplo.com" type="email" />
                </div>
              </div>

              {globalError && (
                <div className="global-error">{globalError}</div>
              )}

              <div className="submit-area">
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Confirmar inscripción'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <footer className="footer">
        <p className="footer__text">
          © 2026 Milton Ochoa — Expertos en Evaluación
        </p>
        <button className="footer__admin-link" onClick={onAdmin} title="Acceso administrador">
          🔒 Admin
        </button>
      </footer>
    </>
  );
}

/* ════════════════════════════════════════════
   ADMIN LOGIN
   ════════════════════════════════════════════ */
function AdminLogin({ onBack, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleLogin(e) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
    } else {
      setError('PIN incorrecto');
      setPin('');
    }
  }

  return (
    <>
      <Header />
      <main className="main">
        <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
          <SectionHeader icon="🔐" title="Acceso administrador" />
          <div className="section-body">
            <form onSubmit={handleLogin}>
              <FormField
                label="PIN de administrador"
                name="pin"
                type="password"
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                error={error}
                placeholder="Ingrese el PIN"
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn-secondary" onClick={onBack}>
                  Volver
                </button>
                <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

/* ════════════════════════════════════════════
   ADMIN DASHBOARD
   ════════════════════════════════════════════ */
function AdminDashboard({ onLogout }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);    // registro en edición
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRegistros();

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, () => {
        fetchRegistros();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchRegistros() {
    try {
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setRegistros(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    await supabase.from('registros').delete().eq('id', id);
    setConfirmDelete(null);
    fetchRegistros();
  }

  async function handleSaveEdit(updated) {
    const { id, created_at, ...fields } = updated;
    await supabase.from('registros').update(fields).eq('id', id);
    setEditando(null);
    fetchRegistros();
  }

  /* Datos para la gráfica */
  const byDepartamento = DEPARTAMENTOS.map(dep => ({
    name: dep.length > 15 ? dep.slice(0, 14) + '…' : dep,
    fullName: dep,
    count: registros.filter(r => r.departamento === dep).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  /* Filtrar registros */
  const searchLower = search.toLowerCase();
  const filtered = search
    ? registros.filter(r =>
        r.colegio.toLowerCase().includes(searchLower) ||
        r.nit.toLowerCase().includes(searchLower) ||
        r.nombre_contacto.toLowerCase().includes(searchLower) ||
        r.departamento.toLowerCase().includes(searchLower) ||
        r.municipio.toLowerCase().includes(searchLower) ||
        r.correo.toLowerCase().includes(searchLower)
      )
    : registros;

  const total = registros.length;
  const pct = Math.min((total / MAX_CUPOS) * 100, 100);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <div className="loading__text">Cargando panel...</div>
      </div>
    );
  }

  const BAR_COLORS = ['#7AC001', '#5fa000', '#14405B', '#1b5a7e', '#2980b9', '#27ae60'];

  return (
    <>
      <Header />

      {/* Barra admin */}
      <div className="admin-bar">
        <div className="admin-bar__inner">
          <span className="admin-bar__badge">Panel Administrador</span>
          <button className="admin-bar__logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>

      <main className="main">

        {/* ── Tarjetas de resumen ── */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card__label">Total inscritos</div>
            <div className="stat-card__value" style={{ color: '#7AC001' }}>{total}</div>
            <div className="stat-card__sub">de {MAX_CUPOS} cupos</div>
            <div className="progress__bar" style={{ marginTop: 10 }}>
              <div
                className={`progress__fill ${pct >= 90 ? 'progress__fill--critical' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Cupos disponibles</div>
            <div className="stat-card__value" style={{ color: '#14405B' }}>{MAX_CUPOS - total}</div>
            <div className="stat-card__sub">{pct.toFixed(1)}% ocupado</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Departamentos</div>
            <div className="stat-card__value" style={{ color: '#14405B' }}>{byDepartamento.length}</div>
            <div className="stat-card__sub">con registros</div>
          </div>
        </div>

        {/* ── Gráfica por departamento ── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <SectionHeader icon="📊" title="Registros por departamento" />
          <div className="section-body">
            {byDepartamento.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 24 }}>
                Aún no hay registros.
              </p>
            ) : (
              <div style={{ width: '100%', height: Math.max(300, byDepartamento.length * 38) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDepartamento} layout="vertical" margin={{ left: 10, right: 24, top: 8, bottom: 8 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name, props) => [value, props.payload.fullName]}
                      contentStyle={{ borderRadius: 8, fontSize: 14 }}
                    />
                    <Bar dataKey="count" name="Registros" radius={[0, 6, 6, 0]} barSize={24}>
                      {byDepartamento.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabla de registros ── */}
        <div className="card">
          <SectionHeader icon="📋" title={`Listado de inscripciones (${filtered.length})`} />
          <div className="section-body" style={{ padding: '12px 24px 24px' }}>
            <input
              type="text"
              className="field__input"
              placeholder="Buscar por colegio, NIT, contacto, municipio, departamento o correo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            {filtered.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 24 }}>
                {search ? 'No se encontraron resultados.' : 'Aún no hay registros.'}
              </p>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Colegio</th>
                      <th>NIT</th>
                      <th>Municipio</th>
                      <th>Depto.</th>
                      <th>Contacto</th>
                      <th>Cargo</th>
                      <th>Teléfono</th>
                      <th>Correo</th>
                      <th>Código</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td className="td-bold">{r.colegio}</td>
                        <td>{r.nit}</td>
                        <td>{r.municipio}</td>
                        <td>{r.departamento}</td>
                        <td>{r.nombre_contacto}</td>
                        <td>{r.cargo_contacto}</td>
                        <td>{r.numero_contacto}</td>
                        <td>{r.correo}</td>
                        <td>{r.codigo_invitacion}</td>
                        <td className="td-date">{new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                        <td className="td-actions">
                          <button className="action-btn action-btn--edit" onClick={() => setEditando({ ...r })} title="Editar">
                            ✏️
                          </button>
                          <button className="action-btn action-btn--delete" onClick={() => setConfirmDelete(r)} title="Eliminar">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modal Editar ── */}
      {editando && (
        <EditModal
          registro={editando}
          onCancel={() => setEditando(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* ── Modal Confirmar Eliminar ── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title" style={{ color: '#e74c3c' }}>Confirmar eliminación</h3>
            <p style={{ margin: '12px 0 20px', fontSize: 15, lineHeight: 1.5 }}>
              ¿Está seguro de eliminar el registro de <strong>{confirmDelete.colegio}</strong> ({confirmDelete.nit})?
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p className="footer__text">© 2026 Milton Ochoa — Expertos en Evaluación · Panel Administrador</p>
      </footer>
    </>
  );
}

/* ════════════════════════════════════════════
   MODAL DE EDICIÓN
   ════════════════════════════════════════════ */
function EditModal({ registro, onCancel, onSave }) {
  const [form, setForm] = useState({ ...registro });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">Editar registro</h3>
        <form onSubmit={handleSubmit}>
          <div className="field-grid" style={{ marginTop: 16 }}>
            <FormField label="NIT" name="nit" value={form.nit} onChange={handleChange} />
            <FormField label="Colegio" name="colegio" value={form.colegio} onChange={handleChange} full />
            <FormField label="Municipio" name="municipio" value={form.municipio} onChange={handleChange} />
            <SelectField label="Departamento" name="departamento" value={form.departamento} onChange={handleChange} options={DEPARTAMENTOS} />
            <FormField label="Código invitación" name="codigo_invitacion" value={form.codigo_invitacion} onChange={handleChange} />
            <FormField label="Nombre contacto" name="nombre_contacto" value={form.nombre_contacto} onChange={handleChange} />
            <FormField label="Cargo contacto" name="cargo_contacto" value={form.cargo_contacto} onChange={handleChange} />
            <FormField label="Teléfono" name="numero_contacto" value={form.numero_contacto} onChange={handleChange} type="tel" />
            <FormField label="Correo" name="correo" value={form.correo} onChange={handleChange} type="email" full />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="submit-btn" disabled={saving}
              style={{ width: 'auto', padding: '12px 32px' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   COMPONENTES COMPARTIDOS
   ════════════════════════════════════════════ */
function SectionHeader({ icon, title }) {
  return (
    <div className="section-header">
      <span className="section-header__icon">{icon}</span>
      <h2 className="section-header__title">{title}</h2>
    </div>
  );
}

function FormField({ label, name, value, onChange, error, placeholder, type = 'text', full }) {
  return (
    <div className={full ? 'field--full' : ''}>
      <label className="field__label" htmlFor={name}>
        {label} <span className="field__required">*</span>
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`field__input ${error ? 'field__input--error' : ''}`}
      />
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, error, options }) {
  return (
    <div>
      <label className="field__label" htmlFor={name}>
        {label} <span className="field__required">*</span>
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`field__select ${error ? 'field__select--error' : ''} ${!value ? 'field__select--placeholder' : ''}`}
      >
        <option value="" disabled>Seleccione departamento</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
