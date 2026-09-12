import { registerGame } from "./core/registry";
import { unoGame } from "./uno";

/**
 * Registration barrel — importing THIS module (not lib/games/core/registry
 * directly) is what guarantees a game shows up in the registry. Every
 * Server Component, Server Action or Route Handler that calls
 * isGameImplemented()/getGameDefinition() must import from "@/lib/games"
 * so this side effect runs in that request's module graph (each Next.js
 * route can be bundled as its own serverless function, so a game
 * registered only inside some other route's bundle would look
 * unimplemented here).
 *
 * Adding a new game: implement lib/games/<slug>/ exporting a
 * GameDefinition, then add one registerGame(...) line below.
 */
registerGame(unoGame);

export * from "./core/registry";
export * from "./core/types";
