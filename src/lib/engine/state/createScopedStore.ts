import type { GameStore } from './createGameStore';

/**
 * Options for creating a scoped store.
 */
export interface ScopedStoreOptions<T, S> {
	/**
	 * Select the scoped portion from parent state.
	 */
	select: (state: T) => S;
	/**
	 * Update the parent state with new scoped state.
	 */
	update: (state: T, scoped: S) => T;
}

/**
 * Subscriber callback type.
 */
type Subscriber<S> = (state: S) => void;

/**
 * Key subscriber callback type.
 */
type KeySubscriber<S, K extends keyof S> = (value: S[K]) => void;

/**
 * Deep clone an object (simple implementation for game state).
 */
function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a scoped store that manages a nested portion of parent state.
 *
 * Changes to the scoped store automatically propagate to the parent,
 * and changes to the parent's scoped portion notify scoped subscribers.
 *
 * @param parentStore - The parent GameStore to scope into
 * @param options - Select and update functions to define the scope
 * @returns A GameStore interface for the scoped portion
 *
 * @example
 * ```typescript
 * interface GameState {
 *   player: { name: string; health: number };
 *   inventory: string[];
 * }
 *
 * const gameStore = createGameStore<GameState>({ ... });
 *
 * const playerStore = createScopedStore(gameStore, {
 *   select: (state) => state.player,
 *   update: (state, player) => ({ ...state, player })
 * });
 *
 * // Now playerStore.patch({ health: 50 }) updates gameStore.player.health
 * ```
 */
export function createScopedStore<T extends object, S extends object>(
	parentStore: GameStore<T>,
	options: ScopedStoreOptions<T, S>
): GameStore<S> {
	const { select, update } = options;

	// Store initial scoped state for reset
	const initialScopedState = deepClone(select(parentStore.get()));

	// Scoped subscribers
	const subscribers = new Set<Subscriber<S>>();
	const keySubscribers = new Map<keyof S, Set<KeySubscriber<S, keyof S>>>();

	// Track last known scoped state for change detection
	let lastScopedState = deepClone(select(parentStore.get()));

	/**
	 * Notify scoped subscribers with new state.
	 */
	function notify(state: S) {
		const snapshot = deepClone(state);
		subscribers.forEach((cb) => cb(snapshot));
	}

	/**
	 * Get changed keys between two states.
	 */
	function getChangedKeys(oldState: S, newState: S): Set<keyof S> {
		const changed = new Set<keyof S>();
		const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]) as Set<keyof S>;

		allKeys.forEach((key) => {
			if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
				changed.add(key);
			}
		});

		return changed;
	}

	/**
	 * Notify key-specific subscribers.
	 */
	function notifyKeySubscribers(changedKeys: Set<keyof S>, state: S) {
		changedKeys.forEach((key) => {
			const subs = keySubscribers.get(key);
			if (subs) {
				const value = state[key];
				subs.forEach((cb) => cb(value));
			}
		});
	}

	// Subscribe to parent to detect changes to our scoped portion
	parentStore.subscribe((parentState) => {
		const currentScoped = select(parentState);
		const changedKeys = getChangedKeys(lastScopedState, currentScoped);

		if (changedKeys.size > 0) {
			lastScopedState = deepClone(currentScoped);
			notify(currentScoped);
			notifyKeySubscribers(changedKeys, currentScoped);
		}
	});

	return {
		get(): S {
			return deepClone(select(parentStore.get()));
		},

		set(newState: S): void {
			const parentState = parentStore.get();
			const newParentState = update(parentState, deepClone(newState));
			parentStore.set(newParentState);
		},

		update(updater: (state: S) => S): void {
			const currentScoped = select(parentStore.get());
			const newScoped = updater(deepClone(currentScoped));
			this.set(newScoped);
		},

		patch(partial: Partial<S>): void {
			const currentScoped = select(parentStore.get());
			const newScoped = { ...currentScoped, ...deepClone(partial) };
			this.set(newScoped);
		},

		reset(): void {
			this.set(deepClone(initialScopedState));
		},

		subscribe(callback: Subscriber<S>): () => void {
			subscribers.add(callback);
			callback(deepClone(select(parentStore.get()))); // Immediate call

			return () => {
				subscribers.delete(callback);
			};
		},

		select<R>(selector: (state: S) => R): R {
			return selector(deepClone(select(parentStore.get())));
		},

		subscribeToKey<K extends keyof S>(key: K, callback: KeySubscriber<S, K>): () => void {
			if (!keySubscribers.has(key)) {
				keySubscribers.set(key, new Set());
			}
			const subs = keySubscribers.get(key)!;
			subs.add(callback as KeySubscriber<S, keyof S>);

			// Immediate call with current value
			const currentState = select(parentStore.get());
			callback(currentState[key]);

			return () => {
				subs.delete(callback as KeySubscriber<S, keyof S>);
			};
		}
	};
}
