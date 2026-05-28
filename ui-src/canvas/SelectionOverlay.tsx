import { useEffect, useState } from 'preact/hooks';
import { selectedId$, document$, activeBreakpoint$ } from '../editor/EditorState';

export function SelectionOverlay() {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [label, setLabel] = useState<string>('');
  const [type, setType] = useState<string>('');

  const selectedId = selectedId$.value;
  // We subscribe to document$ and activeBreakpoint$ so we re-render overlay when layout changes
  const _doc = document$.value;
  const _bp = activeBreakpoint$.value;

  useEffect(() => {
    if (!selectedId) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(`[data-element-id="${selectedId}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
        
        // Find label
        const node = _doc?.content.find(c => findNodeInTree(c, selectedId));
        if (node) {
          const target = findNodeInTree(node, selectedId);
          if (target) {
            setLabel(target.settings?._title || target.widgetType || target.elType);
            setType(target.elType);
          }
        }
      } else {
        setRect(null);
      }
    };

    updateRect();

    // Setup observers to track layout changes
    const resizeObserver = new ResizeObserver(updateRect);
    const canvasEl = document.getElementById('render-canvas');
    if (canvasEl) {
      resizeObserver.observe(canvasEl);
    }
    
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true); // capture phase for any scroll

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [selectedId, _doc, _bp]);

  if (!selectedId || !rect) return null;

  // Since the overlay is rendered inside a relative wrapper that might have its own scale/offset,
  // we actually want the overlay to be fixed or absolute to the viewport.
  // Wait, if it's absolute to the `render-viewport`, we need to account for scroll.
  // Let's use fixed positioning to make it easy, matching getBoundingClientRect directly.

  const style = {
    position: 'fixed' as const,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    border: '2px solid var(--accent)',
    pointerEvents: 'none' as const,
    zIndex: 9999,
  };

  const labelStyle = {
    position: 'absolute' as const,
    top: '-20px',
    left: '-2px',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px 4px 4px 0',
    whiteSpace: 'nowrap' as const,
    fontWeight: 'bold' as const,
    pointerEvents: 'none' as const,
  };

  return (
    <div style={style}>
      <div style={labelStyle}>
        {type === 'container' ? 'Container' : label}
      </div>
    </div>
  );
}

function findNodeInTree(node: any, id: string): any {
  if (node.id === id) return node;
  if (node.elements) {
    for (const child of node.elements) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  return null;
}
