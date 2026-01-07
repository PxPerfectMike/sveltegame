import { describe, it, expect, vi } from 'vitest';
import {
	createSceneStore,
	type SceneDefinition,
	type SceneTransition,
	type NavigationOptions
} from '$engine/scenes/sceneStore';

// Mock scene components
const MockMenuScene = { name: 'MenuScene' };
const MockGameScene = { name: 'GameScene' };
const MockSettingsScene = { name: 'SettingsScene' };

describe('scene data passing', () => {
	const scenes: SceneDefinition[] = [
		{ id: 'menu', component: MockMenuScene },
		{ id: 'game', component: MockGameScene },
		{ id: 'settings', component: MockSettingsScene }
	];

	describe('goto with data', () => {
		it('should accept data in options parameter', async () => {
			const store = createSceneStore(scenes, 'menu');
			const options: NavigationOptions = {
				transition: { type: 'fade', duration: 300 },
				data: { score: 100, level: 5 }
			};

			await store.goto('game', options);

			expect(store.getState().currentScene).toBe('game');
		});

		it('should store data accessible in target scene', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.goto('game', {
				data: { playerName: 'Hero', health: 100 }
			});

			const data = store.getSceneData<{ playerName: string; health: number }>();
			expect(data).toEqual({ playerName: 'Hero', health: 100 });
		});

		it('should clear data on subsequent navigation without data', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.goto('game', { data: { test: 'value' } });
			expect(store.getSceneData()).toEqual({ test: 'value' });

			await store.goto('settings'); // No data
			expect(store.getSceneData()).toBeNull();
		});

		it('should preserve transition options when passing data', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.goto('game', {
				transition: { type: 'slide', duration: 500, direction: 'left' },
				data: { key: 'value' }
			});

			expect(store.getState().currentScene).toBe('game');
		});
	});

	describe('push with data', () => {
		it('should accept data in options parameter', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.push('settings', {
				data: { settingsPage: 'audio' }
			});

			expect(store.getState().currentScene).toBe('settings');
			expect(store.getSceneData()).toEqual({ settingsPage: 'audio' });
		});

		it('should make data available in pushed scene', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.push('game', {
				data: { difficulty: 'hard', enemies: 10 }
			});

			const data = store.getSceneData<{ difficulty: string; enemies: number }>();
			expect(data?.difficulty).toBe('hard');
			expect(data?.enemies).toBe(10);
		});
	});

	describe('getSceneData', () => {
		it('should return null when no data was passed', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.goto('game');

			expect(store.getSceneData()).toBeNull();
		});

		it('should return typed data when data was passed', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.goto('game', {
				data: { score: 500, multiplier: 2.5 }
			});

			const data = store.getSceneData<{ score: number; multiplier: number }>();
			expect(data?.score).toBe(500);
			expect(data?.multiplier).toBe(2.5);
		});

		it('should return data for current scene only', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.goto('game', { data: { gameData: true } });
			await store.goto('settings', { data: { settingsData: true } });

			const data = store.getSceneData<{ settingsData: boolean }>();
			expect(data).toEqual({ settingsData: true });
		});
	});

	describe('data lifecycle', () => {
		it('should clear scene data on navigation away', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.goto('game', { data: { test: 'value' } });
			expect(store.getSceneData()).not.toBeNull();

			await store.goto('menu');
			expect(store.getSceneData()).toBeNull();
		});

		it('should allow scenes to have independent data', async () => {
			const store = createSceneStore(scenes, 'menu');

			await store.push('game', { data: { gameKey: 'gameValue' } });
			expect(store.getSceneData()).toEqual({ gameKey: 'gameValue' });

			await store.push('settings', { data: { settingsKey: 'settingsValue' } });
			expect(store.getSceneData()).toEqual({ settingsKey: 'settingsValue' });
		});
	});

	describe('backward compatibility', () => {
		it('should work with legacy goto(id, transition) signature', async () => {
			const store = createSceneStore(scenes, 'menu');
			const transition: SceneTransition = { type: 'fade', duration: 300 };

			await store.goto('game', transition);

			expect(store.getState().currentScene).toBe('game');
			expect(store.getSceneData()).toBeNull();
		});

		it('should work with legacy push(id, transition) signature', async () => {
			const store = createSceneStore(scenes, 'menu');
			const transition: SceneTransition = { type: 'slide', duration: 200 };

			await store.push('settings', transition);

			expect(store.getState().currentScene).toBe('settings');
			expect(store.getSceneData()).toBeNull();
		});
	});
});
