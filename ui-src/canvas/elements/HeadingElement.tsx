import { ElementorNode, getResponsiveSetting } from '../../editor/EditorState';
import { safeColor, safeCSSString } from '../utils';

export function HeadingElement({ el }: { el: ElementorNode }) {
  const s = el.settings || {};
  const tag = s.header_size || 'h2';
  const ValidTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];
  const Tag = ValidTags.includes(tag) ? tag : 'p';
  
  const style: Record<string, string> = {};
  
  if (s.title_color) style.color = safeColor(s.title_color);
  if (s.typography_font_family) style.fontFamily = `'${safeCSSString(s.typography_font_family)}', sans-serif`;
  if (s.typography_font_size?.size) style.fontSize = s.typography_font_size.size + 'px';
  if (s.typography_font_weight) style.fontWeight = s.typography_font_weight;
  
  if (s.typography_line_height?.size) {
    const lh = s.typography_line_height;
    style.lineHeight = lh.size + (lh.unit === 'em' ? 'em' : 'px');
  }
  if (s.typography_letter_spacing?.size) {
    style.letterSpacing = s.typography_letter_spacing.size + 'em';
  }

  // Width
  if (s._element_width === '100%') {
    style.width = '100%';
  } else if (s._element_width === 'initial' && s._element_custom_width?.size) {
    style.width = s._element_custom_width.size + (s._element_custom_width.unit || '%');
  }

  // Absolute positioning
  if (s._position === 'absolute') {
    style.position = 'absolute';
    if (s._offset_x) style.left = s._offset_x.size + 'px';
    if (s._offset_y) style.top = s._offset_y.size + 'px';
  }

  // Padding mapping for widgets is _padding
  const padding = getResponsiveSetting(el, '_padding');
  if (padding) {
    style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }

  return (
    <Tag 
      class="el-widget-heading" 
      style={style}
      data-element-id={el.id}
    >
      {s.title || ''}
    </Tag>
  );
}
