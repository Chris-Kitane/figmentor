import { document$, activeBreakpoint$, selectElement } from '../editor/EditorState';
import { canvasZoom$ } from '../state/appState';
import { CanvasRenderer } from './CanvasRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import './Canvas.css';

export function Canvas() {
  const doc = document$.value;
  const zoom = canvasZoom$.value;
  const bp = activeBreakpoint$.value;

  // Responsive widths based on standard Elementor breakpoints
  const canvasWidth = bp === 'desktop' ? '1140px' : bp === 'tablet' ? '768px' : '360px';

  // Handle click delegation for selection
  const handleClick = (e: MouseEvent) => {
    // Traverse up to find the closest data-element-id
    const target = e.target as HTMLElement;
    const el = target.closest('[data-element-id]');
    
    if (el) {
      e.stopPropagation();
      const id = el.getAttribute('data-element-id');
      selectElement(id);
    } else {
      selectElement(null); // Deselect if clicking empty canvas space
    }
  };

  return (
    <div class="canvas-wrapper" onClick={handleClick}>
      <div 
        id="render-canvas"
        class="canvas-container"
        style={{
          width: canvasWidth,
          transform: `scale(${zoom})`,
        }}
      >
        {doc?.content.map(el => (
          <CanvasRenderer key={el.id} el={el} />
        ))}
      </div>
      
      <SelectionOverlay />
    </div>
  );
}
