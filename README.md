# Maratón del Conocimiento con Milton Ochoa — Registro de Cupos

Página de inscripción para instituciones educativas. Capacidad: 1,000 cupos.

## Stack
- **Frontend:** React 18 + Vite 5 + Recharts
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Deploy:** Vercel

---

## 1. Configurar Supabase

En tu proyecto de Supabase, ve al **SQL Editor** y ejecuta:

```sql
CREATE TABLE registros (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  colegio TEXT NOT NULL,
  municipio TEXT NOT NULL,
  departamento TEXT NOT NULL,
  codigo_invitacion TEXT NOT NULL,
  nombre_contacto TEXT NOT NULL,
  cargo_contacto TEXT NOT NULL,
  numero_contacto TEXT NOT NULL,
  correo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Códigos de invitación: cada registro consume un código (usado=true, usado_por=id del registro).
-- La app valida el código en el registro y lo libera (usado=false) si se elimina el registro.
CREATE TABLE codigos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  usado BOOLEAN NOT NULL DEFAULT false,
  usado_por BIGINT REFERENCES registros(id)
);
ALTER TABLE codigos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir validar y consumir códigos" ON codigos FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime para la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE registros;

-- RLS: permitir lectura e inserciones desde el frontend
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir contar registros" ON registros
  FOR SELECT USING (true);

CREATE POLICY "Permitir insertar registros" ON registros
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizar registros" ON registros
  FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminar registros" ON registros
  FOR DELETE USING (true);
```

> **Nota:** Las políticas de UPDATE y DELETE son abiertas para simplificar.
> En producción, se recomienda restringir con autenticación de Supabase Auth.

## 2. Subir a GitHub

```bash
cd maraton-milton-ochoa
git init
git add .
git commit -m "Maratón del Conocimiento con Milton Ochoa"
git remote add origin https://github.com/TU_USUARIO/maraton-milton-ochoa.git
git branch -M main
git push -u origin main
```

## 3. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
2. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` → la URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` → la clave anon/public de tu proyecto
   - `VITE_ADMIN_PIN` → el PIN para acceder al panel de administrador
3. Deploy. Vercel detectará Vite automáticamente.

## 4. Variables de entorno (desarrollo local)

Crea un archivo `.env` en la raíz:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
VITE_ADMIN_PIN=1234
```

Luego:

```bash
npm install
npm run dev
```

## Panel de Administrador

Acceso desde el enlace **🔒 Admin** en el footer de la página pública.

Funcionalidades:
- Contador de cupos registrados vs disponibles
- Gráfica de barras de registros por departamento
- Tabla con todos los registros (buscador incluido)
- Editar cualquier registro
- Eliminar registros con confirmación
- Actualización en tiempo real vía Supabase Realtime
