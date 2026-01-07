import { describe, it, expect, vi } from 'vitest';
import { createGameStore } from '../../../src/lib/engine/state/createGameStore';
import { createScopedStore } from '../../../src/lib/engine/state/createScopedStore';

interface Player {
	name: string;
	health: number;
	level: number;
}

interface ParentState {
	player: Player;
	inventory: string[];
	settings: { volume: number; muted: boolean };
	score: number;
}

const initialParentState: ParentState = {
	player: { name: 'Hero', health: 100, level: 1 },
	inventory: ['sword', 'shield'],
	settings: { volume: 80, muted: false },
	score: 0
};

function createTestStores() {
	const parentStore = createGameStore(initialParentState);
	const playerStore = createScopedStore(parentStore, {
		select: (state) => state.player,
		update: (state, player) => ({ ...state, player })
	});
	return { parentStore, playerStore };
}

describe('createScopedStore', () => {
	describe('creation', () => {
		it('should create a scoped store from parent', () => {
			const { playerStore } = createTestStores();
			expect(playerStore).toBeDefined();
		});

		it('should initialize with selected portion of parent state', () => {
			const { playerStore } = createTestStores();
			expect(playerStore.get()).toEqual({ name: 'Hero', health: 100, level: 1 });
		});

		it('should implement full GameStore interface', () => {
			const { playerStore } = createTestStores();
			expect(playerStore.get).toBeDefined();
			expect(playerStore.set).toBeDefined();
			expect(playerStore.update).toBeDefined();
			expect(playerStore.patch).toBeDefined();
			expect(playerStore.reset).toBeDefined();
			expect(playerStore.subscribe).toBeDefined();
			expect(playerStore.select).toBeDefined();
			expect(playerStore.subscribeToKey).toBeDefined();
		});
	});

	describe('reading state', () => {
		it('should return scoped state via get()', () => {
			const { playerStore } = createTestStores();
			const player = playerStore.get();
			expect(player).toEqual({ name: 'Hero', health: 100, level: 1 });
		});

		it('should return scoped value via select()', () => {
			const { playerStore } = createTestStores();
			const health = playerStore.select((player) => player.health);
			expect(health).toBe(100);
		});

		it('should reflect parent state changes', () => {
			const { parentStore, playerStore } = createTestStores();

			parentStore.patch({
				player: { name: 'Updated', health: 50, level: 2 }
			});

			expect(playerStore.get()).toEqual({ name: 'Updated', health: 50, level: 2 });
		});
	});

	describe('writing state', () => {
		it('should update parent when scoped store patches', () => {
			const { parentStore, playerStore } = createTestStores();

			playerStore.patch({ health: 75 });

			expect(parentStore.get().player.health).toBe(75);
			expect(playerStore.get().health).toBe(75);
		});

		it('should update parent when scoped store sets', () => {
			const { parentStore, playerStore } = createTestStores();

			playerStore.set({ name: 'NewHero', health: 200, level: 10 });

			expect(parentStore.get().player).toEqual({ name: 'NewHero', health: 200, level: 10 });
		});

		it('should update parent when scoped store updates', () => {
			const { parentStore, playerStore } = createTestStores();

			playerStore.update((player) => ({ ...player, level: player.level + 1 }));

			expect(parentStore.get().player.level).toBe(2);
		});

		it('should only modify scoped portion of parent', () => {
			const { parentStore, playerStore } = createTestStores();

			playerStore.patch({ health: 50 });

			// Parent's other state should be unchanged
			expect(parentStore.get().inventory).toEqual(['sword', 'shield']);
			expect(parentStore.get().settings).toEqual({ volume: 80, muted: false });
			expect(parentStore.get().score).toBe(0);
		});
	});

	describe('subscriptions', () => {
		it('should notify scoped subscribers on scoped changes', () => {
			const { playerStore } = createTestStores();
			const callback = vi.fn();

			playerStore.subscribe(callback);
			callback.mockClear();

			playerStore.patch({ health: 80 });

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(expect.objectContaining({ health: 80 }));
		});

		it('should NOT notify scoped subscribers on unrelated parent changes', () => {
			const { parentStore, playerStore } = createTestStores();
			const callback = vi.fn();

			playerStore.subscribe(callback);
			callback.mockClear();

			// Change something outside the scoped portion
			parentStore.patch({ score: 100 });

			expect(callback).not.toHaveBeenCalled();
		});

		it('should notify parent subscribers when scoped changes', () => {
			const { parentStore, playerStore } = createTestStores();
			const callback = vi.fn();

			parentStore.subscribe(callback);
			callback.mockClear();

			playerStore.patch({ health: 50 });

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					player: expect.objectContaining({ health: 50 })
				})
			);
		});
	});

	describe('two-way binding', () => {
		it('should sync parent -> scoped', () => {
			const { parentStore, playerStore } = createTestStores();

			parentStore.patch({
				player: { name: 'FromParent', health: 150, level: 5 }
			});

			expect(playerStore.get()).toEqual({ name: 'FromParent', health: 150, level: 5 });
		});

		it('should sync scoped -> parent', () => {
			const { parentStore, playerStore } = createTestStores();

			playerStore.set({ name: 'FromScoped', health: 250, level: 15 });

			expect(parentStore.get().player).toEqual({ name: 'FromScoped', health: 250, level: 15 });
		});

		it('should handle nested object updates', () => {
			const parentStore = createGameStore({
				deeply: {
					nested: {
						value: { count: 0, name: 'test' }
					}
				}
			});

			const scopedStore = createScopedStore(parentStore, {
				select: (state) => state.deeply.nested.value,
				update: (state, value) => ({
					...state,
					deeply: { ...state.deeply, nested: { ...state.deeply.nested, value } }
				})
			});

			scopedStore.patch({ count: 42 });

			expect(parentStore.get().deeply.nested.value.count).toBe(42);
			expect(scopedStore.get().count).toBe(42);
		});
	});

	describe('subscribeToKey', () => {
		it('should subscribe to keys within scoped state', () => {
			const { playerStore } = createTestStores();
			const healthValues: number[] = [];

			playerStore.subscribeToKey('health', (health) => healthValues.push(health));
			healthValues.length = 0; // Clear initial

			playerStore.patch({ health: 90 });
			playerStore.patch({ health: 80 });

			expect(healthValues).toEqual([90, 80]);
		});

		it('should only notify on relevant key changes', () => {
			const { playerStore } = createTestStores();
			const healthCallback = vi.fn();

			playerStore.subscribeToKey('health', healthCallback);
			healthCallback.mockClear();

			playerStore.patch({ name: 'Changed', level: 5 }); // Not health

			expect(healthCallback).not.toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		it('should reset scoped portion to initial', () => {
			const { playerStore } = createTestStores();

			playerStore.patch({ health: 50, level: 10 });
			expect(playerStore.get().health).toBe(50);

			playerStore.reset();

			expect(playerStore.get()).toEqual({ name: 'Hero', health: 100, level: 1 });
		});

		it('should not affect other parent state', () => {
			const { parentStore, playerStore } = createTestStores();

			// Modify both scoped and non-scoped state
			playerStore.patch({ health: 50 });
			parentStore.patch({ score: 999 });

			playerStore.reset();

			// Player reset, but score unchanged
			expect(parentStore.get().player).toEqual({ name: 'Hero', health: 100, level: 1 });
			expect(parentStore.get().score).toBe(999);
		});
	});

	describe('multiple scoped stores', () => {
		it('should allow multiple scoped stores from same parent', () => {
			const parentStore = createGameStore(initialParentState);

			const playerStore = createScopedStore(parentStore, {
				select: (state) => state.player,
				update: (state, player) => ({ ...state, player })
			});

			const settingsStore = createScopedStore(parentStore, {
				select: (state) => state.settings,
				update: (state, settings) => ({ ...state, settings })
			});

			playerStore.patch({ health: 50 });
			settingsStore.patch({ volume: 50 });

			expect(parentStore.get().player.health).toBe(50);
			expect(parentStore.get().settings.volume).toBe(50);
		});

		it('should isolate changes between scoped stores', () => {
			const parentStore = createGameStore(initialParentState);

			const playerStore = createScopedStore(parentStore, {
				select: (state) => state.player,
				update: (state, player) => ({ ...state, player })
			});

			const settingsStore = createScopedStore(parentStore, {
				select: (state) => state.settings,
				update: (state, settings) => ({ ...state, settings })
			});

			const playerCallback = vi.fn();
			const settingsCallback = vi.fn();

			playerStore.subscribe(playerCallback);
			settingsStore.subscribe(settingsCallback);

			playerCallback.mockClear();
			settingsCallback.mockClear();

			// Change only player
			playerStore.patch({ health: 25 });

			expect(playerCallback).toHaveBeenCalled();
			expect(settingsCallback).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle array scoped stores', () => {
			const parentStore = createGameStore(initialParentState);

			const inventoryStore = createScopedStore(parentStore, {
				select: (state) => ({ items: state.inventory }),
				update: (state, scoped) => ({ ...state, inventory: scoped.items })
			});

			inventoryStore.patch({ items: ['sword', 'shield', 'potion'] });

			expect(parentStore.get().inventory).toEqual(['sword', 'shield', 'potion']);
		});

		it('should return unsubscribe function from subscribe', () => {
			const { playerStore } = createTestStores();
			const callback = vi.fn();

			const unsubscribe = playerStore.subscribe(callback);
			callback.mockClear();

			playerStore.patch({ health: 50 });
			expect(callback).toHaveBeenCalledTimes(1);

			unsubscribe();

			playerStore.patch({ health: 25 });
			expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
		});

		it('should call subscribe callback immediately with current state', () => {
			const { playerStore } = createTestStores();
			const callback = vi.fn();

			playerStore.subscribe(callback);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith({ name: 'Hero', health: 100, level: 1 });
		});
	});
});
