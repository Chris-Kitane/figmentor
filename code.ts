// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 300, height: 200 });

// This waits for the UI window to send a message (like clicking our button)
figma.ui.onmessage = msg => {
  if (msg.type === 'export') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify('Please select a frame or element on the canvas first!');
      return;
    }

    let topLevelElements: any[] = [];

    // Clean up the template title completely by removing the "(Label)" block
    const firstNodeName = selection[0].name;
    const titleMatch = firstNodeName.match(/^\(([^)]+)\)/);
    const exportTitle = titleMatch ? titleMatch[1].trim() : firstNodeName.replace(/[\(\)]/g, '').split(/\s+/)[0].trim();

    if (selection.length === 1 && (selection[0].type === 'FRAME' || selection[0].type === 'COMPONENT' || selection[0].type === 'INSTANCE')) {
      const singleNode = selection[0];
      const nodeName = singleNode.name.toLowerCase();

      if (nodeName.includes('page') || nodeName.includes('desktop') || nodeName.includes('artboard') || singleNode.layoutMode === 'NONE') {
        topLevelElements = singleNode.children.map(buildElementorNode).filter(Boolean);
      } else {
        topLevelElements = [buildElementorNode(singleNode)].filter(Boolean);
      }
    } else {
      topLevelElements = selection.map(node => buildElementorNode(node as SceneNode)).filter(Boolean);
    }

    const exportData = {
      version: "0.4",
      title: exportTitle, // Completely clean title
      type: "page",
      content: topLevelElements
    };

    figma.ui.postMessage({
      type: 'download',
      data: JSON.stringify(exportData, null, 2),
      filename: exportTitle // Completely clean filename
    });
  }
};



