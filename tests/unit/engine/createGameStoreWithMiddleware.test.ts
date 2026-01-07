import { describe, it, expect, vi } from 'vitest';
import {
	createGameStoreWithMiddleware,
	type Middleware
} from '../../../src/lib/engine/state/createGameStoreWithMiddleware';

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

describe('createGameStoreWithMiddleware', () => {
	describe('middleware execution', () => {
		it('should call beforePatch before state changes', () => {
			const beforePatch = vi.fn();
			const middleware: Middleware<TestState> = {
				name: 'test',
				beforePatch
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);

			store.patch({ count: 5 });

			expect(beforePatch).toHaveBeenCalledTimes(1);
			expect(beforePatch).toHaveBeenCalledWith(
				expect.objectContaining({ count: 0 }),
				expect.objectContaining({ count: 5 })
			);
		});

		it('should call afterPatch after state changes', () => {
			const afterPatch = vi.fn();
			const middleware: Middleware<TestState> = {
				name: 'test',
				afterPatch
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);

			store.patch({ count: 5 });

			expect(afterPatch).toHaveBeenCalledTimes(1);
			expect(afterPatch).toHaveBeenCalledWith(
				expect.objectContaining({ count: 0 }), // prevState
				expect.objectContaining({ count: 5 }), // newState
				expect.objectContaining({ count: 5 }) // patch
			);
		});

		it('should pass correct arguments to beforePatch (state, patch)', () => {
			let receivedState: TestState | undefined;
			let receivedPatch: Partial<TestState> | undefined;

			const middleware: Middleware<TestState> = {
				name: 'test',
				beforePatch(state, patch) {
					receivedState = state;
					receivedPatch = patch;
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);
			store.patch({ count: 10, name: 'updated' });

			expect(receivedState).toEqual(initialState);
			expect(receivedPatch).toEqual({ count: 10, name: 'updated' });
		});

		it('should pass correct arguments to afterPatch (prevState, newState, patch)', () => {
			let receivedPrevState: TestState | undefined;
			let receivedNewState: TestState | undefined;
			let receivedPatch: Partial<TestState> | undefined;

			const middleware: Middleware<TestState> = {
				name: 'test',
				afterPatch(prevState, newState, patch) {
					receivedPrevState = prevState;
					receivedNewState = newState;
					receivedPatch = patch;
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);
			store.patch({ count: 10 });

			expect(receivedPrevState).toEqual(initialState);
			expect(receivedNewState).toEqual({ ...initialState, count: 10 });
			expect(receivedPatch).toEqual({ count: 10 });
		});

		it('should execute middleware in order', () => {
			const order: string[] = [];

			const middleware1: Middleware<TestState> = {
				name: 'first',
				beforePatch: () => {
					order.push('first-before');
				},
				afterPatch: () => {
					order.push('first-after');
				}
			};

			const middleware2: Middleware<TestState> = {
				name: 'second',
				beforePatch: () => {
					order.push('second-before');
				},
				afterPatch: () => {
					order.push('second-after');
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware1, middleware2]);
			store.patch({ count: 5 });

			expect(order).toEqual(['first-before', 'second-before', 'first-after', 'second-after']);
		});
	});

	describe('beforePatch interception', () => {
		it('should allow middleware to modify the patch', () => {
			const middleware: Middleware<TestState> = {
				name: 'modifier',
				beforePatch(state, patch) {
					// Double any count changes
					if (patch.count !== undefined) {
						return { ...patch, count: patch.count * 2 };
					}
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);
			store.patch({ count: 5 });

			expect(store.get().count).toBe(10);
		});

		it('should allow middleware to return void (no modification)', () => {
			const middleware: Middleware<TestState> = {
				name: 'logger',
				beforePatch() {
					// Just logging, no modification
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);
			store.patch({ count: 5 });

			expect(store.get().count).toBe(5);
		});

		it('should chain modifications through multiple middleware', () => {
			const middleware1: Middleware<TestState> = {
				name: 'addOne',
				beforePatch(state, patch) {
					if (patch.count !== undefined) {
						return { ...patch, count: patch.count + 1 };
					}
				}
			};

			const middleware2: Middleware<TestState> = {
				name: 'double',
				beforePatch(state, patch) {
					if (patch.count !== undefined) {
						return { ...patch, count: patch.count * 2 };
					}
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware1, middleware2]);
			// Input: 5 -> middleware1: 6 -> middleware2: 12
			store.patch({ count: 5 });

			expect(store.get().count).toBe(12);
		});

		it('should apply final modified patch to state', () => {
			const middleware: Middleware<TestState> = {
				name: 'uppercase',
				beforePatch(state, patch) {
					if (patch.name !== undefined) {
						return { ...patch, name: patch.name.toUpperCase() };
					}
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);
			store.patch({ name: 'hello' });

			expect(store.get().name).toBe('HELLO');
		});
	});

	describe('afterPatch side effects', () => {
		it('should execute all afterPatch handlers', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			const store = createGameStoreWithMiddleware(initialState, [
				{ name: 'one', afterPatch: handler1 },
				{ name: 'two', afterPatch: handler2 }
			]);

			store.patch({ count: 5 });

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		it('should not allow afterPatch to modify state (read-only)', () => {
			const middleware: Middleware<TestState> = {
				name: 'test',
				afterPatch(prevState, newState) {
					// Attempting to modify newState shouldn't affect store
					(newState as TestState).count = 999;
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);
			store.patch({ count: 5 });

			// State should be 5, not 999
			expect(store.get().count).toBe(5);
		});

		it('should receive accurate prevState and newState', () => {
			const states: { prev: TestState; new: TestState }[] = [];

			const middleware: Middleware<TestState> = {
				name: 'recorder',
				afterPatch(prevState, newState) {
					states.push({ prev: { ...prevState }, new: { ...newState } });
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [middleware]);

			store.patch({ count: 1 });
			store.patch({ count: 2 });
			store.patch({ name: 'changed' });

			expect(states).toEqual([
				{ prev: { count: 0, name: 'test', items: [] }, new: { count: 1, name: 'test', items: [] } },
				{ prev: { count: 1, name: 'test', items: [] }, new: { count: 2, name: 'test', items: [] } },
				{
					prev: { count: 2, name: 'test', items: [] },
					new: { count: 2, name: 'changed', items: [] }
				}
			]);
		});
	});

	describe('middleware for set/update/reset', () => {
		it('should intercept set() operations', () => {
			const beforePatch = vi.fn();
			const afterPatch = vi.fn();

			const store = createGameStoreWithMiddleware(initialState, [
				{ name: 'test', beforePatch, afterPatch }
			]);

			store.set({ count: 100, name: 'replaced', items: ['a'] });

			expect(beforePatch).toHaveBeenCalled();
			expect(afterPatch).toHaveBeenCalled();
			expect(store.get()).toEqual({ count: 100, name: 'replaced', items: ['a'] });
		});

		it('should intercept update() operations', () => {
			const beforePatch = vi.fn();
			const afterPatch = vi.fn();

			const store = createGameStoreWithMiddleware(initialState, [
				{ name: 'test', beforePatch, afterPatch }
			]);

			store.update((state) => ({ ...state, count: state.count + 10 }));

			expect(beforePatch).toHaveBeenCalled();
			expect(afterPatch).toHaveBeenCalled();
			expect(store.get().count).toBe(10);
		});

		it('should intercept reset() operations', () => {
			const afterPatch = vi.fn();

			const store = createGameStoreWithMiddleware(initialState, [
				{ name: 'test', afterPatch }
			]);

			store.patch({ count: 50 });
			afterPatch.mockClear();

			store.reset();

			expect(afterPatch).toHaveBeenCalled();
			expect(store.get().count).toBe(0);
		});
	});

	describe('error handling', () => {
		it('should continue with other middleware if one throws', () => {
			const secondMiddleware = vi.fn();

			const store = createGameStoreWithMiddleware(initialState, [
				{
					name: 'thrower',
					beforePatch() {
						throw new Error('Test error');
					}
				},
				{
					name: 'second',
					beforePatch: secondMiddleware
				}
			]);

			// Should not throw and should continue
			expect(() => store.patch({ count: 5 })).not.toThrow();
			expect(secondMiddleware).toHaveBeenCalled();
		});

		it('should not break state on middleware error', () => {
			const store = createGameStoreWithMiddleware(initialState, [
				{
					name: 'thrower',
					afterPatch() {
						throw new Error('Test error');
					}
				}
			]);

			store.patch({ count: 5 });

			expect(store.get().count).toBe(5);
		});
	});

	describe('real-world patterns', () => {
		it('should support logging middleware', () => {
			const logs: string[] = [];

			const loggingMiddleware: Middleware<TestState> = {
				name: 'logger',
				afterPatch(prevState, newState, patch) {
					logs.push(`Updated: ${JSON.stringify(patch)}`);
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [loggingMiddleware]);

			store.patch({ count: 5 });
			store.patch({ name: 'logged' });

			expect(logs).toEqual(['Updated: {"count":5}', 'Updated: {"name":"logged"}']);
		});

		it('should support validation middleware', () => {
			const validationMiddleware: Middleware<TestState> = {
				name: 'validator',
				beforePatch(state, patch) {
					// Ensure count is never negative
					if (patch.count !== undefined && patch.count < 0) {
						return { ...patch, count: 0 };
					}
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [validationMiddleware]);

			store.patch({ count: -10 });

			expect(store.get().count).toBe(0);
		});

		it('should support analytics middleware', () => {
			const events: { event: string; data: unknown }[] = [];

			const analyticsMiddleware: Middleware<TestState> = {
				name: 'analytics',
				afterPatch(prevState, newState) {
					if (prevState.count !== newState.count) {
						events.push({ event: 'count_changed', data: { from: prevState.count, to: newState.count } });
					}
				}
			};

			const store = createGameStoreWithMiddleware(initialState, [analyticsMiddleware]);

			store.patch({ count: 10 });
			store.patch({ name: 'ignored' }); // Should not trigger event
			store.patch({ count: 20 });

			expect(events).toEqual([
				{ event: 'count_changed', data: { from: 0, to: 10 } },
				{ event: 'count_changed', data: { from: 10, to: 20 } }
			]);
		});
	});

	describe('base store functionality', () => {
		it('should preserve all base GameStore methods', () => {
			const store = createGameStoreWithMiddleware(initialState, []);

			expect(store.get).toBeDefined();
			expect(store.set).toBeDefined();
			expect(store.update).toBeDefined();
			expect(store.patch).toBeDefined();
			expect(store.reset).toBeDefined();
			expect(store.subscribe).toBeDefined();
			expect(store.select).toBeDefined();
			expect(store.subscribeToKey).toBeDefined();
		});

		it('should work with subscriptions', () => {
			const store = createGameStoreWithMiddleware(initialState, []);
			const callback = vi.fn();

			store.subscribe(callback);
			callback.mockClear();

			store.patch({ count: 5 });

			expect(callback).toHaveBeenCalledWith(expect.objectContaining({ count: 5 }));
		});

		it('should work with no middleware', () => {
			const store = createGameStoreWithMiddleware(initialState, []);

			store.patch({ count: 5 });

			expect(store.get().count).toBe(5);
		});
	});
});
