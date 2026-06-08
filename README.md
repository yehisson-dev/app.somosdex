# Cowork Agency

Plataforma interna de gestión de proyectos para agencia de marketing digital.

## Stack

- **Next.js 14** — App Router + TypeScript
- **Supabase** — PostgreSQL + Auth + RLS + Storage
- **NextAuth.js v5** — Google OAuth
- **Tailwind CSS** — Estilos
- **@dnd-kit** — Drag & drop Kanban
- **Zustand** — Estado global
- **Sonner** — Notificaciones toast

## Requisitos

- Node.js 18+
- pnpm 8+
- Cuenta de Supabase
- Google OAuth credentials

## Instalación

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con tus credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 3. Configurar Supabase

**Crear tablas** — Ejecuta en el SQL Editor en este orden:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
```

**Crear bucket de Storage:**
- Ir a Supabase → Storage → New bucket
- Nombre: `deliverables`, Public: activado

**Políticas del bucket:**
```sql
CREATE POLICY "upload_deliverables" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deliverables');

CREATE POLICY "read_deliverables" ON storage.objects
  FOR SELECT USING (bucket_id = 'deliverables');
```

**Datos de prueba:**
```
supabase/seed.sql
```

### 4. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → Credentials → OAuth 2.0
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`

### 5. Correr el proyecto

```bash
pnpm dev
```

## Estructura

```
app/
  (dashboard)/
    proyectos/                  # Lista de proyectos (cards)
    proyectos/[id]/             # Clientes del proyecto
    proyectos/[id]/[clientId]/  # Tablero Kanban
    tareas/[taskId]/            # Detalle de tarea
    mis-tareas/                 # Vista personal
  login/                        # Google OAuth
components/
  layout/    Sidebar, TopBar
  kanban/    KanbanBoard, KanbanColumn, TaskCard
  tasks/     TaskDetailClient
  projects/  ProjectCard
  ui/        Button, Avatar, Badge, Dialog, Select, Skeleton
lib/
  auth.ts          NextAuth config
  utils.ts         Helpers (cn, formatDate, getInitials...)
  supabase/        Browser + Server clients
store/
  useAppStore.ts   Zustand (proyectos, tareas, sidebar, notifs)
types/
  database.ts      Todos los tipos TypeScript
supabase/
  migrations/      001_schema + 002_rls
  seed.sql         5 proyectos, 4 clientes, 15 tareas
```

## Roles

| Rol | Acceso |
|-----|--------|
| `admin` | Todo — proyectos, clientes, tareas |
| `project_manager` | Solo su proyecto asignado |
| `collaborator` | Sus proyectos, solo sus tareas |

## Flujo de entregables

1. Colaborador sube archivo → tarea pasa a "En Revisión" automáticamente
2. Aprobador recibe notificación
3. Aprobador **Aprueba** o **Pide cambios** (con nota)
4. Asignado recibe notificación
5. Cada upload incrementa el número de versión (v1, v2, v3...)
