figma.showUI(__html__, { width: 320, height: 420 });

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function rgbaToHex(color: RGB | RGBA): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function getSharedItemSettings(node: SceneNode): any {
  const settings: any = {};

  if ('layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE') {
    settings._position = 'absolute';
    settings._offset_x = { size: node.x, unit: 'px' };
    settings._offset_y = { size: node.y, unit: 'px' };
    settings._offset_orientation_h = 'start';
    settings._offset_orientation_v = 'start';
  }

  // Extract grid properties if this node is a child of a Grid layout
  if ('gridColumnSpan' in node && typeof (node as any).gridColumnSpan === 'number') {
    const span = (node as any).gridColumnSpan;
    if (span >= 1 && span <= 12) {
      settings.grid_column = span.toString();
    } else if (span > 12) {
      settings.grid_column = 'custom';
      settings.grid_column_custom = `span ${span}`;
    }
  }
  if ('gridRowSpan' in node && typeof (node as any).gridRowSpan === 'number') {
    const span = (node as any).gridRowSpan;
    if (span >= 1 && span <= 12) {
      settings.grid_row = span.toString();
    } else if (span > 12) {
      settings.grid_row = 'custom';
      settings.grid_row_custom = `span ${span}`;
    }
  }

  return settings;
}

function buildElementorNode(node: SceneNode): any {
  if (node.visible === false) return null;

  const id = generateId();
  const nodeName = node.name.toLowerCase();

  // Widget type overrides
  if (nodeName.startsWith('el-image') || nodeName.includes('one image')) {
    const tokens = nodeName.split(/\s+/);
    const imageSettings: any = {
      image: {
        url: "https://placehold.co/600x400",
        id: "",
        size: ""
      },
      // Full Width in both Style and Advanced tabs
      content_width: "full",
      width: { unit: "%", size: 100, sizes: [] },
      _element_width: "inherit",
      image_size: "full",
      ...getSharedItemSettings(node)
    };

    tokens.forEach(token => {
      // Width: w-[number] -> style width in px (Advanced stays Full Width)
      if (token.startsWith('w-') && !token.includes('full')) {
        const m = token.match(/^w-(\d+)$/);
        if (m) {
          imageSettings.width = { unit: 'px', size: parseInt(m[1]), sizes: [] };
        }
      }
      // Height: h-[number] -> explicit height in px
      if (token.startsWith('h-')) {
        const m = token.match(/^h-(\d+)$/);
        if (m) {
          imageSettings.height = { unit: 'px', size: parseInt(m[1]), sizes: [] };
        }
      }
      // Object fit — NOTE: Elementor uses "object-fit" (hyphenated) as the key
      if (token === 'object-cover') imageSettings['object-fit'] = 'cover';
      if (token === 'object-contain') imageSettings['object-fit'] = 'contain';
      if (token === 'object-fill') imageSettings['object-fit'] = 'fill';
      if (token === 'object-none') imageSettings['object-fit'] = 'none';

      // Object position
      if (token === 'object-center') imageSettings.object_position = 'center center';
      if (token === 'object-top') imageSettings.object_position = 'center top';
      if (token === 'object-bottom') imageSettings.object_position = 'center bottom';
      if (token === 'object-left') imageSettings.object_position = 'left center';
      if (token === 'object-right') imageSettings.object_position = 'right center';
      if (token === 'object-top-left') imageSettings.object_position = 'left top';
      if (token === 'object-top-right') imageSettings.object_position = 'right top';

      // Border radius: rounded-[number]
      const rMatch = token.match(/^rounded-(\d+)$/);
      if (rMatch) {
        const r = rMatch[1];
        imageSettings.image_border_radius = { unit: 'px', top: r, right: r, bottom: r, left: r, isLinked: true };
      }
    });


    return {
      id,
      elType: 'widget',
      widgetType: 'image',
      settings: imageSettings,
      elements: []
    };
  }

  // Handle heading override
  if (nodeName.includes('el-text')) {
    // Attempt to find a text child to extract characters
    let titleText = node.name;
    if ('children' in node) {
      const textChild = node.children.find(c => c.type === 'TEXT');
      if (textChild && 'characters' in textChild) {
        titleText = textChild.characters;
      }
    }
    return {
      id,
      elType: 'widget',
      widgetType: 'heading',
      settings: {
        title: titleText,
        ...getSharedItemSettings(node)
      },
      elements: []
    };
  }

  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const isAutoLayout = node.layoutMode !== 'NONE';
    const children = node.children.map(buildElementorNode).filter(Boolean);

    let flexDirection = '';
    let justifyContent = '';
    let alignItems = '';
    let gap = '';
    let padding: any = null;
    let contentWidth = 'full';
    let boxedWidth = '';
    let elementWidth = '';
    let customWidth = '';
    let isGrid = false;
    let gridCols = '';
    let gridRows = '';
    let gridGapX = '';
    let gridGapY = '';
    let gridJustifyItems = '';
    let gridAlignItems = '';

    let backgroundColor = '';
    let borderRadius: any = null;

    if ('fills' in node && Array.isArray(node.fills)) {
      const solidFill = node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
      if (solidFill) {
        backgroundColor = rgbaToHex(solidFill.color);
        // If the color has opacity, Figma stores it as f.opacity. Hex doesn't cover alpha perfectly without 8-digit hex, 
        // but elementor accepts standard hex. We'll stick to rgb-to-hex for now.
      }
    }

    if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      borderRadius = {
        unit: 'px',
        top: node.cornerRadius.toString(),
        right: node.cornerRadius.toString(),
        bottom: node.cornerRadius.toString(),
        left: node.cornerRadius.toString(),
        isLinked: true
      };
    } else if ('topLeftRadius' in node) {
      const top = (node as any).topLeftRadius || 0;
      const right = (node as any).topRightRadius || 0;
      const bottom = (node as any).bottomRightRadius || 0;
      const left = (node as any).bottomLeftRadius || 0;
      if (top > 0 || right > 0 || bottom > 0 || left > 0) {
        borderRadius = {
          unit: 'px',
          top: top.toString(),
          right: right.toString(),
          bottom: bottom.toString(),
          left: left.toString(),
          isLinked: top === right && right === bottom && bottom === left
        };
      }
    }

    if (isAutoLayout || ('layoutMode' in node && node.layoutMode === 'GRID')) {
      if ('layoutMode' in node && node.layoutMode === 'GRID') {
        isGrid = true;
        // The type definition expects gridColumnCount/gridRowCount/gridColumnGap/gridRowGap
        if ('gridColumnCount' in node) gridCols = (node as any).gridColumnCount.toString();
        if ('gridRowCount' in node) gridRows = (node as any).gridRowCount.toString();
        if ('gridColumnGap' in node) gridGapX = (node as any).gridColumnGap.toString();
        if ('gridRowGap' in node) gridGapY = (node as any).gridRowGap.toString();
      } else {
        flexDirection = (node as any).layoutMode === 'HORIZONTAL' ? 'row' : 'column';

        justifyContent = (node as any).primaryAxisAlignItems === 'MAX' ? 'flex-end' : (node as any).primaryAxisAlignItems === 'CENTER' ? 'center' : (node as any).primaryAxisAlignItems === 'SPACE_BETWEEN' ? 'space-between' : 'flex-start';
        alignItems = (node as any).counterAxisAlignItems === 'MAX' ? 'flex-end' : (node as any).counterAxisAlignItems === 'CENTER' ? 'center' : 'flex-start';
        gap = (node as any).itemSpacing.toString();
      }

      const pTop = node.paddingTop.toString();
      const pRight = node.paddingRight.toString();
      const pBottom = node.paddingBottom.toString();
      const pLeft = node.paddingLeft.toString();

      padding = {
        unit: 'px',
        top: pTop,
        right: pRight,
        bottom: pBottom,
        left: pLeft,
        isLinked: pTop === pRight && pRight === pBottom && pBottom === pLeft
      };


      // Check our own sizing
      if ('layoutSizingHorizontal' in node) {
        if (node.layoutSizingHorizontal === 'FIXED') {
          elementWidth = 'custom';
          customWidth = node.width.toString();
        } else if (node.layoutSizingHorizontal === 'HUG') {
          elementWidth = 'auto';
        }
      }
    }

    // Extract optional section label from parentheses e.g. "(section 2) flex-row w-1120"
    const labelMatch = node.name.match(/^\(([^)]+)\)/);
    const sectionLabel = labelMatch ? labelMatch[1].trim() : '';

    // Strip the label from the name before tokenizing, and remove any stray closing parentheses
    let tokenSource = nodeName;
    if (labelMatch) {
      tokenSource = nodeName.slice(labelMatch[0].length).replace(/^[\)\s]+/, '');
    }

    // Tailwind-like Token Parser
    const tokens = tokenSource.split(/\s+/).filter(Boolean);
    tokens.forEach(token => {
      // Flex direction
      if (token === 'flex-row') flexDirection = 'row';
      if (token === 'flex-col') flexDirection = 'column';

      // Justify content
      if (token === 'justify-start') justifyContent = 'flex-start';
      if (token === 'justify-center') justifyContent = 'center';
      if (token === 'justify-end') justifyContent = 'flex-end';
      if (token === 'justify-between') justifyContent = 'space-between';

      // Align items
      if (token === 'items-start') alignItems = 'flex-start';
      if (token === 'items-center') alignItems = 'center';
      if (token === 'items-end') alignItems = 'flex-end';
      if (token === 'items-stretch') alignItems = 'stretch';

      // Width and sizing
      if (token === 'w-full') {
        contentWidth = 'full';
        boxedWidth = '';
      } else if (token.startsWith('w-')) {
        const match = token.match(/^w-(\d+)$/);
        if (match) {
          contentWidth = 'boxed';
          boxedWidth = match[1];
        }
      } else if (token.startsWith('custom-w-')) {
        const match = token.match(/^custom-w-(\d+)$/);
        if (match) {
          elementWidth = 'custom';
          customWidth = match[1];
        }
      }

      // Gap (flex)
      if (token.startsWith('gap-') && !token.startsWith('gap-x-') && !token.startsWith('gap-y-')) {
        const match = token.match(/^gap-(\d+)$/);
        if (match) {
          gap = match[1];
        }
      }

      // Padding tokens
      const pMatch = token.match(/^p-(\d+)$/);
      const pxMatch = token.match(/^px-(\d+)$/);
      const pyMatch = token.match(/^py-(\d+)$/);
      const ptMatch = token.match(/^pt-(\d+)$/);
      const prMatch = token.match(/^pr-(\d+)$/);
      const pbMatch = token.match(/^pb-(\d+)$/);
      const plMatch = token.match(/^pl-(\d+)$/);

      if (pMatch || pxMatch || pyMatch || ptMatch || prMatch || pbMatch || plMatch) {
        if (!padding) padding = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: false };
      }

      if (pMatch) {
        const val = pMatch[1];
        padding.top = val; padding.right = val; padding.bottom = val; padding.left = val;
        padding.isLinked = true;
      }
      if (pxMatch) {
        const val = pxMatch[1];
        padding.left = val; padding.right = val;
        padding.isLinked = false;
      }
      if (pyMatch) {
        const val = pyMatch[1];
        padding.top = val; padding.bottom = val;
        padding.isLinked = false;
      }
      if (ptMatch) { padding.top = ptMatch[1]; padding.isLinked = false; }
      if (prMatch) { padding.right = prMatch[1]; padding.isLinked = false; }
      if (pbMatch) { padding.bottom = pbMatch[1]; padding.isLinked = false; }
      if (plMatch) { padding.left = plMatch[1]; padding.isLinked = false; }


      // Grid layout tokens
      if (token === 'grid') isGrid = true;

      // col-[N]: number of equal-width grid columns
      const colMatch = token.match(/^col-(\d+)$/);
      if (colMatch) gridCols = colMatch[1];

      // rows-[N]: number of equal-height grid rows
      const rowMatch = token.match(/^rows-(\d+)$/);
      if (rowMatch) gridRows = rowMatch[1];

      // gap-x-[N]: column gap
      const gapXMatch = token.match(/^gap-x-(\d+)$/);
      if (gapXMatch) gridGapX = gapXMatch[1];

      // gap-y-[N]: row gap
      const gapYMatch = token.match(/^gap-y-(\d+)$/);
      if (gapYMatch) gridGapY = gapYMatch[1];

      // place-items-* or grid-items/align
      if (token === 'place-items-center') { gridJustifyItems = 'center'; gridAlignItems = 'center'; }
      if (token === 'place-items-start') { gridJustifyItems = 'start'; gridAlignItems = 'start'; }
      if (token === 'place-items-end') { gridJustifyItems = 'end'; gridAlignItems = 'end'; }
      if (token === 'place-items-stretch') { gridJustifyItems = 'stretch'; gridAlignItems = 'stretch'; }
      if (token === 'justify-items-start') gridJustifyItems = 'start';
      if (token === 'justify-items-center') gridJustifyItems = 'center';
      if (token === 'justify-items-end') gridJustifyItems = 'end';
      if (token === 'justify-items-stretch') gridJustifyItems = 'stretch';
      if (token === 'grid-items-start') gridAlignItems = 'start';
      if (token === 'grid-items-center') gridAlignItems = 'center';
      if (token === 'grid-items-end') gridAlignItems = 'end';
      if (token === 'grid-items-stretch') gridAlignItems = 'stretch';
    });

    // Build the grid gap from gap-x/gap-y, or fall back to gap token
    const resolvedGridGapX = gridGapX || gap;
    const resolvedGridGapY = gridGapY || gap;

    // Build grid columns template string e.g. "repeat(4, 1fr)"
    const gridColumnsValue = gridCols ? `repeat(${gridCols}, 1fr)` : '';
    const gridRowsValue = gridRows ? `repeat(${gridRows}, auto)` : '';

    const container = {
      id,
      elType: 'container',
      settings: {
        content_width: contentWidth,
        ...(sectionLabel ? { _title: sectionLabel } : {}),
        ...(isGrid ? { container_type: 'grid' } : {}),
        ...(boxedWidth ? { boxed_width: { unit: 'px', size: parseInt(boxedWidth), sizes: [] } } : {}),
        ...(elementWidth ? { _element_width: elementWidth } : {}),
        ...(customWidth ? { _element_custom_width: { unit: 'px', size: parseInt(customWidth), sizes: [] } } : {}),
        ...getSharedItemSettings(node),
        // Flex layout (only if not grid)
        ...(!isGrid && flexDirection ? { flex_direction: flexDirection } : {}),
        ...(!isGrid && justifyContent ? { flex_justify_content: justifyContent } : {}),
        ...(!isGrid && alignItems ? { flex_align_items: alignItems } : {}),
        ...(!isGrid && gap ? { flex_gap: { column: gap, row: gap, isLinked: true, unit: 'px', size: parseInt(gap) } } : {}),
        // Grid layout
        ...(isGrid && gridCols ? { grid_columns_grid: { unit: 'fr', size: parseInt(gridCols), sizes: [] } } : {}),
        // Always output grid rows — default to 1 if not explicitly set to prevent Elementor auto-inferring
        ...(isGrid ? { grid_rows_grid: { unit: 'fr', size: parseInt(gridRows || '1'), sizes: [] } } : {}),
        ...(isGrid && (resolvedGridGapX || resolvedGridGapY) ? {
          grid_gap: {
            unit: 'px',
            column: resolvedGridGapX || '0',
            row: resolvedGridGapY || '0',
            isLinked: resolvedGridGapX === resolvedGridGapY,
            size: parseInt(resolvedGridGapX || resolvedGridGapY || '0')
          }
        } : {}),
        ...(isGrid && gridJustifyItems ? { justify_items: gridJustifyItems } : {}),
        ...(isGrid && gridAlignItems ? { align_items: gridAlignItems } : {}),
        ...(padding ? { padding } : {}),
        ...(backgroundColor ? { background_background: 'classic', background_color: backgroundColor } : {}),
        ...(borderRadius ? { border_radius: borderRadius } : {})
      },
      elements: children,
      isInner: false
    };

    return container;
  } else if (node.type === 'TEXT') {
    const settings: any = {
      title: node.characters,
      ...getSharedItemSettings(node)
    };

    // Convert text color to Hex
    if (Array.isArray(node.fills) && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
      settings.title_color = rgbaToHex(node.fills[0].color);
    }

    // Enable custom typography
    settings.typography_typography = 'custom';

    // Convert font size
    if (node.fontSize && typeof node.fontSize === 'number') {
      settings.typography_font_size = {
        size: node.fontSize.toString(),
        unit: 'px'
      };
    }

    // Convert font family and weight
    if (node.fontName && typeof node.fontName !== 'symbol') {
      settings.typography_font_family = node.fontName.family;

      const style = node.fontName.style.toLowerCase();
      if (style.includes('bold')) settings.typography_font_weight = '700';
      else if (style.includes('medium')) settings.typography_font_weight = '500';
      else if (style.includes('semibold')) settings.typography_font_weight = '600';
      else if (style.includes('light')) settings.typography_font_weight = '300';
      else settings.typography_font_weight = '400';
    }

    // Convert line height
    if (node.lineHeight && typeof node.lineHeight !== 'symbol' && node.lineHeight.unit !== 'AUTO') {
      settings.typography_line_height = {
        size: node.lineHeight.unit === 'PERCENT' ? (node.lineHeight.value / 100).toString() : Math.round(node.lineHeight.value).toString(),
        unit: node.lineHeight.unit === 'PERCENT' ? 'em' : 'px'
      };
    }

    // text-[type] naming convention: set HTML tag and widget type
    // text-p / text-paragraph → text-editor widget
    // text-h1 through text-h6 → heading widget with header_size
    const headingMatch = nodeName.match(/\btext-(h[1-6])\b/);
    const isTextParagraph = /\btext-p\b/.test(nodeName) || /\btext-paragraph\b/.test(nodeName);

    if (isTextParagraph) {
      settings.header_size = 'p';
      return {
        id,
        elType: 'widget',
        widgetType: 'heading',
        settings,
        elements: []
      };
    }

    // Heading widget — use header_size from text-h1..h6, default h2
    if (headingMatch) {
      settings.header_size = headingMatch[1];
    } else {
      settings.header_size = 'h2'; // safe default
    }

    return {
      id,
      elType: 'widget',
      widgetType: 'heading',
      settings,
      elements: []
    };

  } else if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'VECTOR') {
    return {
      id,
      elType: 'widget',
      widgetType: 'image',
      settings: {
        image: {
          url: "https://placehold.co/600x400",
          id: "",
          size: ""
        },
        ...getSharedItemSettings(node)
      },
      elements: []
    };
  }

  return null;
}

figma.ui.onmessage = msg => {
  if (msg.type === 'export') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'No selection — please select a Frame on the canvas.' });
      return;
    }

    // Map all selected nodes directly to the root of the Elementor JSON.
    // If the user selects a Section, the section is exported with its padding/background.
    // If they select multiple sections, all are exported as sibling sections.
    const topLevelElements = selection.map(node => buildElementorNode(node as SceneNode)).filter(Boolean);

    // Use the first selected node's name for the file name
    const firstNode = selection[0];
    const rootLabelMatch = firstNode.name.match(/^\(([^)]+)\)/);
    const exportTitle = rootLabelMatch
      ? rootLabelMatch[1].trim()
      : firstNode.name.trim();

    const exportData = {
      version: "0.4",
      title: exportTitle,
      type: "page",
      content: topLevelElements
    };

    // Pass the clean name as filename so the UI can use it for the download
    figma.ui.postMessage({
      type: 'download',
      data: JSON.stringify(exportData, null, 2),
      filename: exportTitle
    });
  }
};
