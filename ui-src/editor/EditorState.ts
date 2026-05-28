import { signal, computed } from '@preact/signals';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export interface ElementorSettings {
  [key: string]: any;
}

export interface ElementorNode {
  id: string;
  elType: 'container' | 'widget';
  widgetType?: string;
  settings: ElementorSettings;
  elements: ElementorNode[];
  isInner?: boolean;
}

export interface ElementorDocument {
  version: string;
  title: string;
  type: string;
  content: ElementorNode[];
}

// ─── Reactive State ───────────────────────────────────────────────────────────

export const document$ = signal<ElementorDocument | null>(null);
export const selectedId$ = signal<string | null>(null);
export const activeBreakpoint$ = signal<Breakpoint>('desktop');
export const isDirty$ = signal(false);

// Derived: the currently selected node (or null)
export const selectedNode$ = computed(() => {
  if (!document$.value || !selectedId$.value) return null;
  return findById(document$.value.content, selectedId$.value);
});

// ─── Tree Utilities ───────────────────────────────────────────────────────────

/** Recursively find a node by ID */
function findById(nodes: ElementorNode[], id: string): ElementorNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.elements?.length) {
      const found = findById(node.elements, id);
      if (found) return found;
    }
  }
  return null;
}

/** Recursively find the parent of a node by child ID */
function findParentOf(
  nodes: ElementorNode[],
  id: string,
  parent: ElementorNode | null = null
): { parent: ElementorNode | null; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return { parent, index: i };
    const child = nodes[i].elements;
    if (child?.length) {
      const found = findParentOf(child, id, nodes[i]);
      if (found) return found;
    }
  }
  return null;
}

