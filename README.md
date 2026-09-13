# Juegos Argentinos

Plataforma de minijuegos online multijugador. Fase 1: arquitectura completa
(auth, salas, tiempo real, motor de juego modular, esquema de base de
datos). Los juegos en sí (UNO, Truco Argentino, Pool, Bowling, Ludo) se
implementan en fases siguientes sobre esta base — ver [`docs/PLAN.md`](docs/PLAN.md).

## Stack

- **Frontend**: Next.js (App Router) · TypeScript · React 19 · Tailwind CSS v4
- **Backend**: Server Actions + Route Handlers de Next.js
- **Base de datos / Auth / Realtime**: Supabase (PostgreSQL, Supabase Auth, Supabase Realtime)
- **Deploy**: Vercel (sin VPS — cron jobs nativos de Vercel para tareas periódicas)

## Estructura del proyecto

```
app/
  (marketing)/          landing pública ("/")
  (auth)/                login, register
  (platform)/             shell autenticado
    home/                 dashboard: juegos, salas activas, ranking, amigos
    games/, games/[game]/ catálogo de juegos y detalle
    rooms/, rooms/[roomId]/ lobby de sala + partida
    leaderboards/         rankings global y por juego
    friends/               amigos y solicitudes
    profile/, profile/[username]/, profile/settings/
    admin/                 panel de administración
  api/
    matches/[matchId]/      GET estado de partida (redactado por asiento)
    matches/[matchId]/move/ POST — único endpoint de escritura de un movimiento
    cron/mark-offline/      barre perfiles "online" con heartbeat vencido

components/
  ui/        primitivas (Button, Card, Badge, Dialog, Toast, Skeleton, ...)
  layout/    sidebar, topbar, heartbeat de presencia
  games/     GameCard y (en fases siguientes) UI de cada juego
  rooms/, players/, leaderboards/

lib/
  supabase/  clientes browser / server / admin (service role)
  auth/      helpers de sesión (getCurrentProfile, requireProfile)
  realtime/  nombres canónicos de canales + por qué el estado nunca viaja "crudo"
  rooms/     queries de lectura compartidas (Home, /rooms, etc.)
  games/
    core/    GameDefinition, registry, motor genérico, RNG determinístico, bots
    uno/ truco/ pool/ bowling/ ludo/   (uno por fase, todavía vacíos)

types/       Database (mirror manual del esquema SQL)
hooks/       hooks de cliente (realtime, sonido, notificaciones, heartbeat)
supabase/sql/ schema, triggers, RLS y config de Realtime — pegar en Supabase en orden
```

## El Game Engine (por qué ningún juego rompe la arquitectura)

Cada juego implementa una única interfaz (`lib/games/core/types.ts` →
`GameDefinition`): `createInitialState`, `validateMove`, `applyMove`,
`isFinished`, `calculateResult`, `toPlayerView`, `getBotMove`. El motor
genérico (`lib/games/core/engine.ts`) es el ÚNICO código que escribe en
`game_matches` / `game_match_players` / `game_events`, usando el
service-role client — así ningún juego necesita su propia ruta de API, su
propia validación de turnos, ni su propia lógica de bots-en-cadena.
Agregar un juego nuevo es escribir `lib/games/<slug>/` y registrarlo; nada
más de la plataforma cambia.

`GameDefinition.toPlayerView()` existe porque el estado de una partida
puede contener información que un rival no debe ver todavía (la mano de
UNO de otro jugador, por ejemplo). Por eso mismo, el realtime de una
partida (`hooks/use-match-state.ts`) nunca lee el payload crudo de
Postgres — lo usa solo como señal de "algo cambió" y siempre re-pide el
estado a `GET /api/matches/[matchId]`, que aplica la redacción correcta
server-side. Ver `lib/realtime/channels.ts` para el detalle completo.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → **New Project**.
2. Elegí una región cercana a tus usuarios (p. ej. South America) y una
   contraseña de base de datos segura (guardala, no se puede ver de nuevo).
3. Esperá a que el proyecto termine de aprovisionarse (~2 min).

### 2. Ejecutar el SQL

En el proyecto de Supabase, abrí **SQL Editor** y ejecutá, en este orden
exacto, cada archivo de `supabase/sql/`:

1. `001_schema.sql` — tablas, enums, índices, constraints, seed de juegos
2. `002_functions_triggers.sql` — triggers (perfil automático, XP → nivel,
   resultado de partida → stats/ranking, notificaciones de amistad)
3. `003_rls.sql` — Row Level Security en todas las tablas
4. `004_realtime.sql` — qué tablas transmiten cambios por Realtime

**Si tu proyecto ya corrió una versión anterior de `003_rls.sql`** (antes
del fix de recursión infinita en las policies de salas/partidas), corré
además `005_fix_rls_recursion.sql` — un proyecto nuevo desde cero no lo
necesita, `003_rls.sql` ya viene con el fix incorporado.

