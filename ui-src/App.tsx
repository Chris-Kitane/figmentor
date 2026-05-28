import { useEffect, useState } from 'preact/hooks';
import { appState, appTitle } from './state/appState';
import {
  loadDocument,
  document$,
  isDirty$,
  type ElementorDocument,
} from './editor/EditorState';
import {
  startAutoSave,
  onSaveAcknowledged,
  onLoadStateResult,
  requestLoadState,
} from './editor/persistence';
import { Canvas } from './canvas/Canvas';
import styles from './App.module.css';

// Start auto-save watcher (runs once when module loads)
startAutoSave();

export function App() {
  return (
    <div class={styles.app}>
      {appState.value === 'idle' && <IdleScreen />}
      {appState.value === 'loading' && <LoadingScreen />}
      {appState.value === 'builder' && <BuilderScreen />}
      <IpcHandler />
    </div>
  );
}

// ─── IPC Message Handler ──────────────────────────────────────────────────────

/** 
 * Handles all messages from code.ts (Figma main thread).
 * Mounted once as a side-effect component — doesn't render anything.
 */
function IpcHandler() {
  useEffect(() => {
    // On mount: ask code.ts if there's a saved session
    requestLoadState();

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        // A fresh Figma analysis arrived → load into editor
        case 'edit-data': {
          try {
            const doc: ElementorDocument = JSON.parse(msg.data);
            loadDocument(doc);
            appTitle.value = msg.title || doc.title || 'Untitled';
            appState.value = 'builder';
          } catch (e) {
            console.error('[figmantor] Failed to parse edit-data:', e);
            appState.value = 'idle';
          }
          break;
        }

        // Saved session response from clientStorage
        case 'load-state-result': {
          // Only restore if we're still on the idle screen (don't clobber a fresh analysis)
          if (appState.value === 'idle' && msg.data) {
            const restored = onLoadStateResult(msg.data);
            if (restored && document$.value) {
              appTitle.value = document$.value.title || 'Untitled';
              appState.value = 'builder';
            }
          }
          break;
        }

        // Auto-save was acknowledged by code.ts
        case 'save-ack': {
          onSaveAcknowledged();
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return null;
}

// ─── Idle Screen ──────────────────────────────────────────────────────────────

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

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div class={styles.loading}>
      <div class={styles.spinner} />
      <span class={styles.loadingLabel}>Analyzing selection…</span>
    </div>
  );
}

// ─── Builder Screen (placeholder — fleshed out in Phase 5) ───────────────────

function BuilderScreen() {
  const [hasSaved, setHasSaved] = useState(false);

  function handleBackToIdle() {
    if (isDirty$.value) {
      const ok = window.confirm('You have unsaved changes. Start fresh from Figma?');
      if (!ok) return;
    }
    appState.value = 'idle';
  }

  function handleExport() {
    const doc = document$.value;
    if (!doc) return;
    const json = JSON.stringify(doc, null, 2);
    const title = doc.title || 'elementor-export';
    parent.postMessage({
      pluginMessage: { type: 'download', data: json, filename: title }
    }, '*');
  }

  // Show a transient "Saved" indicator when isDirty flips to false
  useEffect(() => {
    const cleanup = isDirty$.subscribe((dirty) => {
      if (!dirty) {
        setHasSaved(true);
        const t = setTimeout(() => setHasSaved(false), 2000);
        return () => clearTimeout(t);
      }
    });
    return cleanup;
  }, []);

  return (
    <div class={styles.builder}>
      {/* Placeholder toolbar */}
      <div class={styles.builderToolbar}>
        <button class={styles.ghostBtn} onClick={handleBackToIdle}>← Back</button>
        <span class={styles.builderTitle}>{appTitle.value}</span>
        <div class={styles.toolbarRight}>
          {hasSaved && <span class={styles.savedBadge}>✓ Saved</span>}
          {isDirty$.value && <span class={styles.dirtyBadge}>● Unsaved</span>}
          <button class={styles.exportBtn} onClick={handleExport}>Download →</button>
        </div>
      </div>

      {/* Main workspace */}
      <div class={styles.builderBody}>
        <Canvas />
        <div style={{ width: '260px', background: 'var(--surface-2)', borderLeft: '1px solid var(--border)' }}>
          <div style={{ padding: '20px', color: 'var(--text-2)', fontSize: '13px', textAlign: 'center' }}>
            Sidebar coming in Phase 3
          </div>
        </div>
      </div>
    </div>
  );
}
