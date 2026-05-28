import { ElementorNode } from '../../editor/EditorState';

export function UnknownElement({ el }: { el: ElementorNode }) {
  const type = el.widgetType || 'widget';
  
  const style = {
    background: 'rgba(99,102,241,0.06)',
    border: '1px dashed rgba(99,102,241,0.3)',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '11px',
    color: 'rgba(129,140,248,0.8)',
    fontFamily: "'Inter', sans-serif"
  };

  return (
    <div style={style} data-element-id={el.id}>
      {type}
    </div>
  );
}
