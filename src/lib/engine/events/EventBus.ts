/**
 * Event bus interface for typed pub/sub communication.
 */
export interface EventBus<Events extends object> {
	/**
	 * Subscribe to an event.
	 * @param event - Event name
	 * @param callback - Function to call when event is emitted
	 * @returns Unsubscribe function
	 */
	on<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): () => void;

	/**
	 * Unsubscribe from an event.
	 * @param event - Event name
	 * @param callback - The callback to remove
	 */
	off<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): void;

	/**
	 * Emit an event to all subscribers.
	 * @param event - Event name
	 * @param data - Data to pass to callbacks
	 */
	emit<K extends keyof Events>(event: K, data: Events[K]): void;

	/**
	 * Subscribe to an event for a single emission.
	 * @param event - Event name
	 * @param callback - Function to call once when event is emitted
	 * @returns Unsubscribe function (can cancel before event fires)
	 */
	once<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): () => void;
}

/**
 * Create a typed event bus for pub/sub communication.
 *
 * @returns Event bus instance
 *
 * @example
 * ```typescript
 * interface GameEvents {
 *   playerDied: { playerId: string; cause: string };
 *   scoreChanged: { newScore: number };
 *   gameStarted: undefined;
 * }
 *
 * const events = createEventBus<GameEvents>();
 *
 * // Subscribe
 * const unsubscribe = events.on('playerDied', (data) => {
 *   console.log(`Player ${data.playerId} died: ${data.cause}`);
 * });
 *
 * // Emit
 * events.emit('playerDied', { playerId: '123', cause: 'fall' });
 *
 * // One-time subscription
 * events.once('gameStarted', () => console.log('Game started!'));
 *
 * // Unsubscribe
 * unsubscribe();
 * ```
 */
export function createEventBus<Events extends object>(): EventBus<Events> {
	// Map of event name to set of callbacks
	const listeners = new Map<keyof Events, Set<(data: unknown) => void>>();

	return {
		on<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): () => void {
			if (!listeners.has(event)) {
				listeners.set(event, new Set());
			}
			listeners.get(event)!.add(callback as (data: unknown) => void);

			return () => this.off(event, callback);
		},

		off<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): void {
			listeners.get(event)?.delete(callback as (data: unknown) => void);
		},

		emit<K extends keyof Events>(event: K, data: Events[K]): void {
			const eventListeners = listeners.get(event);
			if (!eventListeners) return;

			// Create a snapshot to handle unsubscribe during iteration
			const snapshot = [...eventListeners];

			for (const callback of snapshot) {
				try {
					callback(data);
				} catch (error) {
					console.error(`EventBus callback error for "${String(event)}":`, error);
				}
			}
		},

		once<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): () => void {
			const wrapper = (data: Events[K]) => {
				this.off(event, wrapper);
				callback(data);
			};

			return this.on(event, wrapper);
		}
	};
}
