import type { Component } from 'svelte';

/**
 * Transition types for scene changes.
 */
export type TransitionType = 'none' | 'fade' | 'slide';

/**
 * Scene transition configuration.
 */
export interface SceneTransition {
	/** Type of transition animation */
	type: TransitionType;
	/** Duration in milliseconds */
	duration: number;
	/** Slide direction (for slide transitions) */
	direction?: 'left' | 'right' | 'up' | 'down';
}

/**
 * Scene definition with component and lifecycle hooks.
 */
export interface SceneDefinition {
	/** Unique scene identifier */
	id: string;
	/** Svelte component to render */
	component: unknown;
	/** Called when entering this scene */
	onEnter?: () => void | Promise<void>;
	/** Called when leaving this scene */
	onExit?: () => void | Promise<void>;
	/** Custom data associated with the scene */
	data?: Record<string, unknown>;
}

/**
 * Current state of the scene manager.
 */
export interface SceneState {
	/** Current active scene ID */
	currentScene: string;
	/** Previous scene ID (null if first scene) */
	previousScene: string | null;
	/** Whether a transition is in progress */
	isTransitioning: boolean;
	/** Current transition config (if transitioning) */
	transition: SceneTransition | null;
}

/**
 * Navigation options for scene transitions with optional data passing.
 */
export interface NavigationOptions {
	/** Transition animation configuration */
	transition?: SceneTransition;
	/** Data to pass to the target scene */
	data?: Record<string, unknown>;
}

/**
 * Subscriber callback type.
 */
type Subscriber = (state: SceneState) => void;

/**
 * Default transition used when none specified.
 */
const defaultTransition: SceneTransition = {
	type: 'none',
	duration: 0
};

/**
 * Check if an object is a SceneTransition (has 'type' property).
 */
function isSceneTransition(obj: unknown): obj is SceneTransition {
	return obj !== null && typeof obj === 'object' && 'type' in obj;
}

/**
 * Scene store interface.
 */
export interface SceneStore {
	/** Get current state snapshot */
	getState(): SceneState;
	/** Navigate to a scene (clears stack). Accepts SceneTransition or NavigationOptions. */
	goto(sceneId: string, options?: SceneTransition | NavigationOptions): Promise<void>;
	/** Push a scene onto the stack. Accepts SceneTransition or NavigationOptions. */
	push(sceneId: string, options?: SceneTransition | NavigationOptions): Promise<void>;
	/** Pop current scene and return to previous */
	pop(transition?: SceneTransition): Promise<void>;
	/** Check if back navigation is possible */
	canGoBack(): boolean;
	/** Get current stack depth */
	getStackDepth(): number;
	/** Get current scene component */
	getCurrentSceneComponent(): unknown;
	/** Get scene definition by ID */
	getSceneById(id: string): SceneDefinition | undefined;
	/** Subscribe to state changes */
	subscribe(callback: Subscriber): () => void;
	/** Get data passed to current scene */
	getSceneData<T = Record<string, unknown>>(): T | null;
}

/**
 * Create a scene store for managing game scenes.
 *
 * @param scenes - Array of scene definitions
 * @param initialScene - ID of the initial scene
 * @returns Scene store instance
 */
export function createSceneStore(scenes: SceneDefinition[], initialScene: string): SceneStore {
	if (scenes.length === 0) {
		throw new Error('Scenes array cannot be empty');
	}

	const sceneMap = new Map(scenes.map((s) => [s.id, s]));

	if (!sceneMap.has(initialScene)) {
		throw new Error(`Initial scene "${initialScene}" not found`);
	}

	let state: SceneState = {
		currentScene: initialScene,
		previousScene: null,
		isTransitioning: false,
		transition: null
	};

	const sceneStack: string[] = [];
	const subscribers = new Set<Subscriber>();

	// Current scene data (passed during navigation)
	let currentSceneData: Record<string, unknown> | null = null;

	function notify() {
		subscribers.forEach((cb) => cb({ ...state }));
	}

	function setState(partial: Partial<SceneState>) {
		state = { ...state, ...partial };
		notify();
	}

	async function transitionTo(
		targetId: string,
		transition: SceneTransition = defaultTransition,
		data?: Record<string, unknown>
	): Promise<void> {
		const targetScene = sceneMap.get(targetId);
		if (!targetScene) {
			throw new Error(`Scene "${targetId}" not found`);
		}

		// Skip if already on target scene
		if (state.currentScene === targetId) {
			return;
		}

		const currentScene = sceneMap.get(state.currentScene);

		// Begin transition
		setState({
			isTransitioning: true,
			transition
		});

		// Call onExit hook
		if (currentScene?.onExit) {
			await currentScene.onExit();
		}

		// Update scene data
		currentSceneData = data ?? null;

		// Update scene
		const previousScene = state.currentScene;
		setState({
			currentScene: targetId,
			previousScene
		});

		// Call onEnter hook
		if (targetScene.onEnter) {
			await targetScene.onEnter();
		}

		// Complete transition
		setState({
			isTransitioning: false,
			transition: null
		});
	}

	return {
		getState(): SceneState {
			return { ...state };
		},

		async goto(sceneId: string, options?: SceneTransition | NavigationOptions): Promise<void> {
			// Clear stack when using goto
			sceneStack.length = 0;

			// Parse options - support both SceneTransition and NavigationOptions
			let transition: SceneTransition | undefined;
			let data: Record<string, unknown> | undefined;

			if (options) {
				if (isSceneTransition(options)) {
					transition = options;
				} else {
					transition = options.transition;
					data = options.data;
				}
			}

			await transitionTo(sceneId, transition, data);
		},

		async push(sceneId: string, options?: SceneTransition | NavigationOptions): Promise<void> {
			// Push current scene onto stack before transitioning
			sceneStack.push(state.currentScene);

			// Parse options - support both SceneTransition and NavigationOptions
			let transition: SceneTransition | undefined;
			let data: Record<string, unknown> | undefined;

			if (options) {
				if (isSceneTransition(options)) {
					transition = options;
				} else {
					transition = options.transition;
					data = options.data;
				}
			}

			await transitionTo(sceneId, transition, data);
		},

		async pop(transition?: SceneTransition): Promise<void> {
			if (sceneStack.length === 0) {
				return;
			}

			const previousScene = sceneStack.pop()!;
			await transitionTo(previousScene, transition);
		},

		canGoBack(): boolean {
			return sceneStack.length > 0;
		},

		getStackDepth(): number {
			return sceneStack.length;
		},

		getCurrentSceneComponent(): unknown {
			return sceneMap.get(state.currentScene)?.component;
		},

		getSceneById(id: string): SceneDefinition | undefined {
			return sceneMap.get(id);
		},

		subscribe(callback: Subscriber): () => void {
			subscribers.add(callback);
			callback({ ...state }); // Immediate call with current state
			return () => {
				subscribers.delete(callback);
			};
		},

		getSceneData<T = Record<string, unknown>>(): T | null {
			return currentSceneData as T | null;
		}
	};
}

/**
 * Create a Svelte-compatible store from a scene store.
 * This allows using the store with Svelte's $ syntax.
 */
export function createSvelteSceneStore(scenes: SceneDefinition[], initialScene: string) {
	const store = createSceneStore(scenes, initialScene);

	return {
		...store,
		// Svelte store contract
		subscribe: store.subscribe
	};
}
