import { ElementorNode } from '../editor/EditorState';
import { ContainerElement } from './elements/ContainerElement';
import { HeadingElement } from './elements/HeadingElement';
import { ImageElement } from './elements/ImageElement';
import { ButtonElement } from './elements/ButtonElement';
import { IconElement } from './elements/IconElement';
import { IconListElement } from './elements/IconListElement';
import { UnknownElement } from './elements/UnknownElement';
import { activeBreakpoint$ } from '../editor/EditorState';

export function CanvasRenderer({ el }: { el: ElementorNode }) {
  if (!el) return null;

  // Visibility check
  const bp = activeBreakpoint$.value;
  const isHidden = el.settings?.[`hide_${bp}`] === 'hide';
  if (isHidden) {
    // In builder mode, we might want to render it dimly, but for now we just dim it using a style
    // Wait, let's just apply a dimming style instead of not rendering it at all.
  }

  const visibilityStyle = isHidden ? { opacity: 0.3, outline: '1px dashed #f59e0b', outlineOffset: '-1px' } : {};

  // Wrapper for rendering Section labels if it's a top level container with a _title
  const label = el.settings?._title;
  
  let Inner: preact.VNode;

  if (el.elType === 'container') {
    Inner = <ContainerElement el={el} />;
  } else if (el.elType === 'widget') {
    switch (el.widgetType) {
      case 'heading': Inner = <HeadingElement el={el} />; break;
      case 'image': Inner = <ImageElement el={el} />; break;
      case 'icon-list': Inner = <IconListElement el={el} />; break;
      case 'button': Inner = <ButtonElement el={el} />; break;
      case 'icon': Inner = <IconElement el={el} />; break;
      default: Inner = <UnknownElement el={el} />; break;
    }
  } else {
    return null;
  }

  return (
    <div class="el-section-wrap" style={visibilityStyle}>
      {label && <div class="el-section-label">{label}</div>}
      {Inner}
    </div>
  );
}