/** Deep clone and re-generate IDs for a subtree */
function deepCloneWithNewIds(node: ElementorNode): ElementorNode {
  return {
    ...node,
    id: generateId(),
    settings: { ...node.settings },
    elements: node.elements.map(deepCloneWithNewIds),
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─── Responsive key mapping ───────────────────────────────────────────────────

/**
 * Returns the suffixed settings key for a given breakpoint.
 * e.g. ('padding', 'tablet') → 'padding_tablet'
 *      ('padding', 'desktop') → 'padding'
 */
function responsiveKey(base: string, bp: Breakpoint): string {
  return bp === 'desktop' ? base : `${base}_${bp}`;
}

// ─── Document Operations ──────────────────────────────────────────────────────

/** Load a parsed Elementor JSON document into the editor */
export function loadDocument(json: ElementorDocument) {
  document$.value = json;
  selectedId$.value = null;
  isDirty$.value = false;
}

/** Select a node by ID (or deselect with null) */
export function selectElement(id: string | null) {
  selectedId$.value = id;
}

/** Switch the active viewport breakpoint */
export function setBreakpoint(bp: Breakpoint) {
  activeBreakpoint$.value = bp;
}

// ─── Settings Read/Write ──────────────────────────────────────────────────────

/**
 * Get the **effective** value of a settings key for the current breakpoint,
 * applying cascading inheritance: mobile → tablet → desktop.
 *
 * e.g. if breakpoint is 'mobile' and 'padding_mobile' is not set,
 *      falls back to 'padding_tablet', then 'padding'.
 */
export function getResponsiveSetting(node: ElementorNode, base: string): any {
  const bp = activeBreakpoint$.value;
  const s = node.settings;

  if (bp === 'mobile') {
    return s[`${base}_mobile`] ?? s[`${base}_tablet`] ?? s[base];
  }
  if (bp === 'tablet') {
    return s[`${base}_tablet`] ?? s[base];
  }
  return s[base];
}

/**
 * Check whether a responsive override exists specifically for the current
 * breakpoint (i.e., returns true if a tablet/mobile key is explicitly set).
 */
export function hasResponsiveOverride(node: ElementorNode, base: string): boolean {
  const bp = activeBreakpoint$.value;
  if (bp === 'desktop') return false;
  return node.settings[`${base}_${bp}`] !== undefined;
}

/**
 * Set a settings value for the **active breakpoint**.
 * Mutations go directly to the correct responsive key.
 * e.g. if breakpoint is 'tablet', sets 'padding_tablet'.
 */
export function setResponsiveSetting(id: string, base: string, value: any) {
  if (!document$.value) return;
  const node = findById(document$.value.content, id);
  if (!node) return;

  const key = responsiveKey(base, activeBreakpoint$.value);

  // Mutate a fresh copy to trigger Preact signal reactivity
  const newDoc = deepCloneDoc(document$.value);
  const target = findById(newDoc.content, id)!;
  target.settings = { ...target.settings, [key]: value };

  document$.value = newDoc;
  isDirty$.value = true;
}

/** Merge a partial settings patch into a node (always writes to active breakpoint's keys) */
export function updateSettings(id: string, patch: ElementorSettings) {
  if (!document$.value) return;

  const bp = activeBreakpoint$.value;
  const newDoc = deepCloneDoc(document$.value);
  const target = findById(newDoc.content, id);
  if (!target) return;

  // For each key in the patch, route it to the correct breakpoint key
  const mappedPatch: ElementorSettings = {};
  for (const [base, value] of Object.entries(patch)) {
    mappedPatch[responsiveKey(base, bp)] = value;
  }

  target.settings = { ...target.settings, ...mappedPatch };
  document$.value = newDoc;
  isDirty$.value = true;
}

/** Directly update settings without any breakpoint mapping (raw write) */
export function updateSettingsRaw(id: string, patch: ElementorSettings) {
  if (!document$.value) return;

  const newDoc = deepCloneDoc(document$.value);
  const target = findById(newDoc.content, id);
  if (!target) return;

  target.settings = { ...target.settings, ...patch };
  document$.value = newDoc;
  isDirty$.value = true;
}

// ─── Tree Operations (Phase 7) ────────────────────────────────────────────────

/** Insert a new element as a child of parentId at a given index */
export function insertElement(parentId: string | null, element: ElementorNode, index?: number) {
  if (!document$.value) return;
  const newDoc = deepCloneDoc(document$.value);

  if (parentId === null) {
    // Insert at top level
    const i = index ?? newDoc.content.length;
    newDoc.content.splice(i, 0, element);
  } else {
    const parent = findById(newDoc.content, parentId);
    if (!parent) return;
    const i = index ?? parent.elements.length;
    parent.elements.splice(i, 0, element);
  }

  document$.value = newDoc;
  isDirty$.value = true;
}

/** Remove an element by ID */
export function removeElement(id: string) {
  if (!document$.value) return;
  const newDoc = deepCloneDoc(document$.value);
  const result = findParentOf(newDoc.content, id);
  if (!result) return;

  const { parent, index } = result;
  if (parent === null) {
    newDoc.content.splice(index, 1);
  } else {
    parent.elements.splice(index, 1);
  }

  if (selectedId$.value === id) selectedId$.value = null;
  document$.value = newDoc;
  isDirty$.value = true;
}

/** Move an element to a new parent and/or index */
export function moveElement(id: string, newParentId: string | null, newIndex: number) {
  if (!document$.value) return;
  const newDoc = deepCloneDoc(document$.value);

  // Detach from current position
  const result = findParentOf(newDoc.content, id);
  if (!result) return;
  const { parent, index } = result;
  const [node] = parent === null
    ? newDoc.content.splice(index, 1)
    : parent.elements.splice(index, 1);

  // Re-attach at new position
  if (newParentId === null) {
    newDoc.content.splice(newIndex, 0, node);
  } else {
    const newParent = findById(newDoc.content, newParentId);
    if (!newParent) return;
    newParent.elements.splice(newIndex, 0, node);
  }

  document$.value = newDoc;
  isDirty$.value = true;
}

/** Deep clone an element (with new IDs) and insert it after the original */
export function duplicateElement(id: string) {
  if (!document$.value) return;
  const newDoc = deepCloneDoc(document$.value);

  const result = findParentOf(newDoc.content, id);
  if (!result) return;
  const { parent, index } = result;

  const original = parent === null ? newDoc.content[index] : parent.elements[index];
  const clone = deepCloneWithNewIds(original);

  if (parent === null) {
    newDoc.content.splice(index + 1, 0, clone);
  } else {
    parent.elements.splice(index + 1, 0, clone);
  }

  document$.value = newDoc;
  isDirty$.value = true;
  selectElement(clone.id);
}

// ─── Export ───────────────────────────────────────────────────────────────────

/** Serialize the current document to a clean Elementor JSON string */
export function exportJSON(): string {
  if (!document$.value) return '{}';
  return JSON.stringify(document$.value, null, 2);
}

/** Get the document title */
export function getTitle(): string {
  return document$.value?.title ?? 'Untitled';
}

// ─── Internal deep-clone helper ───────────────────────────────────────────────

function deepCloneDoc(doc: ElementorDocument): ElementorDocument {
  return JSON.parse(JSON.stringify(doc));
}

// ─── Default element factories (for Phase 7 "Add Element") ───────────────────

export function createContainer(): ElementorNode {
  return {
    id: generateId(),
    elType: 'container',
    settings: {
      content_width: 'full',
      flex_direction: 'column',
    },
    elements: [],
    isInner: false,
  };
}

export function createHeading(text = 'Heading'): ElementorNode {
  return {
    id: generateId(),
    elType: 'widget',
    widgetType: 'heading',
    settings: {
      title: text,
      header_size: 'h2',
      typography_typography: 'custom',
    },
    elements: [],
  };
}

export function createButton(text = 'Click Here'): ElementorNode {
  return {
    id: generateId(),
    elType: 'widget',
    widgetType: 'button',
    settings: {
      text,
      size: 'md',
    },
    elements: [],
  };
}

export function createImage(): ElementorNode {
  return {
    id: generateId(),
    elType: 'widget',
    widgetType: 'image',
    settings: {
      image: { url: 'https://placehold.co/600x400', id: '', size: '' },
      image_size: 'full',
      content_width: 'full',
    },
    elements: [],
  };
}
