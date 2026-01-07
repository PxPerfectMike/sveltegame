// Core
export { default as GameContainer } from './core/GameContainer.svelte';
export {
	calculateViewport,
	defaultViewportConfig,
	isWithinAspectBounds,
	type ViewportConfig,
	type ViewportResult
} from './core/viewport';
export {
	gu,
	guh,
	guToPx,
	guhToPx,
	pxToGu,
	pxToGuh,
	setUnitScale,
	getUnitScale,
	createUnitStyles,
	type UnitScale
} from './core/units';

// Scenes
export { default as SceneManager } from './scenes/SceneManager.svelte';
export {
	createSceneStore,
	createSvelteSceneStore,
	type SceneDefinition,
	type SceneTransition,
	type SceneState,
	type SceneStore,
	type TransitionType,
	type NavigationOptions
} from './scenes/sceneStore';

// State
export { createGameStore, createSvelteGameStore, type GameStore } from './state/createGameStore';
export { createGameStoreWithActions } from './state/createGameStoreWithActions';
export {
	createGameStoreWithMiddleware,
	type Middleware
} from './state/createGameStoreWithMiddleware';
export { createScopedStore, type ScopedStoreOptions } from './state/createScopedStore';

// Events
export { createEventBus, type EventBus } from './events/EventBus';

// Save
export {
	createSaveManager,
	type SaveManager,
	type SaveManagerOptions,
	type Migration
} from './save/SaveManager';

// Input
export {
	createInputManager,
	type InputManager,
	type InputConfig,
	type Point,
	type SwipeDirection
} from './input/InputManager';

// Tween
export {
	createTween,
	createParallelTweens,
	createSequentialTweens,
	type Tween,
	type TweenOptions
} from './tween/Tween';
export {
	linear,
	easeInQuad,
	easeOutQuad,
	easeInOutQuad,
	easeInCubic,
	easeOutCubic,
	easeInOutCubic,
	easeInQuart,
	easeOutQuart,
	easeInOutQuart,
	easeInQuint,
	easeOutQuint,
	easeInOutQuint,
	easeInBack,
	easeOutBack,
	easeInOutBack,
	easeInBounce,
	easeOutBounce,
	easeInOutBounce,
	easeInElastic,
	easeOutElastic,
	easeInOutElastic,
	easings,
	type EasingFunction,
	type EasingName
} from './tween/easings';

// Audio
export {
	createSoundManager,
	type SoundManager,
	type SoundConfig
} from './audio/SoundManager';

// Haptics
export { createHapticManager, type HapticManager } from './haptics/HapticManager';

// Achievements
export {
	createAchievementManager,
	type AchievementManager,
	type AchievementDefinition,
	type Achievement,
	type AchievementProgress
} from './achievements/AchievementManager';
export {
	createReactiveAchievementManager,
	type ReactiveAchievementDefinition,
	type ReactiveAchievementManager
} from './achievements/ReactiveAchievementManager';

// Time
export {
	createCalendarService,
	type CalendarService,
	type CalendarConfig
} from './time/CalendarService';

// UI
export { createModalQueue, type ModalQueue, type ModalQueueItem } from './ui/ModalQueue';

// Analytics
export {
	createAnalyticsManager,
	createConsoleAnalyticsProvider,
	type AnalyticsManager,
	type AnalyticsProvider,
	type AnalyticsEvent
} from './analytics/AnalyticsManager';

// Platform
export {
	createPlayStoreHooks,
	isNativeContext,
	type PlayStoreHooks,
	type Product,
	type PurchaseResult,
	type LeaderboardEntry
} from './platform/PlayStoreHooks';
