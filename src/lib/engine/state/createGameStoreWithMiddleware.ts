import { createGameStore, type GameStore } from './createGameStore';

/**
 * Middleware interface for intercepting state changes.
 */
export interface Middleware<T> {
	/** Unique name for this middleware (for debugging) */
	name: string;
	/**
	 * Called before state changes are applied.
	 * Can return a modified patch to change what gets applied.
	 * Return void to leave the patch unchanged.
	 */
	beforePatch?: (state: T, patch: Partial<T>) => Partial<T> | void;
	/**
	 * Called after state changes are applied.
	 * Useful for logging, analytics, and side effects.
	 * Cannot modify state (receives read-only copies).
	 */
	afterPatch?: (prevState: T, newState: T, patch: Partial<T>) => void;
}

/**
 * Deep clone an object (simple implementation for game state).
 */
function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a game store with middleware support for intercepting state changes.
 *
 * @param initialState - Initial state object
 * @param middleware - Array of middleware to apply
 * @returns Game store instance with middleware applied
 *
 * @example
 * ```typescript
 * const loggingMiddleware: Middleware<GameState> = {
 *   name: 'logger',
 *   afterPatch(prevState, newState, patch) {
 *     console.log('State changed:', patch);
 *   }
 * };
 *
 * const validationMiddleware: Middleware<GameState> = {
 *   name: 'validator',
 *   beforePatch(state, patch) {
 *     // Ensure score is never negative
 *     if (patch.score !== undefined && patch.score < 0) {
 *       return { ...patch, score: 0 };
 *     }
 *   }
 * };
 *
 * const store = createGameStoreWithMiddleware(initialState, [
 *   loggingMiddleware,
 *   validationMiddleware
 * ]);
 * ```
 */
export function createGameStoreWithMiddleware<T extends object>(
	initialState: T,
	middleware: Middleware<T>[]
): GameStore<T> {
	const baseStore = createGameStore(initialState);

	/**
	 * Run beforePatch middleware, returning the (possibly modified) patch.
	 */
	function runBeforePatch(state: T, patch: Partial<T>): Partial<T> {
		let currentPatch = patch;

		for (const mw of middleware) {
			if (mw.beforePatch) {
				try {
					const result = mw.beforePatch(deepClone(state), deepClone(currentPatch));
					if (result !== undefined) {
						currentPatch = result;
					}
				} catch (error) {
					console.error(`Middleware "${mw.name}" beforePatch error:`, error);
				}
			}
		}

		return currentPatch;
	}

	/**
	 * Run afterPatch middleware.
	 */
	function runAfterPatch(prevState: T, newState: T, patch: Partial<T>): void {
		for (const mw of middleware) {
			if (mw.afterPatch) {
				try {
					mw.afterPatch(deepClone(prevState), deepClone(newState), deepClone(patch));
				} catch (error) {
					console.error(`Middleware "${mw.name}" afterPatch error:`, error);
				}
			}
		}
	}

	return {
		get: baseStore.get,

		set(newState: T): void {
			const prevState = baseStore.get();
			const finalState = runBeforePatch(prevState, newState) as T;
			baseStore.set(finalState);
			runAfterPatch(prevState, baseStore.get(), finalState);
		},

		update(updater: (state: T) => T): void {
			const prevState = baseStore.get();
			const updatedState = updater(deepClone(prevState));
			const finalState = runBeforePatch(prevState, updatedState) as T;
			baseStore.set(finalState);
			runAfterPatch(prevState, baseStore.get(), finalState);
		},

		patch(partial: Partial<T>): void {
			const prevState = baseStore.get();
			const finalPatch = runBeforePatch(prevState, partial);
			baseStore.patch(finalPatch);
			runAfterPatch(prevState, baseStore.get(), finalPatch);
		},

		reset(): void {
			const prevState = baseStore.get();
			baseStore.reset();
			const newState = baseStore.get();
			runAfterPatch(prevState, newState, newState);
		},

		subscribe: baseStore.subscribe,
		select: baseStore.select,
		subscribeToKey: baseStore.subscribeToKey
	};
}
