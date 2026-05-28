import { effect } from '@preact/signals';
import { document$, isDirty$, loadDocument, type ElementorDocument } from './EditorState';

// ─── Types ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'figmantor-editor-state';

// ─── Save ─────────────────────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced auto-save — fires 2s after the last change */
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const doc = document$.value;
    if (!doc) return;
    parent.postMessage({
      pluginMessage: {
        type: 'save-state',
        data: JSON.stringify(doc),
      }
    }, '*');
  }, 2000);
}

/** Manually trigger an immediate save */
export function saveNow() {
  if (saveTimer) clearTimeout(saveTimer);
  const doc = document$.value;
  if (!doc) return;
  parent.postMessage({
    pluginMessage: {
      type: 'save-state',
      data: JSON.stringify(doc),
    }
  }, '*');
}

/** Mark state as clean after save acknowledged */
export function onSaveAcknowledged() {
  isDirty$.value = false;
}

// ─── Load ─────────────────────────────────────────────────────────────────────

/** Ask code.ts to retrieve the persisted state from figma.clientStorage */
export function requestLoadState() {
  parent.postMessage({ pluginMessage: { type: 'load-state' } }, '*');
}

/** Called when code.ts responds with persisted data */
export function onLoadStateResult(data: string | null): boolean {
  if (!data) return false;
  try {
    const doc = JSON.parse(data) as ElementorDocument;
    if (!doc?.content) return false;
    loadDocument(doc);
    return true;
  } catch {
    return false;
  }
}

// ─── Auto-save watcher ────────────────────────────────────────────────────────

/** 
 * Start the auto-save watcher. Call this once after the app mounts.
 * Returns a cleanup function to stop watching.
 */
export function startAutoSave(): () => void {
  return effect(() => {
    // Read dirty flag to subscribe to it
    if (isDirty$.value && document$.value) {
      scheduleSave();
    }
  });
}
