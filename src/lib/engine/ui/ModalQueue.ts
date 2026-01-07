/**
 * Modal queue item.
 */
export interface ModalQueueItem<T = unknown> {
	/** Unique identifier for this modal */
	id: string;
	/** Component to render (Svelte component or component reference) */
	component: unknown;
	/** Props to pass to the component */
	props?: T;
	/** Callback when modal is closed */
	onClose?: (result?: unknown) => void;
}

/**
 * Modal queue for sequential modal/dialog management.
 */
export interface ModalQueue {
	/** Add a modal to the queue */
	push<T>(item: ModalQueueItem<T>): void;
	/** Remove and close the current modal */
	pop(result?: unknown): void;
	/** Remove and close all modals */
	clear(): void;
	/** Get the current (first) modal or null */
	getCurrent(): ModalQueueItem | null;
	/** Get all modals in the queue */
	getQueue(): ModalQueueItem[];
	/** Subscribe to queue changes */
	subscribe(callback: (queue: ModalQueueItem[]) => void): () => void;
	/** Check if queue is empty */
	isEmpty(): boolean;
}

/**
 * Subscriber callback type.
 */
type Subscriber = (queue: ModalQueueItem[]) => void;

/**
 * Create a modal queue for sequential modal/dialog management.
 *
 * Modals are displayed one at a time in FIFO order. When a modal is closed
 * (popped), the next in queue becomes current.
 *
 * @returns Modal queue instance
 *
 * @example
 * ```typescript
 * const modals = createModalQueue();
 *
 * // Push modals to queue
 * modals.push({
 *   id: 'confirm-delete',
 *   component: ConfirmDialog,
 *   props: { title: 'Delete?', message: 'Are you sure?' },
 *   onClose: (result) => {
 *     if (result === 'confirm') deleteItem();
 *   }
 * });
 *
 * // In Svelte component:
 * // $: currentModal = modals.getCurrent();
 * // {#if currentModal}
 * //   <svelte:component this={currentModal.component} {...currentModal.props}
 * //     on:close={(e) => modals.pop(e.detail)} />
 * // {/if}
 * ```
 */
export function createModalQueue(): ModalQueue {
	const queue: ModalQueueItem[] = [];
	const subscribers = new Set<Subscriber>();

	/**
	 * Notify all subscribers with current queue state.
	 */
	function notify(): void {
		const snapshot = [...queue];
		subscribers.forEach((callback) => {
			try {
				callback(snapshot);
			} catch (error) {
				console.error('ModalQueue subscriber error:', error);
			}
		});
	}

	/**
	 * Safely call onClose callback.
	 */
	function safeOnClose(item: ModalQueueItem, result?: unknown): void {
		if (item.onClose) {
			try {
				item.onClose(result);
			} catch (error) {
				console.error(`ModalQueue onClose error for "${item.id}":`, error);
			}
		}
	}

	return {
		push<T>(item: ModalQueueItem<T>): void {
			queue.push(item as ModalQueueItem);
			notify();
		},

		pop(result?: unknown): void {
			const item = queue.shift();
			if (item) {
				safeOnClose(item, result);
			}
			notify();
		},

		clear(): void {
			// Call onClose for all items
			const items = [...queue];
			queue.length = 0;

			items.forEach((item) => {
				safeOnClose(item, undefined);
			});

			notify();
		},

		getCurrent(): ModalQueueItem | null {
			return queue[0] ?? null;
		},

		getQueue(): ModalQueueItem[] {
			return [...queue];
		},

		subscribe(callback: Subscriber): () => void {
			subscribers.add(callback);
			// Immediate call with current state
			try {
				callback([...queue]);
			} catch (error) {
				console.error('ModalQueue subscriber error:', error);
			}

			return () => {
				subscribers.delete(callback);
			};
		},

		isEmpty(): boolean {
			return queue.length === 0;
		}
	};
}
