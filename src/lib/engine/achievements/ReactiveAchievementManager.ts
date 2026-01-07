import {
	createAchievementManager,
	type AchievementDefinition,
	type AchievementManager,
	type Achievement
} from './AchievementManager';

/**
 * Reactive achievement definition with optional condition function.
 */
export interface ReactiveAchievementDefinition<T> extends AchievementDefinition {
	/**
	 * Condition function that receives game state and returns true if unlocked.
	 * If undefined, achievement can only be unlocked manually via unlock().
	 */
	condition?: (state: T) => boolean;
}

/**
 * Reactive achievement manager that auto-checks conditions on state changes.
 */
export interface ReactiveAchievementManager<T> extends AchievementManager {
	/**
	 * Check all achievement conditions against current state.
	 * @param state - Current game state to evaluate conditions against
	 * @returns Array of newly unlocked achievements
	 */
	check(state: T): Achievement[];
}

/**
 * Create a reactive achievement manager that can auto-check conditions.
 *
 * Extends the base AchievementManager with a `check()` method that evaluates
 * condition functions against game state, automatically unlocking achievements
 * when conditions are met.
 *
 * @param definitions - Achievement definitions with optional condition functions
 * @param storageKey - LocalStorage key for persistence
 * @returns Reactive achievement manager instance
 *
 * @example
 * ```typescript
 * interface GameState {
 *   score: number;
 *   level: number;
 * }
 *
 * const achievements = createReactiveAchievementManager<GameState>([
 *   {
 *     id: 'high_score',
 *     name: 'High Scorer',
 *     description: 'Score 100 points',
 *     condition: (state) => state.score >= 100
 *   },
 *   {
 *     id: 'secret',
 *     name: 'Secret Achievement',
 *     description: 'Found the secret!'
 *     // No condition - manual unlock only
 *   }
 * ], 'my-game-achievements');
 *
 * // Subscribe to state changes and check achievements
 * gameStore.subscribe((state) => {
 *   const newlyUnlocked = achievements.check(state);
 *   newlyUnlocked.forEach(a => showNotification(a.name));
 * });
 * ```
 */
export function createReactiveAchievementManager<T>(
	definitions: ReactiveAchievementDefinition<T>[],
	storageKey: string
): ReactiveAchievementManager<T> {
	// Convert to base definitions (strip condition for base manager)
	const baseDefinitions: AchievementDefinition[] = definitions.map(
		({ condition: _condition, ...baseDef }) => baseDef
	);

	// Create base manager
	const baseManager = createAchievementManager(baseDefinitions, storageKey);

	// Store condition functions for lookup
	const conditions = new Map<string, (state: T) => boolean>();
	definitions.forEach((def) => {
		if (def.condition) {
			conditions.set(def.id, def.condition);
		}
	});

	return {
		// Spread all base manager methods
		...baseManager,

		/**
		 * Check all achievement conditions against state.
		 * Returns array of newly unlocked achievements.
		 */
		check(state: T): Achievement[] {
			const newlyUnlocked: Achievement[] = [];

			conditions.forEach((condition, id) => {
				// Skip if already unlocked
				if (baseManager.isUnlocked(id)) return;

				// Check condition
				try {
					if (condition(state)) {
						// Attempt to unlock (returns true if newly unlocked)
						if (baseManager.unlock(id)) {
							const achievement = baseManager.getById(id);
							if (achievement) {
								newlyUnlocked.push({ ...achievement });
							}
						}
					}
				} catch (error) {
					console.error(`Achievement condition error for "${id}":`, error);
				}
			});

			return newlyUnlocked;
		}
	};
}
