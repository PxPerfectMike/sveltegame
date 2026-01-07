import { describe, it, expect, vi } from 'vitest';
import { createGameStoreWithActions } from '../../../src/lib/engine/state/createGameStoreWithActions';

interface TestState {
	count: number;
	name: string;
	items: string[];
}

const initialState: TestState = {
	count: 0,
	name: 'test',
	items: []
};

describe('createGameStoreWithActions', () => {
	describe('creation', () => {
		it('should create store with custom actions attached', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				}
			}));

			expect(store.increment).toBeDefined();
			expect(typeof store.increment).toBe('function');
		});

		it('should preserve all base GameStore methods', () => {
			const store = createGameStoreWithActions(initialState, () => ({}));

			expect(store.get).toBeDefined();
			expect(store.set).toBeDefined();
			expect(store.update).toBeDefined();
			expect(store.patch).toBeDefined();
			expect(store.reset).toBeDefined();
			expect(store.subscribe).toBeDefined();
			expect(store.select).toBeDefined();
			expect(store.subscribeToKey).toBeDefined();
		});

		it('should provide store reference to action builder', () => {
			let receivedStore: unknown = null;

			createGameStoreWithActions(initialState, (store) => {
				receivedStore = store;
				return {};
			});

			expect(receivedStore).not.toBeNull();
			expect((receivedStore as { get: () => TestState }).get()).toEqual(initialState);
		});
	});

	describe('action execution', () => {
		it('should execute custom actions with correct behavior', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				}
			}));

			store.increment();
			expect(store.get().count).toBe(1);

			store.increment();
			expect(store.get().count).toBe(2);
		});

		it('should allow actions to read state via store.get()', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				getDoubleCount(): number {
					return store.get().count * 2;
				}
			}));

			store.patch({ count: 5 });
			expect(store.getDoubleCount()).toBe(10);
		});

		it('should allow actions to modify state via store.patch()', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				setName(name: string) {
					store.patch({ name });
				}
			}));

			store.setName('newName');
			expect(store.get().name).toBe('newName');
		});

		it('should allow actions to call other actions', () => {
			const store = createGameStoreWithActions(initialState, (store) => {
				const actions = {
					increment() {
						store.patch({ count: store.get().count + 1 });
					},
					incrementTwice() {
						actions.increment();
						actions.increment();
					}
				};
				return actions;
			});

			store.incrementTwice();
			expect(store.get().count).toBe(2);
		});

		it('should support async actions', async () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				async incrementAsync() {
					await new Promise((resolve) => setTimeout(resolve, 10));
					store.patch({ count: store.get().count + 1 });
				}
			}));

			await store.incrementAsync();
			expect(store.get().count).toBe(1);
		});

		it('should notify subscribers when actions modify state', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				}
			}));

			const callback = vi.fn();
			store.subscribe(callback);

			// Clear the initial call
			callback.mockClear();

			store.increment();

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
		});

		it('should allow actions to return values', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				addItem(item: string): number {
					const items = [...store.get().items, item];
					store.patch({ items });
					return items.length;
				}
			}));

			const length = store.addItem('apple');
			expect(length).toBe(1);
			expect(store.get().items).toEqual(['apple']);
		});

		it('should allow actions with multiple parameters', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				updateMultiple(count: number, name: string) {
					store.patch({ count, name });
				}
			}));

			store.updateMultiple(42, 'updated');
			expect(store.get().count).toBe(42);
			expect(store.get().name).toBe('updated');
		});
	});

	describe('type safety', () => {
		it('should infer action return types correctly', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				getCount(): number {
					return store.get().count;
				},
				getName(): string {
					return store.get().name;
				}
			}));

			const count: number = store.getCount();
			const name: string = store.getName();

			expect(typeof count).toBe('number');
			expect(typeof name).toBe('string');
		});

		it('should enforce state type in action builder', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				validateState(): boolean {
					const state = store.get();
					// These should compile because they match TestState
					return typeof state.count === 'number' && typeof state.name === 'string';
				}
			}));

			expect(store.validateState()).toBe(true);
		});
	});

	describe('backward compatibility', () => {
		it('should work with existing subscription patterns', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				}
			}));

			const states: TestState[] = [];
			const unsubscribe = store.subscribe((state) => states.push(state));

			store.increment();
			store.increment();

			unsubscribe();
			store.increment();

			// Initial + 2 increments (not the one after unsubscribe)
			expect(states.length).toBe(3);
		});

		it('should work with select()', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				}
			}));

			store.increment();

			const doubled = store.select((state) => state.count * 2);
			expect(doubled).toBe(2);
		});

		it('should work with subscribeToKey()', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				},
				setName(name: string) {
					store.patch({ name });
				}
			}));

			const countValues: number[] = [];
			store.subscribeToKey('count', (count) => countValues.push(count));

			// Clear initial value
			countValues.length = 0;

			store.increment();
			store.setName('ignored'); // Should not trigger count subscriber
			store.increment();

			expect(countValues).toEqual([1, 2]);
		});

		it('should work with reset()', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				}
			}));

			store.increment();
			store.increment();
			expect(store.get().count).toBe(2);

			store.reset();
			expect(store.get().count).toBe(0);
		});
	});

	describe('complex scenarios', () => {
		it('should handle actions that use set() for full state replacement', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				replaceState(newState: TestState) {
					store.set(newState);
				}
			}));

			store.replaceState({ count: 100, name: 'replaced', items: ['a', 'b'] });

			expect(store.get()).toEqual({ count: 100, name: 'replaced', items: ['a', 'b'] });
		});

		it('should handle actions that use update() for functional updates', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				doubleCount() {
					store.update((state) => ({ ...state, count: state.count * 2 }));
				}
			}));

			store.patch({ count: 5 });
			store.doubleCount();

			expect(store.get().count).toBe(10);
		});

		it('should support many actions', () => {
			const store = createGameStoreWithActions(initialState, (store) => ({
				increment() {
					store.patch({ count: store.get().count + 1 });
				},
				decrement() {
					store.patch({ count: store.get().count - 1 });
				},
				setCount(n: number) {
					store.patch({ count: n });
				},
				setName(name: string) {
					store.patch({ name });
				},
				addItem(item: string) {
					store.patch({ items: [...store.get().items, item] });
				},
				removeItem(item: string) {
					store.patch({ items: store.get().items.filter((i) => i !== item) });
				},
				clearItems() {
					store.patch({ items: [] });
				}
			}));

			store.increment();
			store.increment();
			store.setName('test2');
			store.addItem('a');
			store.addItem('b');
			store.removeItem('a');

			expect(store.get()).toEqual({ count: 2, name: 'test2', items: ['b'] });
		});
	});
});
