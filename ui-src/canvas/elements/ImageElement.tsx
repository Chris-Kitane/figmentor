import { ElementorNode, getResponsiveSetting } from '../../editor/EditorState';
import { isSafeImageUrl } from '../utils';

export function ImageElement({ el }: { el: ElementorNode }) {
  const s = el.settings || {};
  const style: Record<string, string> = {};

  if (s._position === 'absolute') {
    style.position = 'absolute';
    if (s._offset_x) style.left = s._offset_x.size + 'px';
    if (s._offset_y) style.top = s._offset_y.size + 'px';
  }
  
  const padding = getResponsiveSetting(el, '_padding');
  if (padding) {
    style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }

  const borderRadius = s.image_border_radius?.top;
  
  const url = s.image?.url;
  const hasUrl = url && isSafeImageUrl(url);

  return (
    <div class="el-widget-image" style={style} data-element-id={el.id}>
      {hasUrl ? (
        <img 
          src={url} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            borderRadius: borderRadius ? `${borderRadius}px` : undefined
          }}
        />
      ) : (
        <div class="el-image-placeholder" style={{ borderRadius: borderRadius ? `${borderRadius}px` : undefined }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="3" y="8" width="34" height="24" rx="3" stroke="#8899aa" stroke-width="2" fill="none"/>
            <circle cx="14" cy="17" r="3.5" stroke="#8899aa" stroke-width="2" fill="none"/>
            <path d="M3 28l9-8 7 6 5-4 13 10" stroke="#8899aa" stroke-width="2" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
      )}
    </div>
  );
}
