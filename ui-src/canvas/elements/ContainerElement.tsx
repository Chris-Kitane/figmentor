import { ElementorNode, getResponsiveSetting } from '../../editor/EditorState';
import { safeColor } from '../utils';
import { CanvasRenderer } from '../CanvasRenderer';

export function ContainerElement({ el }: { el: ElementorNode }) {
  const s = el.settings || {};
  const isGrid = s.container_type === 'grid';
  
  const style: Record<string, string> = {};
  
  // Layout
  style.display = isGrid ? 'grid' : 'flex';
  
  if (isGrid) {
    const cols = s.grid_columns_grid?.size || 1;
    style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    if (s.grid_gaps) {
      style.columnGap = (s.grid_gaps.column || '0') + 'px';
      style.rowGap = (s.grid_gaps.row || '0') + 'px';
    }
  } else {
    style.flexDirection = getResponsiveSetting(el, 'flex_direction') || 'row';
    style.justifyContent = getResponsiveSetting(el, 'flex_justify_content') || 'flex-start';
    style.alignItems = getResponsiveSetting(el, 'flex_align_items') || 'flex-start';
    
    const flexWrap = getResponsiveSetting(el, 'flex_wrap');
    if (flexWrap) {
      style.flexWrap = flexWrap;
    }
    
    const gap = getResponsiveSetting(el, 'flex_gap');
    if (gap) {
      style.columnGap = gap.column + 'px';
      style.rowGap = gap.row + 'px';
    }
  }

  // Padding
  const padding = getResponsiveSetting(el, 'padding');
  if (padding) {
    style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }

  // Background
  const bgColor = getResponsiveSetting(el, 'background_color');
  if (getResponsiveSetting(el, 'background_background') === 'classic' && bgColor) {
    style.backgroundColor = safeColor(bgColor);
  }

  // Border radius
  const radius = getResponsiveSetting(el, 'border_radius');
  if (radius) {
    style.borderRadius = `${radius.top}px ${radius.right}px ${radius.bottom}px ${radius.left}px`;
  }

  // Width
  const widthStr = getResponsiveSetting(el, 'width');
  const boxedWidth = getResponsiveSetting(el, 'boxed_width');
  const contentWidth = getResponsiveSetting(el, 'content_width');
  
  if (contentWidth === 'full') {
    style.width = '100%';
  } else if (boxedWidth?.size) {
    style.maxWidth = boxedWidth.size + 'px';
    style.margin = '0 auto';
    style.width = '100%';
  } else if (widthStr?.size) {
    style.width = widthStr.size + (widthStr.unit || 'px');
  }

  // Min Height
  const minHeight = getResponsiveSetting(el, 'min_height');
  if (minHeight?.size) {
      style.minHeight = minHeight.size + (minHeight.unit || 'px');
  }

  // Absolute positioning
  if (s._position === 'absolute') {
    style.position = 'absolute';
    if (s._offset_x) style.left = s._offset_x.size + 'px';
    if (s._offset_y) style.top = s._offset_y.size + 'px';
  }

  // Visibility (we can hide by CSS or just apply a class, let's use style for now)
  const isHiddenDesktop = getResponsiveSetting(el, 'hide_desktop');
  const isHiddenTablet = getResponsiveSetting(el, 'hide_tablet');
  const isHiddenMobile = getResponsiveSetting(el, 'hide_mobile');
  // the actual hide logic will be dependent on the current activeBreakpoint.
  // but since our component re-renders when activeBreakpoint changes (because we use getResponsiveSetting),
  // we just need to read the specific hide_{bp} setting for the current breakpoint.
  // Wait, getResponsiveSetting is actually used for responsive keys.
  // For visibility, the keys are explicit: hide_desktop: "hide", hide_tablet: "hide", hide_mobile: "hide".
  // Since they don't follow the base_breakpoint naming convention strictly in Elementor (they are explicit keys),
  // we should check them based on the activeBreakpoint.
  // Let's implement that in a custom way here or in CanvasRenderer.
  
  return (
    <div 
      class={`el-container ${isGrid ? 'el-grid' : 'el-flex'}`}
      style={style}
      data-element-id={el.id}
    >
      {el.elements.map(child => (
        <CanvasRenderer key={child.id} el={child} />
      ))}
    </div>
  );
}
