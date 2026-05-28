import { signal } from '@preact/signals';

// App states
export type AppState = 'idle' | 'loading' | 'builder';

export const appState = signal<AppState>('idle');
export const appTitle = signal<string>('');
export const canvasZoom$ = signal<number>(0.5);