Podés pegar cada archivo entero y darle "Run". Si algo falla, revisá que
los anteriores hayan corrido completos antes de reintentar (dependen entre
sí en ese orden).

### 3. Configurar Auth

En **Authentication → Providers**, dejá **Email** habilitado (activado por
default). En **Authentication → URL Configuration**, configurá:

- **Site URL**: `https://tu-dominio.vercel.app` (o `http://localhost:3000` en desarrollo)
- **Redirect URLs**: agregá también `http://localhost:3000/**` mientras desarrollás

No hace falta configurar nada más — `handle_new_user()` (trigger SQL) crea
el `profile` automáticamente en cada signup.

### 4. Configurar Realtime

Ya se habilitó vía `004_realtime.sql` (agrega las tablas necesarias a la
publicación `supabase_realtime`). Podés verificarlo en **Database →
Replication**: `game_rooms`, `game_room_players`, `game_matches`,
`game_events`, `notifications` y `profiles` deberían aparecer listadas.

### 5. Variables de entorno

Copiá `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completá con los valores de **Project Settings → API**:

| Variable | De dónde sale | Dónde se usa |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | cliente y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public | cliente y servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role | **solo servidor** — nunca se expone al navegador (ver `lib/supabase/admin.ts`, que usa `import "server-only"` para hacer fallar el build si algo lo importa desde un Client Component) |
| `CRON_SECRET` | generalo vos: `openssl rand -hex 32` | protege `/api/cron/mark-offline` |

### 6. Instalar y correr en desarrollo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### 7. Tests y chequeos

```bash
npm run typecheck   # TypeScript estricto
npm run lint        # ESLint
npm run test        # Vitest — reglas del motor (RNG determinístico, bots)
npm run build       # build de producción
```

## Deploy en Vercel

1. **Conectar GitHub**: en [vercel.com/new](https://vercel.com/new), importá
   este repositorio (o hacé push a un repo de GitHub propio y conectalo ahí).
2. **Variables de entorno**: en el proyecto de Vercel → **Settings →
   Environment Variables**, agregá las cuatro variables de `.env.local`
   (para Production, Preview y Development). `SUPABASE_SERVICE_ROLE_KEY` y
   `CRON_SECRET` van SIN el prefijo `NEXT_PUBLIC_` — Vercel no los expone al
   navegador.
3. **Deploy**: Vercel detecta Next.js automáticamente (build command
   `next build`, output `.next`). Solo hace falta darle "Deploy".
4. **Cron job**: `vercel.json` ya declara `/api/cron/mark-offline` corriendo
   una vez por día (los planes **Hobby** de Vercel solo permiten cron jobs
   diarios — por eso esta frecuencia, no hace falta pagar Plan Pro) —
   Vercel lo activa solo al detectar el archivo. Confirmá en **Settings →
   Cron Jobs** que aparezca. No es crítico para que "jugadores online"
   funcione bien: las consultas que cuentan jugadores online ya filtran
   por actividad reciente (`last_seen_at`), este cron solo prolija el
   booleano `is_online` en la base una vez al día.
5. **Dominio personalizado**: **Settings → Domains** → agregá tu dominio y
   seguí las instrucciones de DNS que te da Vercel (un registro `CNAME` o
   `A`, según el caso). Después, actualizá **Site URL** en Supabase Auth al
   dominio final.
6. **Verificar producción**: abrí el dominio, registrate, confirmá que el
   perfil se crea (`profiles` en el dashboard de Supabase) y que "jugadores
   online" sube al tener la pestaña abierta.

### Troubleshooting común

| Síntoma | Causa probable | Solución |
|---|---|---|
| Login/registro no redirige | `Site URL` / `Redirect URLs` mal configuradas en Supabase Auth | revisar paso 3 |
| "jugadores online" no se actualiza en vivo | Realtime no habilitado para `profiles` | revisar `004_realtime.sql` corrió, chequear **Database → Replication** |
| Error de RLS al crear sala/unirse | políticas de `003_rls.sql` no corrieron o corrieron antes que `001`/`002` | re-ejecutar los 4 archivos SQL en orden |
| `infinite recursion detected in policy for relation "game_room_players"` | tu proyecto corrió una versión vieja de `003_rls.sql` (antes del fix con `can_view_room()`/`is_match_participant()`) | correr `005_fix_rls_recursion.sql` |
| `is_online` nunca vuelve a `false` | falta `CRON_SECRET` en Vercel, o el cron job no está activo | revisar **Settings → Cron Jobs** y la env var |
| Build falla por variables de entorno faltantes | alguna página server-side ejecuta una query en build time | marcar la ruta con `export const dynamic = "force-dynamic"` (ver `app/(marketing)/page.tsx`) |
| `SUPABASE_SERVICE_ROLE_KEY` filtrada en el bundle del cliente | algo importó `lib/supabase/admin.ts` desde un Client Component | el build ya falla solo (por `import "server-only"`) — mové esa lógica a un Server Action/Route Handler |
