import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { DEPARTAMENTOS, MUNICIPIOS_POR_DEPARTAMENTO, MAX_CUPOS, ADMIN_PIN, EMPTY_FORM } from './data';

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
          <h1 className="header__title">
            Maratón del Conocimiento con Milton Ochoa
          </h1>
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════
   VISTA PÚBLICA — REGISTRO
   ════════════════════════════════════════════ */
function RegistroView({ onAdmin }) {
  // Paso 1: validación de código
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoError, setCodigoError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [codigoValidado, setCodigoValidado] = useState(null); // string con el código aprobado

  // Paso 2: formulario
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState('');

  /* ── Paso 1: verificar código via Edge Function (bypassea RLS) ── */
  async function handleVerificarCodigo(e) {
    e.preventDefault();
    const codigo = codigoInput.trim().toUpperCase();
    if (!codigo) {
      setCodigoError('Ingrese el código de invitación');
      return;
    }
    setVerificando(true);
    setCodigoError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      // Extraer solo el origen (https://xxx.supabase.co) descartando cualquier path
      const supabaseOrigin = new URL(supabaseUrl).origin;
      const res = await fetch(`${supabaseOrigin}/functions/v1/verify-codigo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();

      console.debug('[verificarCodigo]', { status: res.status, data });

      if (!res.ok) {
        console.error('[verificarCodigo] HTTP error:', res.status, data);
        setCodigoError('Error al verificar el código. Intente nuevamente.');
      } else if (!data?.valido) {
        if (data?.motivo === 'ya_usado') {
          setCodigoError('Este código ya fue utilizado');
        } else {
          setCodigoError('Este código no es válido o ya fue utilizado');
        }
      } else {
        setCodigoValidado(codigo);
      }
    } catch (err) {
      console.error('[verificarCodigo] exception:', err);
      setCodigoError('Error de conexión. Intente nuevamente.');
    }
    setVerificando(false);
  }

  /* ── Paso 2: cambios en formulario ── */
  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'departamento') {
      setForm(prev => ({ ...prev, departamento: value, municipio: '' }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (globalError) setGlobalError('');
  }

  function validate() {
    const e = {};
    if (!form.colegio.trim()) e.colegio = 'Ingrese el nombre del colegio';
    if (!form.departamento) e.departamento = 'Seleccione el departamento';
    if (!form.municipio) e.municipio = 'Seleccione el municipio';
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
      // 1. Insertar registro
      const { data: nuevoRegistro, error: insertError } = await supabase
        .from('registros')
        .insert([{
          colegio: form.colegio.trim(),
          departamento: form.departamento,
          municipio: form.municipio,
          codigo_invitacion: codigoValidado,
          nombre_contacto: form.nombre_contacto.trim(),
          cargo_contacto: form.cargo_contacto.trim(),
          numero_contacto: form.numero_contacto.trim(),
          correo: form.correo.trim().toLowerCase(),
        }])
        .select('id')
        .single();

      if (insertError || !nuevoRegistro) {
        if (insertError?.code === '23505') {
          setGlobalError('Este código de invitación ya fue utilizado por otro registro.');
        } else {
          setGlobalError('Error al registrar. Intente nuevamente.');
        }
        setSubmitting(false);
        return;
      }

      const registroId = nuevoRegistro.id;

      // 2. Marcar código como usado (fire-and-forget en paralelo con la edge function)
      const markUsed = supabase
        .from('codigos')
        .update({ usado: true, usado_por: registroId })
        .eq('codigo', codigoValidado);

      // 3. Llamar Edge Function zoom-register
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabaseOrigin = new URL(supabaseUrl).origin;
      const callZoom = fetch(`${supabaseOrigin}/functions/v1/zoom-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          nombre: form.nombre_contacto.trim(),
          correo: form.correo.trim().toLowerCase(),
          registro_id: registroId,
        }),
      });

      await Promise.all([markUsed, callZoom]);

      setSubmitted(true);
      setForm({ ...EMPTY_FORM });
    } catch {
      setGlobalError('Error de conexión. Intente nuevamente.');
    }
    setSubmitting(false);
  }

  return (
    <>
      <Header />

      <div className="event-banner">
        <div className="event-banner__inner">
          <p>
            Registro de cupos para instituciones educativas.
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
              Recibirá un correo con el enlace de acceso a Zoom y los detalles de confirmación.
            </p>
            <button className="result-card__btn" onClick={() => {
              setSubmitted(false);
              setCodigoValidado(null);
              setCodigoInput('');
            }}>
              Registrar otra institución
            </button>
          </div>
        ) : !codigoValidado ? (
          /* ── PASO 1: Verificar código ── */
          <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
            <SectionHeader icon="🎟️" title="Código de invitación" />
            <div className="section-body">
              <p style={{ color: '#555', fontSize: 14, marginBottom: 18, lineHeight: 1.6 }}>
                Para acceder al formulario de registro, ingrese su código de invitación.
              </p>
              <form onSubmit={handleVerificarCodigo}>
                <div style={{ marginBottom: 16 }}>
                  <label className="field__label" htmlFor="codigo_input">
                    Código de invitación <span className="field__required">*</span>
                  </label>
                  <input
                    id="codigo_input"
                    type="text"
                    value={codigoInput}
                    onChange={e => { setCodigoInput(e.target.value); setCodigoError(''); }}
                    placeholder="Ingrese su código"
                    className={`field__input ${codigoError ? 'field__input--error' : ''}`}
                    autoComplete="off"
                    autoFocus
                  />
                  {codigoError && (
                    <p className="field__error" style={{ fontSize: 14, marginTop: 8 }}>
                      {codigoError}
                    </p>
                  )}
                </div>
                <button type="submit" className="submit-btn" disabled={verificando}>
                  {verificando ? 'Verificando...' : 'Verificar código'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ── PASO 2: Formulario completo ── */
          <form onSubmit={handleSubmit} noValidate>
            <div className="card">

              <SectionHeader icon="🏫" title="Datos de la institución" />
              <div className="section-body">
                <div className="field-grid">
                  <FormField label="Nombre Colegio" name="colegio" value={form.colegio}
                    onChange={handleChange} error={errors.colegio}
                    placeholder="Nombre completo de la institución" full />
                  <SelectField label="Departamento" name="departamento" value={form.departamento}
                    onChange={handleChange} error={errors.departamento} options={DEPARTAMENTOS} />
                  <SelectField label="Municipio" name="municipio" value={form.municipio}
                    onChange={handleChange} error={errors.municipio}
                    options={form.departamento ? MUNICIPIOS_POR_DEPARTAMENTO[form.departamento] || [] : []}
                    placeholder={form.departamento ? 'Seleccione municipio' : 'Primero seleccione departamento'}
                    disabled={!form.departamento} />
                </div>
              </div>

              <div className="section-divider" />

              <SectionHeader icon="👤" title="Información de contacto" />
              <div className="section-body">
                <div className="field-grid">
                  <FormField label="Nombre" name="nombre_contacto"
                    value={form.nombre_contacto} onChange={handleChange}
                    error={errors.nombre_contacto} placeholder="Nombre y apellido" />
                  <FormField label="Cargo" name="cargo_contacto"
                    value={form.cargo_contacto} onChange={handleChange}
                    error={errors.cargo_contacto} placeholder="Ej: Rector, Coordinador" />
                  <FormField label="Número Telefónico" name="numero_contacto"
                    value={form.numero_contacto} onChange={handleChange}
                    error={errors.numero_contacto} placeholder="Ej: 3101234567" type="tel" />
                  <FormField label="Correo Electrónico" name="correo"
                    value={form.correo} onChange={handleChange}
                    error={errors.correo} placeholder="correo@ejemplo.com" type="email" />
                </div>
              </div>

              {/* Código validado — solo lectura, informativo */}
              <div style={{ padding: '0 24px 12px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#d0f0e3', color: '#1e7a55', borderRadius: 8,
                  padding: '6px 14px', fontSize: 13, fontWeight: 600,
                }}>
                  ✓ Código verificado: {codigoValidado}
                </span>
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
  const [editando, setEditando] = useState(null);
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

  function exportarExcel() {
    const AZUL  = '0A1F3D';
    const VERDE = '2D9B6F';
    const BLANCO = 'FFFFFF';
    const GRIS  = 'F0F4F8';

    const encabezados = [
      '#', 'Colegio', 'Municipio', 'Departamento',
      'Nombre Contacto', 'Cargo', 'Teléfono', 'Correo',
      'Código', 'Fecha de Registro',
    ];

    const filas = registros.map((r, i) => [
      i + 1,
      r.colegio,
      r.municipio,
      r.departamento,
      r.nombre_contacto,
      r.cargo_contacto,
      r.numero_contacto,
      r.correo,
      r.codigo_invitacion,
      new Date(r.created_at).toLocaleDateString('es-CO'),
    ]);

    // Fila de título
    const titulo = [`Maratón del Conocimiento — Inscritos (${registros.length} de ${MAX_CUPOS})`];
    const datos = [titulo, [], encabezados, ...filas];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datos);

    // Anchos de columna
    ws['!cols'] = [
      { wch: 5 }, { wch: 36 }, { wch: 20 }, { wch: 22 },
      { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 30 },
      { wch: 16 }, { wch: 18 },
    ];

    // Merge para el título (fila 1, cols A-J)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

    // Estilo celda título
    const celdaTitulo = ws['A1'];
    if (celdaTitulo) {
      celdaTitulo.s = {
        font: { bold: true, sz: 14, color: { rgb: BLANCO }, name: 'Calibri' },
        fill: { fgColor: { rgb: AZUL } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Estilos encabezados (fila 3)
    encabezados.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 2, c: ci });
      if (!ws[ref]) return;
      ws[ref].s = {
        font: { bold: true, sz: 11, color: { rgb: BLANCO }, name: 'Calibri' },
        fill: { fgColor: { rgb: VERDE } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          bottom: { style: 'thin', color: { rgb: BLANCO } },
          right:  { style: 'thin', color: { rgb: BLANCO } },
        },
      };
    });

    // Estilos filas de datos (alternadas)
    filas.forEach((_, ri) => {
      const rowIdx = ri + 3;
      const esPar = ri % 2 === 0;
      encabezados.forEach((__, ci) => {
        const ref = XLSX.utils.encode_cell({ r: rowIdx, c: ci });
        if (!ws[ref]) return;
        ws[ref].s = {
          font: { sz: 10, name: 'Calibri', color: { rgb: ci === 0 ? VERDE : '1A1A2E' } },
          fill: { fgColor: { rgb: esPar ? GRIS : BLANCO } },
          alignment: {
            horizontal: ci === 0 ? 'center' : 'left',
            vertical: 'center',
            wrapText: ci === 1,
          },
          border: {
            bottom: { style: 'hair', color: { rgb: 'CCCCCC' } },
            right:  { style: 'hair', color: { rgb: 'CCCCCC' } },
          },
        };
      });
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `maraton-inscritos-${fecha}.xlsx`);
  }

  async function handleDelete(id) {
    await supabase.from('codigos').update({ usado: false, usado_por: null }).eq('usado_por', id);
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

  const byDepartamento = DEPARTAMENTOS.map(dep => ({
    name: dep.length > 15 ? dep.slice(0, 14) + '…' : dep,
    fullName: dep,
    count: registros.filter(r => r.departamento === dep).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  const searchLower = search.toLowerCase();
  const filtered = search
    ? registros.filter(r =>
        (r.colegio || '').toLowerCase().includes(searchLower) ||
        (r.codigo_invitacion || '').toLowerCase().includes(searchLower) ||
        (r.nombre_contacto || '').toLowerCase().includes(searchLower) ||
        (r.departamento || '').toLowerCase().includes(searchLower) ||
        (r.municipio || '').toLowerCase().includes(searchLower) ||
        (r.correo || '').toLowerCase().includes(searchLower)
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

  const BAR_COLORS = ['#2D9B6F', '#1e7a55', '#0A1F3D', '#0A1F3D', '#2980b9', '#27ae60'];

  return (
    <>
      <Header />

      <div className="admin-bar">
        <div className="admin-bar__inner">
          <span className="admin-bar__badge">Panel Administrador</span>
          <button className="admin-bar__logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>

      <main className="main">

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card__label">Total inscritos</div>
            <div className="stat-card__value" style={{ color: '#2D9B6F' }}>{total}</div>
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
            <div className="stat-card__value" style={{ color: '#0A1F3D' }}>{MAX_CUPOS - total}</div>
            <div className="stat-card__sub">{pct.toFixed(1)}% ocupado</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Departamentos</div>
            <div className="stat-card__value" style={{ color: '#0A1F3D' }}>{byDepartamento.length}</div>
            <div className="stat-card__sub">con registros</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <SectionHeader icon="📊" title="Registros por departamento" />
          <div className="section-body">
            {byDepartamento.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 24 }}>Aún no hay registros.</p>
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

        <div className="card">
          <SectionHeader icon="📋" title={`Listado de inscripciones (${filtered.length})`} />
          <div className="section-body" style={{ padding: '12px 24px 24px' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="text"
                className="field__input"
                placeholder="Buscar por colegio, código, contacto, municipio, departamento o correo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={exportarExcel}
                disabled={registros.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#0A1F3D', color: '#fff',
                  border: 'none', borderRadius: 8,
                  padding: '10px 18px', fontWeight: 700, fontSize: 13,
                  cursor: registros.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: registros.length === 0 ? 0.5 : 1,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                ⬇ Descargar Excel
              </button>
            </div>

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
                        <td>{r.municipio}</td>
                        <td>{r.departamento}</td>
                        <td>{r.nombre_contacto}</td>
                        <td>{r.cargo_contacto}</td>
                        <td>{r.numero_contacto}</td>
                        <td>{r.correo}</td>
                        <td>{r.codigo_invitacion}</td>
                        <td className="td-date">{new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                        <td className="td-actions">
                          <button className="action-btn action-btn--edit" onClick={() => setEditando({ ...r })} title="Editar">✏️</button>
                          <button className="action-btn action-btn--delete" onClick={() => setConfirmDelete(r)} title="Eliminar">🗑️</button>
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

      {editando && (
        <EditModal
          registro={editando}
          onCancel={() => setEditando(null)}
          onSave={handleSaveEdit}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title" style={{ color: '#e74c3c' }}>Confirmar eliminación</h3>
            <p style={{ margin: '12px 0 20px', fontSize: 15, lineHeight: 1.5 }}>
              ¿Está seguro de eliminar el registro de <strong>{confirmDelete.colegio}</strong>?
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
            <FormField label="Colegio" name="colegio" value={form.colegio || ''} onChange={handleChange} full />
            <FormField label="Municipio" name="municipio" value={form.municipio || ''} onChange={handleChange} />
            <SelectField label="Departamento" name="departamento" value={form.departamento || ''} onChange={handleChange} options={DEPARTAMENTOS} />
            <FormField label="Código invitación" name="codigo_invitacion" value={form.codigo_invitacion || ''} onChange={handleChange} />
            <FormField label="Nombre contacto" name="nombre_contacto" value={form.nombre_contacto || ''} onChange={handleChange} />
            <FormField label="Cargo contacto" name="cargo_contacto" value={form.cargo_contacto || ''} onChange={handleChange} />
            <FormField label="Teléfono" name="numero_contacto" value={form.numero_contacto || ''} onChange={handleChange} type="tel" />
            <FormField label="Correo" name="correo" value={form.correo || ''} onChange={handleChange} type="email" full />
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

function SelectField({ label, name, value, onChange, error, options, placeholder, disabled }) {
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
        disabled={disabled}
        className={`field__select ${error ? 'field__select--error' : ''} ${!value ? 'field__select--placeholder' : ''} ${disabled ? 'field__select--disabled' : ''}`}
      >
        <option value="" disabled>{placeholder || `Seleccione ${label.toLowerCase()}`}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
