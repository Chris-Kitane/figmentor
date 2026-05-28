import { ElementorNode, getResponsiveSetting } from '../../editor/EditorState';
import { safeColor } from '../utils';

export function IconElement({ el }: { el: ElementorNode }) {
  const s = el.settings || {};
  
  const wrapStyle: Record<string, string> = {};
  const padding = getResponsiveSetting(el, '_padding');
  if (padding) {
    wrapStyle.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }
  
  if (s.align === 'center') wrapStyle.justifyContent = 'center';
  else if (s.align === 'right') wrapStyle.justifyContent = 'flex-end';
  else wrapStyle.justifyContent = 'flex-start';

  const iconStyle: Record<string, string> = {};
  if (s.primary_color) iconStyle.color = safeColor(s.primary_color);
  
  const size = s.size?.size || '24';
  iconStyle.width = size + 'px';
  iconStyle.height = size + 'px';
  iconStyle.fontSize = size + 'px';

  return (
    <div class="el-widget-icon" style={wrapStyle} data-element-id={el.id}>
      <div class="el-icon-inner" style={iconStyle}>
        <svg viewBox="0 0 24 24">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </div>
    </div>
  );
}
