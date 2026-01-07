import { createGameStore, type GameStore } from './createGameStore';

/**
 * Create a game store with custom actions attached.
 *
 * This allows extending the base GameStore with domain-specific actions
 * while maintaining full type safety and reactivity.
 *
 * @param initialState - Initial state object
 * @param actionsBuilder - Function that receives the base store and returns action methods
 * @returns Game store instance with all base methods plus custom actions
 *
 * @example
 * ```typescript
 * interface GameState {
 *   score: number;
 *   lives: number;
 * }
 *
 * const gameStore = createGameStoreWithActions<GameState, {
 *   addScore(points: number): void;
 *   loseLife(): boolean;
 * }>(
 *   { score: 0, lives: 3 },
 *   (store) => ({
 *     addScore(points: number) {
 *       store.patch({ score: store.get().score + points });
 *     },
 *     loseLife(): boolean {
 *       const lives = store.get().lives - 1;
 *       store.patch({ lives });
 *       return lives > 0;
 *     }
 *   })
 * );
 *
 * gameStore.addScore(100);
 * gameStore.loseLife();
 * ```
 */
export function createGameStoreWithActions<T extends object, A extends object>(
	initialState: T,
	actionsBuilder: (store: GameStore<T>) => A
): GameStore<T> & A {
	const baseStore = createGameStore(initialState);
	const actions = actionsBuilder(baseStore);

	return {
		...baseStore,
		...actions
	};
}
