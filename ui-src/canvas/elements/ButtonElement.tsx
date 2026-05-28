import { ElementorNode, getResponsiveSetting } from '../../editor/EditorState';
import { safeColor, safeCSSString } from '../utils';

export function ButtonElement({ el }: { el: ElementorNode }) {
  const s = el.settings || {};
  const wrapStyle: Record<string, string> = {};

  if (s.content_align === 'center') wrapStyle.justifyContent = 'center';
  else if (s.content_align === 'right') wrapStyle.justifyContent = 'flex-end';
  else if (s.content_align === 'justify') {
    wrapStyle.justifyContent = 'stretch';
    wrapStyle.width = '100%';
  } else wrapStyle.justifyContent = 'flex-start';

  if (s._element_width === '100%') {
    wrapStyle.width = '100%';
  } else if (s._element_width === 'initial' && s._element_custom_width?.size) {
    wrapStyle.width = s._element_custom_width.size + (s._element_custom_width.unit || '%');
  }
  wrapStyle.flex = '0 0 auto';
  
  const padding = getResponsiveSetting(el, '_padding');
  if (padding) {
    wrapStyle.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }

  const btnStyle: Record<string, string> = {};
  if (s.button_text_color) btnStyle.color = safeColor(s.button_text_color);
  if (s.background_color) btnStyle.backgroundColor = safeColor(s.background_color);
  
  if (s.typography_font_family) btnStyle.fontFamily = `'${safeCSSString(s.typography_font_family)}', sans-serif`;
  if (s.typography_font_size?.size) btnStyle.fontSize = s.typography_font_size.size + 'px';
  if (s.typography_font_weight) btnStyle.fontWeight = s.typography_font_weight;
  
  if (s.border_radius) {
    btnStyle.borderRadius = `${s.border_radius.top}px ${s.border_radius.right}px ${s.border_radius.bottom}px ${s.border_radius.left}px`;
  }
  
  if (s.text_padding) {
    btnStyle.padding = `${s.text_padding.top}px ${s.text_padding.right}px ${s.text_padding.bottom}px ${s.text_padding.left}px`;
  }

  return (
    <div class="el-widget-button" style={wrapStyle} data-element-id={el.id}>
      <div class="el-button-inner" style={btnStyle}>
        {s.text || ''}
      </div>
    </div>
  );
}
