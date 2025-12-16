# SvelteGame Engine

[![CI](https://github.com/PxPerfectMike/sveltegame/actions/workflows/ci.yml/badge.svg)](https://github.com/PxPerfectMike/sveltegame/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

A SvelteKit-based mobile game engine template for building 2D casual/puzzle games. PWA-first with all the systems you need to build production-ready mobile games.

## Features

- **Responsive Game Container** - Flexible aspect ratio with automatic letterboxing/pillarboxing
- **Relative Units System** - Design once, scale everywhere with `gu` (game units)
- **Scene Management** - Navigate between scenes with transitions and lifecycle hooks
- **State Management** - Type-safe reactive stores with Svelte 5
- **Save System** - LocalStorage persistence with versioning and migrations
- **Input Manager** - Touch gestures (tap, swipe, drag, pinch)
- **Tween Engine** - Smooth animations with 20+ easing functions
- **Sound Manager** - Web Audio API for effects and music
- **Haptic Feedback** - Vibration API wrapper for mobile
- **Achievement System** - Define, unlock, and persist achievements
- **Analytics Hooks** - Provider-agnostic event tracking
- **Play Store Ready** - Interface stubs for Capacitor/TWA integration
- **PWA Support** - Installable, offline-capable
- **TDD Tested** - 300+ unit tests

## Quick Start

```bash
# Clone this template
git clone https://github.com/yourusername/sveltegame.git my-game
cd my-game

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## Project Structure

```
src/
├── lib/
│   ├── engine/           # Game engine systems
│   │   ├── core/         # GameContainer, viewport, units
│   │   ├── scenes/       # SceneManager, scene store
│   │   ├── state/        # Game state store factory
│   │   ├── save/         # SaveManager with migrations
│   │   ├── input/        # InputManager (touch/gestures)
│   │   ├── tween/        # Tween engine with easings
│   │   ├── audio/        # SoundManager
│   │   ├── haptics/      # HapticManager
│   │   ├── achievements/ # AchievementManager
│   │   ├── analytics/    # AnalyticsManager
│   │   └── platform/     # PlayStore hooks
│   └── components/       # UI components
├── routes/               # SvelteKit pages
└── app.css               # Global styles with CSS variables
```

## Usage Guide

### Game Container & Units

The `GameContainer` wraps your game and provides responsive scaling:

```svelte
<script>
  import { GameContainer } from '$engine';
</script>

<GameContainer>
  <!-- Your game content -->
</GameContainer>
```

Use game units for consistent sizing across devices:

```svelte
<script>
  import { gu, guh } from '$engine';
</script>

<div style="width: {gu`50`}; height: {guh`30`};">
  <!-- This will be 50% of game width, 30% of game height -->
</div>
```

### Scene Management

Define scenes and navigate between them:

```svelte
<script>
  import { SceneManager, createSceneStore } from '$engine';
  import MenuScene from './MenuScene.svelte';
  import GameScene from './GameScene.svelte';

  const scenes = [
    { id: 'menu', component: MenuScene },
    { id: 'game', component: GameScene, onEnter: () => console.log('Game started!') }
  ];
</script>

<SceneManager {scenes} initialScene="menu" />
```

Navigate from within a scene:

```svelte
<script>
  import { getContext } from 'svelte';
  const sceneStore = getContext(Symbol.for('scene-store'));

  function startGame() {
    sceneStore.goto('game', { type: 'fade', duration: 300 });
  }
</script>
```

### State Management

Create typed game stores:

```typescript
import { createGameStore } from '$engine';

interface GameState {
  score: number;
  level: number;
  lives: number;
}

const gameStore = createGameStore<GameState>({
  score: 0,
  level: 1,
  lives: 3
});

// Update state
gameStore.patch({ score: 100 });

// Subscribe to changes
gameStore.subscribe(state => console.log('Score:', state.score));
```

### Save System

Persist game data with automatic migrations:

```typescript
import { createSaveManager } from '$engine';

const saveManager = createSaveManager<SaveData>('my-game-save', {
  version: 2,
  migrations: [
    {
      version: 2,
      migrate: (data) => ({ ...data, newField: 'default' })
    }
  ]
});

// Save
saveManager.save({ score: 100, level: 5 });

// Load with default
const data = saveManager.loadOrDefault({ score: 0, level: 1 });
```

### Input Handling

Handle touch gestures:

```typescript
import { createInputManager } from '$engine';

const input = createInputManager(element);

input.onTap((pos) => console.log('Tapped at', pos));
input.onSwipe((dir, velocity) => console.log('Swiped', dir));
input.onDrag((start, current, delta) => console.log('Dragging'));
input.onPinch((scale, center) => console.log('Pinch zoom', scale));

// Cleanup
onDestroy(() => input.destroy());
```

### Animations

Animate values with easing:

```typescript
import { createTween, easeOutBounce } from '$engine';

const tween = createTween({
  from: 0,
  to: 100,
  duration: 1000,
  easing: easeOutBounce,
  onUpdate: (value) => {
    element.style.transform = `translateY(${value}px)`;
  },
  onComplete: () => console.log('Done!')
});

tween.start();
```

### Sound

Play sounds and music:

```typescript
import { createSoundManager } from '$engine';

const sound = createSoundManager({ soundsPath: '/sounds/' });

// Preload sounds
await sound.preload(['click', 'success', 'background']);

// Play effects
sound.play('click');
sound.play('success', 0.5); // 50% volume

// Background music
sound.playMusic('background', true); // loop

// Volume control
sound.setVolume(0.8);
sound.setMuted(true);
```

### Haptic Feedback

Provide tactile feedback:

```typescript
import { createHapticManager } from '$engine';

const haptic = createHapticManager();

haptic.tap();      // Quick tap feedback
haptic.success();  // Success pattern
haptic.error();    // Error pattern
haptic.heavy();    // Strong vibration
```

### Achievements

Track player achievements:

```typescript
import { createAchievementManager } from '$engine';

const achievements = createAchievementManager([
  { id: 'first_win', name: 'First Victory', description: 'Win your first game' },
  { id: 'score_100', name: 'Century', description: 'Score 100 points' }
], 'my-game-achievements');

// Unlock
if (achievements.unlock('first_win')) {
  // Show notification - this was newly unlocked
}

// Check progress
const progress = achievements.getProgress();
console.log(`${progress.unlocked}/${progress.total} (${progress.percentage}%)`);

// Listen for unlocks
achievements.onUnlock((achievement) => {
  showAchievementToast(achievement);
});
```

### Analytics

Track game events:

```typescript
import { createAnalyticsManager, createConsoleAnalyticsProvider } from '$engine';

const analytics = createAnalyticsManager();

// Use console provider for development
analytics.setProvider(createConsoleAnalyticsProvider());

// Track events
analytics.levelStart(5);
analytics.levelComplete(5, 1000, 3);
analytics.levelFail(5, 'out_of_moves');
analytics.purchase('gem_pack', 4.99, 'USD');

// Custom events
analytics.track({ name: 'custom_event', params: { foo: 'bar' } });
```

## PWA Configuration

The template is configured as a PWA with:

- `manifest.json` with game metadata
- Fullscreen display mode
- Portrait orientation lock
- iOS meta tags for home screen

To customize, edit `static/manifest.json` and add your icons to `static/icons/`.

## Play Store Integration

When ready to publish to the Play Store, wrap with Capacitor:

```bash
npm install @capacitor/core @capacitor/android
npx cap init
npx cap add android
```

Then implement the `PlayStoreHooks` interface with Capacitor plugins for:
- In-app purchases
- Leaderboards
- Cloud save
- Google Play Games sign-in

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run check      # Type check
```

## CSS Variables

Customize the look by overriding CSS custom properties:

```css
:root {
  --color-bg: #1a1a2e;
  --color-surface: #16213e;
  --color-primary: #e94560;
  --color-secondary: #0f3460;
  --color-text: #ffffff;
  --color-text-muted: #a0a0a0;
}
```

## License

MIT