// Generates a random, unique 7-character ID string for Elementor elements
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Converts Figma's decimal RGB colors into standard web Hex strings (#ffffff)
function rgbaToHex(color: RGB | RGBA): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// Extracts layout properties (like absolute positioning) from a Figma node
function getSharedItemSettings(node: SceneNode): any {
  const settings: any = {};

  // Check if the item is explicitly set to Absolute Position in Figma
  if ('layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE') {
    settings._position = 'absolute';
    settings._offset_x = { size: node.x, unit: 'px' };
    settings._offset_y = { size: node.y, unit: 'px' };
    settings._offset_orientation_h = 'start';
    settings._offset_orientation_v = 'start';
  }

  // Check if the item is span-configured inside a Grid layout
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

// The main brain: Turns a Figma layer into an Elementor JSON object
function buildElementorNode(node: SceneNode): any {
  if (node.visible === false) return null;

  const id = generateId();
  const nodeName = node.name.toLowerCase();

  // 1. Clean extraction of optional section label from parentheses
  const labelMatch = node.name.match(/^\(([^)]+)\)/);
  const sectionLabel = labelMatch ? labelMatch[1].trim() : '';

  // 2. Strip the label from the string so we only parse the layout classes left over
  let tokenSource = nodeName;
  if (labelMatch) {
    tokenSource = nodeName.slice(labelMatch[0].length).replace(/^[\)\s]+/, '');
  }

  const tokens = tokenSource.split(/\s+/).filter(Boolean);

  // -------------------------------------------------------------
  // TYPE A: IMAGES & SHAPES
  // -------------------------------------------------------------
  if (
    nodeName.startsWith('el-image') ||
    nodeName.includes('one image') ||
    node.type === 'RECTANGLE' ||
    node.type === 'ELLIPSE' ||
    node.type === 'VECTOR'
  ) {
    const imageSettings: any = {
      image: { url: "https://placehold.co/600x400", id: "", size: "" },
      content_width: "full",
      width: { unit: "%", size: 100, sizes: [] },
      _element_width: "inherit",
      image_size: "full"
    };

    Object.assign(imageSettings, getSharedItemSettings(node));

    tokens.forEach(token => {
      const rMatch = token.match(/^rounded-(\d+)$/);
      if (rMatch) {
        const r = rMatch[1];
        imageSettings.image_border_radius = {
          unit: 'px', top: r, right: r, bottom: r, left: r, isLinked: true
        };
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

  // -------------------------------------------------------------
  // TYPE B: TEXT LAYERS
  // -------------------------------------------------------------
  if (node.type === 'TEXT') {
    const textSettings: any = {
      title: node.characters,
      typography_typography: 'custom'
    };



    Object.assign(textSettings, getSharedItemSettings(node));

    if (Array.isArray(node.fills) && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
      textSettings.title_color = rgbaToHex(node.fills[0].color);
    }

    if (node.fontSize && typeof node.fontSize === 'number') {
      textSettings.typography_font_size = { size: node.fontSize.toString(), unit: 'px' };
    }

    if (node.fontName && typeof node.fontName !== 'symbol') {
      textSettings.typography_font_family = node.fontName.family;
      const style = node.fontName.style.toLowerCase();
      if (style.includes('bold')) textSettings.typography_font_weight = '700';
      else if (style.includes('medium')) textSettings.typography_font_weight = '500';
      else if (style.includes('semibold')) textSettings.typography_font_weight = '600';
      else if (style.includes('light')) textSettings.typography_font_weight = '300';
      else textSettings.typography_font_weight = '400';
    }

    textSettings.header_size = 'h2';
    const headingMatch = nodeName.match(/\btext-(h[1-6])\b/);
    const isTextParagraph = /\btext-p\b/.test(nodeName) || /\btext-paragraph\b/.test(nodeName);

    if (isTextParagraph) {
      textSettings.header_size = 'p';
    } else if (headingMatch) {
      textSettings.header_size = headingMatch[1];
    }

    return {
      id,
      elType: 'widget',
      widgetType: 'heading',
      settings: textSettings,
      elements: []
    };
  }

  // -------------------------------------------------------------
  // TYPE C: CONTAINERS (Frames, Components, and Instances)
  // -------------------------------------------------------------
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const children = node.children.map(buildElementorNode).filter(Boolean);

    let flexDirection = '';
    let justifyContent = '';
    let alignItems = '';
    let gap = '';
    let padding: any = null;
    let backgroundColor = '';
    let borderRadius: any = null;

    // Default Container Sizing layout
    let contentWidth = 'full';
    let boxedWidth = '';

    // Initialize layout flags and variables upfront!
    let isGrid = false;
    let gridCols = '';
    let gridRows = '';
    let gridGapX = '';
    let gridGapY = '';

    // 1. RUN THE NATIVE INSPECTOR FIRST (Sets up our baselines)
    if ('layoutMode' in node && (node as any).layoutMode === 'GRID') {
      isGrid = true;
      if ('gridColumnCount' in node) gridCols = (node as any).gridColumnCount.toString();
      if ('gridRowCount' in node) gridRows = (node as any).gridRowCount.toString();
      if ('gridColumnGap' in node) gridGapX = (node as any).gridColumnGap.toString();
      if ('gridRowGap' in node) gridGapY = (node as any).gridRowGap.toString();
    } else if (node.layoutMode !== 'NONE') {
      flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
      justifyContent = node.primaryAxisAlignItems === 'MAX' ? 'flex-end' :
        node.primaryAxisAlignItems === 'CENTER' ? 'center' :
          node.primaryAxisAlignItems === 'SPACE_BETWEEN' ? 'space-between' : 'flex-start';
      alignItems = node.counterAxisAlignItems === 'MAX' ? 'flex-end' :
        node.counterAxisAlignItems === 'CENTER' ? 'center' : 'flex-start';
      gap = node.itemSpacing.toString();
    }

    // 2. RUN THE OVERRIDE TOKEN PARSER SECOND (Tokens Over Design Properties!)
    tokens.forEach(token => {
      if (token === 'w-full') {
        contentWidth = 'full';
        boxedWidth = '';
      } else if (token.startsWith('w-')) {
        const match = token.match(/^w-(\d+)$/);
        if (match) {
          contentWidth = 'boxed';
          boxedWidth = match[1];
        }
      }

      if (token === 'grid') isGrid = true;

      const colMatch = token.match(/^col-(\d+)$/);
      if (colMatch) gridCols = colMatch[1];

      const rowMatch = token.match(/^rows-(\d+)$/);
      if (rowMatch) gridRows = rowMatch[1];

      const gapXMatch = token.match(/^gap-x-(\d+)$/);
      if (gapXMatch) gridGapX = gapXMatch[1];

      const gapYMatch = token.match(/^gap-y-(\d+)$/);
      if (gapYMatch) gridGapY = gapYMatch[1];
    });

    // 3. EXTRACT VISUAL STYLES (Fills, Padding, Corners)
    if ('fills' in node && Array.isArray(node.fills)) {
      const solidFill = node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
      if (solidFill) {
        backgroundColor = rgbaToHex(solidFill.color);
      }
    }

    if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      borderRadius = {
        unit: 'px',
        top: node.cornerRadius.toString(), right: node.cornerRadius.toString(),
        bottom: node.cornerRadius.toString(), left: node.cornerRadius.toString(),
        isLinked: true
      };
    }

    if (node.layoutMode !== 'NONE' || isGrid) {
      const pTop = node.paddingTop.toString();
      const pRight = node.paddingRight.toString();
      const pBottom = node.paddingBottom.toString();
      const pLeft = node.paddingLeft.toString();

      padding = {
        unit: 'px',
        top: pTop, right: pRight, bottom: pBottom, left: pLeft,
        isLinked: pTop === pRight && pRight === pBottom && pBottom === pLeft
      };
    }

    // 4. MAP GATHERED VARIABLES TO ELEMENTOR STRUCTURE
    const containerSettings: any = {
      content_width: contentWidth
    };

    if (sectionLabel) containerSettings._title = sectionLabel;

    if (boxedWidth) {
      containerSettings.boxed_width = {
        unit: 'px',
        size: parseInt(boxedWidth),
        sizes: []
      };
    }

    Object.assign(containerSettings, getSharedItemSettings(node));

    // Append layout configurations to container settings object
    if (isGrid) {
      containerSettings.container_type = 'grid'; // Note: the sample JSON doesn't use "layout: grid"

      if (gridCols) {
        containerSettings.grid_columns_grid = { unit: 'fr', size: parseInt(gridCols), sizes: [] };
      }
      containerSettings.grid_rows_grid = { unit: 'fr', size: parseInt(gridRows || '1'), sizes: [] };

      const resolvedGridGapX = gridGapX || gap || '0';
      const resolvedGridGapY = gridGapY || gap || '0';

      // The exact formatting pulled from your sample-layout.json
      containerSettings.grid_gaps = {
        unit: 'px',
        column: resolvedGridGapX,
        row: resolvedGridGapY,
        isLinked: resolvedGridGapX === resolvedGridGapY
      };

    } else {
      if (flexDirection) containerSettings.flex_direction = flexDirection;
      if (justifyContent) containerSettings.flex_justify_content = justifyContent;
      if (alignItems) containerSettings.flex_align_items = alignItems;

      // Flex gaps (using elements_gap as it's the standard for Flex containers in newer Elementor)
      if (gap) {
        containerSettings.elements_gap = { column: gap, row: gap, isLinked: true, unit: 'px', size: parseInt(gap) };
      }
    }

    if (padding) containerSettings.padding = padding;
    if (backgroundColor) {
      containerSettings.background_background = 'classic';
      containerSettings.background_color = backgroundColor;
    }
    if (borderRadius) containerSettings.border_radius = borderRadius;

    return {
      id,
      elType: 'container',
      settings: containerSettings,
      elements: children,
      isInner: false
    };
  }

  return null;
}