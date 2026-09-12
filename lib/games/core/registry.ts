import type { GameSlug } from "@/types/database";
import type { GameDefinition } from "./types";

const registry = new Map<GameSlug, GameDefinition>();

/**
 * Each game module calls this once (see lib/games/uno/index.ts and
 * siblings) to plug itself into the platform. Adding a new game means
 * writing a new lib/games/<slug> module and calling registerGame from
 * lib/games/core/index.ts — nothing else in the app needs to change.
 */
export function registerGame(definition: GameDefinition) {
  if (registry.has(definition.slug)) {
    throw new Error(`Game "${definition.slug}" is already registered`);
  }
  registry.set(definition.slug, definition);
}

export function getGameDefinition(slug: GameSlug): GameDefinition | undefined {
  return registry.get(slug);
}

export function isGameImplemented(slug: GameSlug): boolean {
  return registry.has(slug);
}

export function listImplementedGames(): GameDefinition[] {
  return Array.from(registry.values());
}
