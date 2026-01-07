import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createReactiveAchievementManager,
	type ReactiveAchievementDefinition
} from '../../../src/lib/engine/achievements/ReactiveAchievementManager';

interface TestState {
	score: number;
	level: number;
	deaths: number;
}

describe('ReactiveAchievementManager', () => {
	const definitions: ReactiveAchievementDefinition<TestState>[] = [
		{
			id: 'first_score',
			name: 'First Score',
			description: 'Score at least 1 point',
			condition: (state) => state.score >= 1
		},
		{
			id: 'high_score',
			name: 'High Score',
			description: 'Score 100 points',
			condition: (state) => state.score >= 100
		},
		{
			id: 'level_5',
			name: 'Level 5',
			description: 'Reach level 5',
			condition: (state) => state.level >= 5
		},
		{
			id: 'no_deaths',
			name: 'Perfect Run',
			description: 'Complete without dying'
			// No condition - manual only
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(localStorage.getItem).mockReturnValue(null);
	});

	describe('createReactiveAchievementManager', () => {
		it('should create manager with definitions', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');
			expect(manager).toBeDefined();
		});

		it('should include all base AchievementManager methods', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');
			expect(manager.getAll).toBeDefined();
			expect(manager.getById).toBeDefined();
			expect(manager.isUnlocked).toBeDefined();
			expect(manager.unlock).toBeDefined();
			expect(manager.lock).toBeDefined();
			expect(manager.reset).toBeDefined();
			expect(manager.getProgress).toBeDefined();
			expect(manager.getUnlocked).toBeDefined();
			expect(manager.getLocked).toBeDefined();
			expect(manager.onUnlock).toBeDefined();
		});

		it('should add check() method', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');
			expect(manager.check).toBeDefined();
			expect(typeof manager.check).toBe('function');
		});
	});

	describe('check (condition evaluation)', () => {
		it('should evaluate conditions against provided state', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');
			const state: TestState = { score: 50, level: 3, deaths: 0 };

			const unlocked = manager.check(state);

			expect(unlocked.length).toBe(1);
			expect(unlocked[0].id).toBe('first_score');
		});

		it('should return array of newly unlocked achievements', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');
			const state: TestState = { score: 100, level: 5, deaths: 0 };

			const unlocked = manager.check(state);

			expect(unlocked.length).toBe(3);
			expect(unlocked.map((a) => a.id)).toContain('first_score');
			expect(unlocked.map((a) => a.id)).toContain('high_score');
			expect(unlocked.map((a) => a.id)).toContain('level_5');
		});

		it('should return empty array when no achievements unlock', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');
			const state: TestState = { score: 0, level: 1, deaths: 0 };

			const unlocked = manager.check(state);

			expect(unlocked).toEqual([]);
		});

		it('should not return already-unlocked achievements', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');

			// First check - unlocks first_score
			manager.check({ score: 50, level: 1, deaths: 0 });

			// Second check with same state - should return empty
			const unlocked = manager.check({ score: 50, level: 1, deaths: 0 });

			expect(unlocked).toEqual([]);
		});

		it('should unlock achievements when condition returns true', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');

			expect(manager.isUnlocked('high_score')).toBe(false);

			manager.check({ score: 100, level: 1, deaths: 0 });

			expect(manager.isUnlocked('high_score')).toBe(true);
		});
	});

	describe('condition functions', () => {
		it('should support simple value comparisons', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');

			manager.check({ score: 1, level: 1, deaths: 0 });

			expect(manager.isUnlocked('first_score')).toBe(true);
		});

		it('should support complex conditions (multiple fields)', () => {
			const complexDefs: ReactiveAchievementDefinition<TestState>[] = [
				{
					id: 'combo',
					name: 'Combo Master',
					description: 'High score with no deaths',
					condition: (state) => state.score >= 100 && state.deaths === 0
				}
			];

			const manager = createReactiveAchievementManager(complexDefs, 'test-complex');

			// Missing score condition
			manager.check({ score: 50, level: 1, deaths: 0 });
			expect(manager.isUnlocked('combo')).toBe(false);

			// Has deaths
			manager.check({ score: 100, level: 1, deaths: 1 });
			expect(manager.isUnlocked('combo')).toBe(false);

			// Both conditions met
			manager.check({ score: 100, level: 1, deaths: 0 });
			expect(manager.isUnlocked('combo')).toBe(true);
		});

		it('should receive full state object', () => {
			let receivedState: TestState | undefined;
			const customDefs: ReactiveAchievementDefinition<TestState>[] = [
				{
					id: 'test',
					name: 'Test',
					description: 'Test',
					condition: (state) => {
						receivedState = state;
						return false;
					}
				}
			];

			const manager = createReactiveAchievementManager(customDefs, 'test-receive');
			manager.check({ score: 42, level: 7, deaths: 3 });

			expect(receivedState).toEqual({ score: 42, level: 7, deaths: 3 });
		});

		it('should handle achievements without conditions (manual only)', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');

			// Check with any state - no_deaths should not unlock
			manager.check({ score: 100, level: 10, deaths: 0 });

			expect(manager.isUnlocked('no_deaths')).toBe(false);
		});
	});

	describe('integration with store', () => {
		it('should work with store subscription pattern', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');

			// Simulate store subscription
			const stateHistory: TestState[] = [
				{ score: 0, level: 1, deaths: 0 },
				{ score: 50, level: 2, deaths: 0 },
				{ score: 100, level: 5, deaths: 0 }
			];

			const allUnlocked: string[] = [];

			stateHistory.forEach((state) => {
				const unlocked = manager.check(state);
				unlocked.forEach((a) => allUnlocked.push(a.id));
			});

			expect(allUnlocked).toContain('first_score');
			expect(allUnlocked).toContain('high_score');
			expect(allUnlocked).toContain('level_5');
		});

		it('should trigger unlock notifications', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-achievements');
			const unlockCallback = vi.fn();

			manager.onUnlock(unlockCallback);
			manager.check({ score: 100, level: 1, deaths: 0 });

			expect(unlockCallback).toHaveBeenCalledTimes(2); // first_score and high_score
		});
	});

	describe('persistence', () => {
		it('should persist unlocked achievements', () => {
			// Mock localStorage to return saved achievements for new manager
			vi.mocked(localStorage.getItem).mockReturnValue(
				JSON.stringify({
					first_score: { unlockedAt: Date.now() },
					high_score: { unlockedAt: Date.now() }
				})
			);

			// Create manager that loads from storage
			const manager = createReactiveAchievementManager(definitions, 'test-persist');

			expect(manager.isUnlocked('first_score')).toBe(true);
			expect(manager.isUnlocked('high_score')).toBe(true);
		});

		it('should not re-unlock on subsequent checks', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-noreunlock');
			const callback = vi.fn();

			manager.onUnlock(callback);
			manager.check({ score: 100, level: 1, deaths: 0 });

			const callCount = callback.mock.calls.length;

			// Check again with same state
			manager.check({ score: 100, level: 1, deaths: 0 });

			expect(callback.mock.calls.length).toBe(callCount);
		});
	});

	describe('backward compatibility', () => {
		it('should support manual unlock() still working', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-manual');

			expect(manager.isUnlocked('no_deaths')).toBe(false);
			manager.unlock('no_deaths');
			expect(manager.isUnlocked('no_deaths')).toBe(true);
		});

		it('should support definitions without condition (manual-only)', () => {
			const manager = createReactiveAchievementManager(definitions, 'test-manual-only');

			// Check will not unlock it
			manager.check({ score: 1000, level: 100, deaths: 0 });
			expect(manager.isUnlocked('no_deaths')).toBe(false);

			// Manual unlock works
			manager.unlock('no_deaths');
			expect(manager.isUnlocked('no_deaths')).toBe(true);
		});
	});
});
