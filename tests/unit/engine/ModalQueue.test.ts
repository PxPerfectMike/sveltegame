import { describe, it, expect, vi } from 'vitest';
import {
	createModalQueue,
	type ModalQueue,
	type ModalQueueItem
} from '../../../src/lib/engine/ui/ModalQueue';

describe('ModalQueue', () => {
	describe('createModalQueue', () => {
		it('should create a modal queue', () => {
			const queue = createModalQueue();
			expect(queue).toBeDefined();
		});

		it('should return object with all required methods', () => {
			const queue = createModalQueue();
			expect(queue.push).toBeDefined();
			expect(queue.pop).toBeDefined();
			expect(queue.clear).toBeDefined();
			expect(queue.getCurrent).toBeDefined();
			expect(queue.getQueue).toBeDefined();
			expect(queue.subscribe).toBeDefined();
			expect(queue.isEmpty).toBeDefined();
		});

		it('should start empty', () => {
			const queue = createModalQueue();
			expect(queue.isEmpty()).toBe(true);
			expect(queue.getCurrent()).toBeNull();
			expect(queue.getQueue()).toEqual([]);
		});
	});

	describe('push', () => {
		it('should add item to queue', () => {
			const queue = createModalQueue();
			const item: ModalQueueItem = {
				id: 'test-modal',
				component: 'MockComponent'
			};

			queue.push(item);

			expect(queue.isEmpty()).toBe(false);
			expect(queue.getQueue()).toHaveLength(1);
		});

		it('should make first pushed item the current', () => {
			const queue = createModalQueue();
			const item: ModalQueueItem = {
				id: 'first',
				component: 'MockComponent'
			};

			queue.push(item);

			expect(queue.getCurrent()?.id).toBe('first');
		});

		it('should queue multiple items in order', () => {
			const queue = createModalQueue();

			queue.push({ id: 'first', component: 'A' });
			queue.push({ id: 'second', component: 'B' });
			queue.push({ id: 'third', component: 'C' });

			const queueItems = queue.getQueue();
			expect(queueItems).toHaveLength(3);
			expect(queueItems[0].id).toBe('first');
			expect(queueItems[1].id).toBe('second');
			expect(queueItems[2].id).toBe('third');
		});

		it('should keep first item as current when pushing more', () => {
			const queue = createModalQueue();

			queue.push({ id: 'first', component: 'A' });
			queue.push({ id: 'second', component: 'B' });

			expect(queue.getCurrent()?.id).toBe('first');
		});

		it('should store props with item', () => {
			const queue = createModalQueue();
			const props = { title: 'Hello', value: 42 };

			queue.push({ id: 'test', component: 'Mock', props });

			expect(queue.getCurrent()?.props).toEqual(props);
		});

		it('should store onClose callback', () => {
			const queue = createModalQueue();
			const onClose = vi.fn();

			queue.push({ id: 'test', component: 'Mock', onClose });

			expect(queue.getCurrent()?.onClose).toBe(onClose);
		});
	});

	describe('pop', () => {
		it('should remove current item', () => {
			const queue = createModalQueue();
			queue.push({ id: 'first', component: 'A' });
			queue.push({ id: 'second', component: 'B' });

			queue.pop();

			expect(queue.getCurrent()?.id).toBe('second');
			expect(queue.getQueue()).toHaveLength(1);
		});

		it('should call onClose when popping', () => {
			const queue = createModalQueue();
			const onClose = vi.fn();

			queue.push({ id: 'test', component: 'Mock', onClose });
			queue.pop();

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it('should pass result to onClose', () => {
			const queue = createModalQueue();
			const onClose = vi.fn();

			queue.push({ id: 'test', component: 'Mock', onClose });
			queue.pop('confirmed');

			expect(onClose).toHaveBeenCalledWith('confirmed');
		});

		it('should handle pop with undefined result', () => {
			const queue = createModalQueue();
			const onClose = vi.fn();

			queue.push({ id: 'test', component: 'Mock', onClose });
			queue.pop();

			expect(onClose).toHaveBeenCalledWith(undefined);
		});

		it('should handle items without onClose', () => {
			const queue = createModalQueue();
			queue.push({ id: 'test', component: 'Mock' });

			expect(() => queue.pop()).not.toThrow();
			expect(queue.isEmpty()).toBe(true);
		});

		it('should handle pop on empty queue', () => {
			const queue = createModalQueue();

			expect(() => queue.pop()).not.toThrow();
			expect(queue.isEmpty()).toBe(true);
		});

		it('should become empty after last item popped', () => {
			const queue = createModalQueue();
			queue.push({ id: 'only', component: 'Mock' });

			queue.pop();

			expect(queue.isEmpty()).toBe(true);
			expect(queue.getCurrent()).toBeNull();
		});
	});

	describe('clear', () => {
		it('should remove all items', () => {
			const queue = createModalQueue();
			queue.push({ id: 'first', component: 'A' });
			queue.push({ id: 'second', component: 'B' });
			queue.push({ id: 'third', component: 'C' });

			queue.clear();

			expect(queue.isEmpty()).toBe(true);
			expect(queue.getQueue()).toHaveLength(0);
		});

		it('should call onClose for each item', () => {
			const queue = createModalQueue();
			const onClose1 = vi.fn();
			const onClose2 = vi.fn();
			const onClose3 = vi.fn();

			queue.push({ id: 'first', component: 'A', onClose: onClose1 });
			queue.push({ id: 'second', component: 'B', onClose: onClose2 });
			queue.push({ id: 'third', component: 'C', onClose: onClose3 });

			queue.clear();

			expect(onClose1).toHaveBeenCalledTimes(1);
			expect(onClose2).toHaveBeenCalledTimes(1);
			expect(onClose3).toHaveBeenCalledTimes(1);
		});

		it('should pass undefined to all onClose callbacks', () => {
			const queue = createModalQueue();
			const onClose1 = vi.fn();
			const onClose2 = vi.fn();

			queue.push({ id: 'first', component: 'A', onClose: onClose1 });
			queue.push({ id: 'second', component: 'B', onClose: onClose2 });

			queue.clear();

			expect(onClose1).toHaveBeenCalledWith(undefined);
			expect(onClose2).toHaveBeenCalledWith(undefined);
		});

		it('should handle clear on empty queue', () => {
			const queue = createModalQueue();

			expect(() => queue.clear()).not.toThrow();
		});

		it('should handle items without onClose during clear', () => {
			const queue = createModalQueue();
			const onClose = vi.fn();

			queue.push({ id: 'with-callback', component: 'A', onClose });
			queue.push({ id: 'no-callback', component: 'B' });

			expect(() => queue.clear()).not.toThrow();
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe('getCurrent', () => {
		it('should return null when empty', () => {
			const queue = createModalQueue();
			expect(queue.getCurrent()).toBeNull();
		});

		it('should return first item in queue', () => {
			const queue = createModalQueue();
			queue.push({ id: 'first', component: 'A' });
			queue.push({ id: 'second', component: 'B' });

			const current = queue.getCurrent();

			expect(current?.id).toBe('first');
		});

		it('should update after pop', () => {
			const queue = createModalQueue();
			queue.push({ id: 'first', component: 'A' });
			queue.push({ id: 'second', component: 'B' });

			queue.pop();

			expect(queue.getCurrent()?.id).toBe('second');
		});
	});

	describe('getQueue', () => {
		it('should return empty array when empty', () => {
			const queue = createModalQueue();
			expect(queue.getQueue()).toEqual([]);
		});

		it('should return all items in order', () => {
			const queue = createModalQueue();
			queue.push({ id: 'a', component: 'A' });
			queue.push({ id: 'b', component: 'B' });
			queue.push({ id: 'c', component: 'C' });

			const items = queue.getQueue();

			expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
		});

		it('should return a copy (not the internal array)', () => {
			const queue = createModalQueue();
			queue.push({ id: 'test', component: 'Mock' });

			const items1 = queue.getQueue();
			const items2 = queue.getQueue();

			expect(items1).not.toBe(items2);
			expect(items1).toEqual(items2);
		});
	});

	describe('isEmpty', () => {
		it('should return true when empty', () => {
			const queue = createModalQueue();
			expect(queue.isEmpty()).toBe(true);
		});

		it('should return false when has items', () => {
			const queue = createModalQueue();
			queue.push({ id: 'test', component: 'Mock' });
			expect(queue.isEmpty()).toBe(false);
		});

		it('should return true after all items removed', () => {
			const queue = createModalQueue();
			queue.push({ id: 'test', component: 'Mock' });
			queue.pop();
			expect(queue.isEmpty()).toBe(true);
		});
	});

	describe('subscribe', () => {
		it('should call callback immediately with current queue', () => {
			const queue = createModalQueue();
			const callback = vi.fn();

			queue.subscribe(callback);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith([]);
		});

		it('should call callback on push', () => {
			const queue = createModalQueue();
			const callback = vi.fn();

			queue.subscribe(callback);
			callback.mockClear();

			queue.push({ id: 'test', component: 'Mock' });

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback.mock.calls[0][0]).toHaveLength(1);
		});

		it('should call callback on pop', () => {
			const queue = createModalQueue();
			queue.push({ id: 'test', component: 'Mock' });

			const callback = vi.fn();
			queue.subscribe(callback);
			callback.mockClear();

			queue.pop();

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback.mock.calls[0][0]).toHaveLength(0);
		});

		it('should call callback on clear', () => {
			const queue = createModalQueue();
			queue.push({ id: 'first', component: 'A' });
			queue.push({ id: 'second', component: 'B' });

			const callback = vi.fn();
			queue.subscribe(callback);
			callback.mockClear();

			queue.clear();

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback.mock.calls[0][0]).toHaveLength(0);
		});

		it('should return unsubscribe function', () => {
			const queue = createModalQueue();
			const callback = vi.fn();

			const unsubscribe = queue.subscribe(callback);

			expect(typeof unsubscribe).toBe('function');
		});

		it('should not call callback after unsubscribe', () => {
			const queue = createModalQueue();
			const callback = vi.fn();

			const unsubscribe = queue.subscribe(callback);
			callback.mockClear();

			unsubscribe();
			queue.push({ id: 'test', component: 'Mock' });

			expect(callback).not.toHaveBeenCalled();
		});

		it('should support multiple subscribers', () => {
			const queue = createModalQueue();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			queue.subscribe(callback1);
			queue.subscribe(callback2);
			callback1.mockClear();
			callback2.mockClear();

			queue.push({ id: 'test', component: 'Mock' });

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
		});

		it('should only unsubscribe specific callback', () => {
			const queue = createModalQueue();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			const unsub1 = queue.subscribe(callback1);
			queue.subscribe(callback2);
			callback1.mockClear();
			callback2.mockClear();

			unsub1();
			queue.push({ id: 'test', component: 'Mock' });

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledTimes(1);
		});
	});

	describe('typed props', () => {
		it('should support typed props', () => {
			interface ConfirmProps {
				title: string;
				message: string;
				confirmText: string;
			}

			const queue = createModalQueue();
			const props: ConfirmProps = {
				title: 'Confirm',
				message: 'Are you sure?',
				confirmText: 'Yes'
			};

			queue.push<ConfirmProps>({
				id: 'confirm',
				component: 'ConfirmDialog',
				props
			});

			const current = queue.getCurrent();
			expect(current?.props).toEqual(props);
		});

		it('should support typed result in onClose', () => {
			const queue = createModalQueue();
			let result: string | undefined;

			queue.push({
				id: 'test',
				component: 'Mock',
				onClose: (r) => {
					result = r as string;
				}
			});

			queue.pop('success');

			expect(result).toBe('success');
		});
	});

	describe('edge cases', () => {
		it('should handle duplicate IDs', () => {
			const queue = createModalQueue();

			queue.push({ id: 'same', component: 'A' });
			queue.push({ id: 'same', component: 'B' });

			expect(queue.getQueue()).toHaveLength(2);
		});

		it('should handle error in onClose during pop', () => {
			const queue = createModalQueue();
			const errorCallback = vi.fn(() => {
				throw new Error('Callback error');
			});

			queue.push({ id: 'error', component: 'Mock', onClose: errorCallback });
			queue.push({ id: 'after', component: 'Mock' });

			// Should not throw, should still pop
			expect(() => queue.pop()).not.toThrow();
			expect(queue.getCurrent()?.id).toBe('after');
		});

		it('should handle error in onClose during clear', () => {
			const queue = createModalQueue();
			const errorCallback = vi.fn(() => {
				throw new Error('Callback error');
			});
			const successCallback = vi.fn();

			queue.push({ id: 'error', component: 'A', onClose: errorCallback });
			queue.push({ id: 'success', component: 'B', onClose: successCallback });

			// Should not throw, should clear all
			expect(() => queue.clear()).not.toThrow();
			expect(queue.isEmpty()).toBe(true);
			expect(successCallback).toHaveBeenCalled();
		});

		it('should handle error in subscriber', () => {
			const queue = createModalQueue();
			const errorCallback = vi.fn(() => {
				throw new Error('Subscriber error');
			});
			const successCallback = vi.fn();

			queue.subscribe(errorCallback);
			queue.subscribe(successCallback);
			errorCallback.mockClear();
			successCallback.mockClear();

			expect(() => queue.push({ id: 'test', component: 'Mock' })).not.toThrow();
			expect(successCallback).toHaveBeenCalled();
		});
	});
});
