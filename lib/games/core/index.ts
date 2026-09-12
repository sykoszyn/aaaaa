export * from "./types";
export * from "./registry";
export * from "./rng";
export * from "./bot";

// NOTE: lib/games/core/engine.ts is intentionally NOT re-exported here.
// It imports "server-only" and talks to the DB with the service-role
// client — bundling it into this barrel would risk a Client Component
// pulling it in transitively. Route handlers/Server Actions import it
// directly: `import { applyPlayerMove } from "@/lib/games/core/engine"`.

/**
 * FASE 2+: cada juego se registra importándolo aquí una vez que su módulo
 * exista, por ejemplo:
 *
 *   import { registerGame } from "./registry";
 *   import { unoGame } from "@/lib/games/uno";
 *   registerGame(unoGame);
 *
 * Hasta entonces el registry queda vacío a propósito — la plataforma debe
 * mostrar honestamente qué juegos están jugables (ver
 * isGameImplemented) en lugar de simular que ya funcionan.
 */
