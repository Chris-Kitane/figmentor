import { ElementorNode, getResponsiveSetting } from '../../editor/EditorState';
import { safeColor, safeCSSString } from '../utils';

export function IconListElement({ el }: { el: ElementorNode }) {
  const s = el.settings || {};
  const items: any[] = s.icon_list || [];
  
  const wrapStyle: Record<string, string> = {};
  const padding = getResponsiveSetting(el, '_padding');
  if (padding) {
    wrapStyle.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }
  
  const dotStyle: Record<string, string> = {};
  if (s.icon_color) dotStyle.background = safeColor(s.icon_color);
  
  const textStyle: Record<string, string> = {};
  if (s.text_color) textStyle.color = safeColor(s.text_color);
  if (s.typography_font_family) textStyle.fontFamily = `'${safeCSSString(s.typography_font_family)}', sans-serif`;
  if (s.typography_font_size?.size) textStyle.fontSize = s.typography_font_size.size + 'px';
  if (s.typography_font_weight) textStyle.fontWeight = s.typography_font_weight;

  return (
    <div class="el-widget-iconlist" style={wrapStyle} data-element-id={el.id}>
      <ul class="el-iconlist-ul">
        {items.map((item, i) => (
          <li key={i} class="el-iconlist-li">
            <span class="el-iconlist-dot" style={dotStyle} />
            <span style={textStyle}>{item.text || ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
