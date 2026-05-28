import { appState, appTitle } from './state/appState';
import styles from './App.module.css';

export function App() {
  return (
    <div class={styles.app}>
      {appState.value === 'idle' && <IdleScreen />}
      {appState.value === 'loading' && <LoadingScreen />}
      {appState.value === 'builder' && <BuilderScreen />}
    </div>
  );
}

// ---- Idle screen (placeholder — will be built out in Phase 5) ----
function IdleScreen() {
  function handleAnalyze() {
    appState.value = 'loading';
    parent.postMessage({ pluginMessage: { type: 'edit' } }, '*');
  }

  return (
    <div class={styles.idle}>
      <div class={styles.brand}>
        <div class={styles.brandMark}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L10.5 6H14.5L11.5 9.5L12.5 14L8 11.5L3.5 14L4.5 9.5L1.5 6H5.5L8 1Z" fill="white" />
          </svg>
        </div>
        <span class={styles.brandName}>figmantor</span>
      </div>

      <div class={styles.idleContent}>
        <h1 class={styles.idleHeading}>Design in Figma.<br />Build for Elementor.</h1>
        <p class={styles.idleSubheading}>
          Select a frame or sections, then open the visual builder to edit and export Elementor-compatible JSON.
        </p>
      </div>

      <button class={styles.primaryBtn} onClick={handleAnalyze}>
        Open Builder →
      </button>
    </div>
  );
}

// ---- Loading screen ----
function LoadingScreen() {
  return (
    <div class={styles.loading}>
      <div class={styles.spinner} />
      <span class={styles.loadingLabel}>Analyzing selection…</span>
    </div>
  );
}

// ---- Builder screen (placeholder — will be fleshed out in Phase 5) ----
function BuilderScreen() {
  return (
    <div class={styles.builder}>
      <div class={styles.builderPlaceholder}>
        <span>🚧 Builder coming in Phase 2–5</span>
        <span class={styles.builderTitle}>{appTitle.value}</span>
      </div>
    </div>
  );
}

// ---- IPC message handler — runs once on mount ----
if (typeof window !== 'undefined') {
  window.onmessage = (event: MessageEvent) => {
    const msg = event.data?.pluginMessage;
    if (!msg) return;

    if (msg.type === 'edit-data') {
      appTitle.value = msg.title || 'Untitled';
      // TODO: Phase 1 — load into EditorState
      appState.value = 'builder';
    }
  };
}
