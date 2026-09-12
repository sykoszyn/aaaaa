# Plan de implementación

## Fase 1 — Arquitectura base ✅ (este PR)

- Next.js + TypeScript + Tailwind, estructura de carpetas modular.
- Esquema completo de Supabase (15 tablas, enums, índices, constraints,
  triggers, RLS, Realtime) — `supabase/sql/`.
- Auth (Supabase Auth + middleware de sesión + trigger de auto-perfil).
- Sistema de salas: crear, unirse por código, salas públicas, bots, host
  controls, reconexión vía Presence.
- Game Engine genérico: `GameDefinition`, registry, motor de
  validación/aplicación de movimientos, RNG determinístico, bots
  locales — sin ningún juego todavía registrado (a propósito, ver más abajo).
- Shell de la plataforma: sidebar propio (no navbar genérico), topbar con
  presencia en vivo, notificaciones, sonido, XP/nivel.
- Home dinámica: salas activas, ranking, amigos online, "continuar
  partida" — todo con datos reales de Supabase, no mockeados.
- Rankings, perfiles públicos, amigos, configuración, panel de admin.
- Cron de Vercel para expirar presencia "online" sin servidor dedicado.

**Por qué no hay juegos todavía:** `lib/games/core/registry.ts` empieza
vacío. `isGameImplemented()` controla en toda la UI si un juego muestra
"Jugar" o "Próximamente" — es honesto sobre qué funciona, no hay ningún
placeholder que simule una funcionalidad terminada.

## Fase 2 — UNO

- `lib/games/uno/` implementando `GameDefinition<UnoState, UnoMove>`.
- Mazo completo (colores, números, Skip, Reverse, +2, Wild, Wild+4), reglas
  de turno/dirección/robo/descarte/cambio de color/UNO/victoria.
- `toPlayerView` oculta las manos de los demás jugadores.
- Bots con 3 dificultades (`lib/games/uno/bot.ts`, usando
  `pickByDifficulty` de `lib/games/core/bot.ts`).
- UI: `components/games/uno/` — mano propia animada, cartas de rivales de
  espaldas, carta actual, indicador de turno/dirección.
- Tests: turnos, cada carta especial, robo, condición de victoria.

## Fase 3 — Truco Argentino

- Cartas españolas, jerarquía real, mano/ronda, truco/retruco/vale cuatro,
  envido/real envido/falta envido, flor opcional, equipos 2v2.
- Mesa visual con identidad propia (no genérica).
- Tests: jerarquía, cálculo de envido, progresión de truco, puntuación.

## Fase 4 — Ludo

- Tablero, dados, 2-4 jugadores, entrada/salida/captura de fichas, meta.
- Bots y salas públicas/privadas.
- Tests: dados, movimientos legales, capturas, condición de victoria.

## Fase 5 — Pool

- Física 2D real (librería a evaluar: matter.js o motor propio simple —
  documentar la decisión al implementar), mesa de 6 agujeros, apuntado y
  potencia con mouse/touch, colisiones, turnos.
- Tests: colisiones básicas, detección de bola embocada, turnos.

## Fase 6 — Bowling

- 10 pinos, física de lanzamiento, cálculo de puntaje por frame
  (incluyendo strikes/spares con su regla de sumar el frame siguiente).
- Animaciones de caída de pinos, strike, spare.
- Tests: puntuación completa de un juego (incluyendo el 10mo frame).

## Fase 7 — Progresión social

- Logros (`achievements` / `player_achievements`) con catálogo inicial y
  desbloqueo automático vía trigger o Server Action al finalizar partida.
- Pulido de rankings por período (semanal/mensual — la tabla `leaderboards`
  ya soporta `period`, falta el job que la puebla).
- Notificaciones push/word-of-mouth para invitaciones de sala.

## Fase 8 — Optimización y seguridad

- Auditoría de RLS con usuarios reales (no solo el propio).
- Rate limiting en `/api/matches/[matchId]/move`.
- Lazy loading de UI pesada por juego (`dynamic(() => import(...))`).
- Revisión de Core Web Vitals en Vercel Analytics.

## Fase 9 — Deploy y dominio

- Ya cubierto en el [README](../README.md) — este paso es continuo, no un
  evento único: cada fase se despliega a Preview antes de ir a Production.
