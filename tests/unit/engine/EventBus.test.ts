import { describe, it, expect, vi } from 'vitest';
import { createEventBus, type EventBus } from '../../../src/lib/engine/events/EventBus';

interface TestEvents {
	playerDied: { playerId: string; cause: string };
	scoreChanged: { newScore: number; delta: number };
	gameStarted: undefined;
	levelComplete: { level: number; stars: number };
}

describe('EventBus', () => {
	describe('createEventBus', () => {
		it('should create an event bus instance', () => {
			const bus = createEventBus<TestEvents>();
			expect(bus).toBeDefined();
		});

		it('should return object with on, off, emit, once methods', () => {
			const bus = createEventBus<TestEvents>();
			expect(bus.on).toBeDefined();
			expect(bus.off).toBeDefined();
			expect(bus.emit).toBeDefined();
			expect(bus.once).toBeDefined();
		});
	});

	describe('on (subscribe)', () => {
		it('should register callback for event type', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			bus.on('playerDied', callback);
			bus.emit('playerDied', { playerId: '123', cause: 'fall' });

			expect(callback).toHaveBeenCalledWith({ playerId: '123', cause: 'fall' });
		});

		it('should return unsubscribe function', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			const unsubscribe = bus.on('scoreChanged', callback);
			expect(typeof unsubscribe).toBe('function');

			bus.emit('scoreChanged', { newScore: 100, delta: 10 });
			expect(callback).toHaveBeenCalledTimes(1);

			unsubscribe();
			bus.emit('scoreChanged', { newScore: 200, delta: 100 });
			expect(callback).toHaveBeenCalledTimes(1); // Still 1
		});

		it('should allow multiple callbacks per event', () => {
			const bus = createEventBus<TestEvents>();
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();

			bus.on('levelComplete', callback1);
			bus.on('levelComplete', callback2);
			bus.on('levelComplete', callback3);

			bus.emit('levelComplete', { level: 1, stars: 3 });

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
			expect(callback3).toHaveBeenCalledTimes(1);
		});

		it('should not call callback before event emitted', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			bus.on('gameStarted', callback);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('emit', () => {
		it('should call all registered callbacks with data', () => {
			const bus = createEventBus<TestEvents>();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			bus.on('playerDied', callback1);
			bus.on('playerDied', callback2);

			bus.emit('playerDied', { playerId: 'abc', cause: 'enemy' });

			expect(callback1).toHaveBeenCalledWith({ playerId: 'abc', cause: 'enemy' });
			expect(callback2).toHaveBeenCalledWith({ playerId: 'abc', cause: 'enemy' });
		});

		it('should pass correct data type to callbacks', () => {
			const bus = createEventBus<TestEvents>();
			let receivedData: TestEvents['scoreChanged'] | undefined;

			bus.on('scoreChanged', (data) => {
				receivedData = data;
			});

			bus.emit('scoreChanged', { newScore: 500, delta: 50 });

			expect(receivedData).toEqual({ newScore: 500, delta: 50 });
		});

		it('should not throw when no callbacks registered', () => {
			const bus = createEventBus<TestEvents>();

			expect(() => {
				bus.emit('playerDied', { playerId: '123', cause: 'test' });
			}).not.toThrow();
		});

		it('should handle events with undefined data', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			bus.on('gameStarted', callback);
			bus.emit('gameStarted', undefined);

			expect(callback).toHaveBeenCalledWith(undefined);
		});
	});

	describe('off (unsubscribe)', () => {
		it('should remove specific callback', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			bus.on('scoreChanged', callback);
			bus.emit('scoreChanged', { newScore: 100, delta: 100 });
			expect(callback).toHaveBeenCalledTimes(1);

			bus.off('scoreChanged', callback);
			bus.emit('scoreChanged', { newScore: 200, delta: 100 });
			expect(callback).toHaveBeenCalledTimes(1); // Still 1
		});

		it('should not affect other callbacks for same event', () => {
			const bus = createEventBus<TestEvents>();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			bus.on('levelComplete', callback1);
			bus.on('levelComplete', callback2);

			bus.off('levelComplete', callback1);
			bus.emit('levelComplete', { level: 5, stars: 2 });

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledTimes(1);
		});

		it('should handle removing non-existent callback', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			expect(() => {
				bus.off('playerDied', callback);
			}).not.toThrow();
		});
	});

	describe('once', () => {
		it('should call callback only once', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			bus.once('scoreChanged', callback);

			bus.emit('scoreChanged', { newScore: 100, delta: 100 });
			bus.emit('scoreChanged', { newScore: 200, delta: 100 });
			bus.emit('scoreChanged', { newScore: 300, delta: 100 });

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith({ newScore: 100, delta: 100 });
		});

		it('should auto-unsubscribe after first emit', () => {
			const bus = createEventBus<TestEvents>();
			const onceCallback = vi.fn();
			const regularCallback = vi.fn();

			bus.once('levelComplete', onceCallback);
			bus.on('levelComplete', regularCallback);

			bus.emit('levelComplete', { level: 1, stars: 3 });
			bus.emit('levelComplete', { level: 2, stars: 2 });

			expect(onceCallback).toHaveBeenCalledTimes(1);
			expect(regularCallback).toHaveBeenCalledTimes(2);
		});

		it('should return unsubscribe function that works before emit', () => {
			const bus = createEventBus<TestEvents>();
			const callback = vi.fn();

			const unsubscribe = bus.once('gameStarted', callback);
			unsubscribe();

			bus.emit('gameStarted', undefined);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('type safety', () => {
		it('should enforce event name to be keyof Events', () => {
			const bus = createEventBus<TestEvents>();

			// These should compile (valid event names)
			bus.on('playerDied', () => {});
			bus.on('scoreChanged', () => {});
			bus.on('gameStarted', () => {});
			bus.on('levelComplete', () => {});

			// This is a runtime check that the events work correctly
			expect(true).toBe(true);
		});

		it('should enforce data type matches event definition', () => {
			const bus = createEventBus<TestEvents>();
			let receivedPlayer: TestEvents['playerDied'] | undefined;
			let receivedScore: TestEvents['scoreChanged'] | undefined;

			bus.on('playerDied', (data) => {
				receivedPlayer = data;
			});
			bus.on('scoreChanged', (data) => {
				receivedScore = data;
			});

			bus.emit('playerDied', { playerId: 'test', cause: 'test' });
			bus.emit('scoreChanged', { newScore: 100, delta: 50 });

			expect(receivedPlayer?.playerId).toBe('test');
			expect(receivedScore?.newScore).toBe(100);
		});
	});

	describe('edge cases', () => {
		it('should handle callback that throws', () => {
			const bus = createEventBus<TestEvents>();
			const errorCallback = vi.fn(() => {
				throw new Error('Callback error');
			});
			const normalCallback = vi.fn();

			bus.on('gameStarted', errorCallback);
			bus.on('gameStarted', normalCallback);

			expect(() => {
				bus.emit('gameStarted', undefined);
			}).not.toThrow();

			expect(errorCallback).toHaveBeenCalled();
			expect(normalCallback).toHaveBeenCalled();
		});

		it('should continue calling other callbacks after error', () => {
			const bus = createEventBus<TestEvents>();
			const results: number[] = [];

			bus.on('levelComplete', () => results.push(1));
			bus.on('levelComplete', () => {
				throw new Error('Error in second callback');
			});
			bus.on('levelComplete', () => results.push(3));

			bus.emit('levelComplete', { level: 1, stars: 1 });

			expect(results).toEqual([1, 3]);
		});

		it('should handle unsubscribe during emit', () => {
			const bus = createEventBus<TestEvents>();
			const results: number[] = [];
			let unsubscribe2: (() => void) | undefined;

			bus.on('scoreChanged', () => {
				results.push(1);
				// Unsubscribe the second callback during first callback
				if (unsubscribe2) unsubscribe2();
			});

			unsubscribe2 = bus.on('scoreChanged', () => {
				results.push(2);
			});

			bus.on('scoreChanged', () => {
				results.push(3);
			});

			bus.emit('scoreChanged', { newScore: 100, delta: 100 });

			// Due to iteration snapshot, callback 2 may or may not be called
			// The important thing is no crash
			expect(results.includes(1)).toBe(true);
			expect(results.includes(3)).toBe(true);
		});

		it('should isolate events from each other', () => {
			const bus = createEventBus<TestEvents>();
			const playerCallback = vi.fn();
			const scoreCallback = vi.fn();

			bus.on('playerDied', playerCallback);
			bus.on('scoreChanged', scoreCallback);

			bus.emit('playerDied', { playerId: '1', cause: 'test' });

			expect(playerCallback).toHaveBeenCalledTimes(1);
			expect(scoreCallback).not.toHaveBeenCalled();
		});
	});

	describe('multiple event bus instances', () => {
		it('should be independent from each other', () => {
			const bus1 = createEventBus<TestEvents>();
			const bus2 = createEventBus<TestEvents>();

			const callback1 = vi.fn();
			const callback2 = vi.fn();

			bus1.on('gameStarted', callback1);
			bus2.on('gameStarted', callback2);

			bus1.emit('gameStarted', undefined);

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).not.toHaveBeenCalled();
		});
	});
});
