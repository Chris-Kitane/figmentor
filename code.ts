// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 660, height: 680 });

// This waits for the UI window to send a message (like clicking our button)
figma.ui.onmessage = msg => {
  // ---------------------------------------------------------------
  // PREVIEW: Walk selection, collect stats + tree, send to UI
  // ---------------------------------------------------------------
  if (msg.type === 'preview') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify('Please select a frame or element on the canvas first!');
      return;
    }

    const firstNodeName = selection[0].name;
    const titleMatch = firstNodeName.match(/^\(([^)]+)\)/);
    const exportTitle = titleMatch
      ? titleMatch[1].trim()
      : firstNodeName.replace(/[\(\)]/g, '').split(/\s+/)[0].trim();

    const stats = { sections: 0, containers: 0, headings: 0, images: 0, iconLists: 0, buttons: 0, icons: 0 };
    const invisibleNodes: string[] = [];
    const unsupportedTypes = new Set<string>();
    const tree: any[] = [];

    let nodesToProcess: SceneNode[] = [];

    if (
      selection.length === 1 &&
      (selection[0].type === 'FRAME' || selection[0].type === 'COMPONENT' || selection[0].type === 'INSTANCE')
    ) {
      const singleNode = selection[0] as FrameNode | ComponentNode | InstanceNode;
      const nodeName = singleNode.name.toLowerCase();
      if (
        nodeName.includes('page') ||
        nodeName.includes('desktop') ||
        nodeName.includes('artboard') ||
        nodeName.includes('frame') ||
        singleNode.layoutMode === 'NONE'
      ) {
        nodesToProcess = [...singleNode.children] as SceneNode[];
      } else {
        nodesToProcess = [singleNode];
      }
    } else {
      nodesToProcess = [...selection] as SceneNode[];
    }

    for (const node of nodesToProcess) {
      stats.sections++;
      const labelMatch = node.name.match(/^\(([^)]+)\)/);
      const sectionLabel = labelMatch ? labelMatch[1].trim() : node.name;
      const sectionChildren = getPreviewChildren(node, stats, invisibleNodes, unsupportedTypes);
      tree.push({
        label: sectionLabel,
        childCount: sectionChildren.length,
        children: sectionChildren
      });
    }

    const warnings: string[] = [];
    if (invisibleNodes.length > 0) {
      warnings.push(`${invisibleNodes.length} hidden node${invisibleNodes.length > 1 ? 's' : ''} skipped`);
    }
    if (unsupportedTypes.size > 0) {
      warnings.push(`Unsupported layer types skipped: ${[...unsupportedTypes].join(', ')}`);
    }

    figma.ui.postMessage({ type: 'preview', title: exportTitle, stats, warnings, tree });
    return;
  }

  // ---------------------------------------------------------------
  // EXPORT: Build full JSON and download
  // ---------------------------------------------------------------
  if (msg.type === 'export') {
    const result = buildExportPayload();
    if (!result) return;
    figma.ui.postMessage({
      type: 'download',
      data: JSON.stringify(result.data, null, 2),
      filename: result.title
    });
    return;
  }
  // ---------------------------------------------------------------
  // WEBHOOK: Build full JSON and send to n8n via UI
  // ---------------------------------------------------------------
  if (msg.type === 'webhook') {
    const result = buildExportPayload();
    if (!result) return;
    figma.ui.postMessage({
      type: 'webhook-send',
      content: JSON.stringify(result.data, null, 2)
    });
    return;
  }

  // ---------------------------------------------------------------
  // NOTIFY: Show toast messages from UI
  // ---------------------------------------------------------------
  if (msg.type === 'notify') {
    figma.notify(msg.msg, { error: msg.error });
    return;
  }
  // ---------------------------------------------------------------
  // RENDER: Build full JSON and send to UI for CSS rendering
  // ---------------------------------------------------------------
  if (msg.type === 'render') {
    const result = buildExportPayload();
    if (!result) return;
    figma.ui.postMessage({
      type: 'render-data',
      data: JSON.stringify(result.data),
      title: result.title
    });
    return;
  }
};


// ---------------------------------------------------------------
// Shared: build the full Elementor export payload from selection
// ---------------------------------------------------------------
function buildExportPayload(): { title: string; data: any } | null {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify('Please select a frame or element on the canvas first!');
    return null;
  }

  let topLevelElements: any[] = [];

  const firstNodeName = selection[0].name;
  const titleMatch = firstNodeName.match(/^\(([^)]+)\)/);
  const exportTitle = titleMatch
    ? titleMatch[1].trim()
    : firstNodeName.replace(/[\(\)]/g, '').split(/\s+/)[0].trim();

  if (
    selection.length === 1 &&
    (selection[0].type === 'FRAME' || selection[0].type === 'COMPONENT' || selection[0].type === 'INSTANCE')
  ) {
    const singleNode = selection[0];
    const nodeName = singleNode.name.toLowerCase();

    if (
      nodeName.includes('page') ||
      nodeName.includes('desktop') ||
      nodeName.includes('artboard') ||
      nodeName.includes('frame') ||
      singleNode.layoutMode === 'NONE'
    ) {
      singleNode.children.forEach(child => {
        const parsed = buildElementorNode(child as SceneNode, true);
        if (parsed) topLevelElements.push(parsed);
      });
    } else {
      topLevelElements = [buildElementorNode(singleNode, true)].filter(Boolean);
    }
  } else {
    topLevelElements = selection
      .map(node => buildElementorNode(node as SceneNode, true))
      .filter(Boolean);
  }

  return {
    title: exportTitle,
    data: { version: '0.4', title: exportTitle, type: 'page', content: topLevelElements }
  };
}

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

// NEW: Radix UI-inspired fluid typography scale
function getResponsiveTypography(desktopSize: number) {
  let tabletSize = desktopSize;
  let mobileSize = desktopSize;

  if (desktopSize >= 60) { tabletSize = 48; mobileSize = 40; }
  else if (desktopSize >= 48) { tabletSize = 40; mobileSize = 32; }
  else if (desktopSize >= 36) { tabletSize = 32; mobileSize = 28; }
  else if (desktopSize >= 24) { tabletSize = 22; mobileSize = 20; }
  else if (desktopSize >= 20) { tabletSize = 18; mobileSize = 18; }
  else if (desktopSize >= 18) { tabletSize = 18; mobileSize = 16; }
  else if (desktopSize >= 16) { tabletSize = 16; mobileSize = 16; }

  return { tabletSize, mobileSize };
}

// Extracts layout properties (like absolute positioning) and utility classes from a Figma node
function getSharedItemSettings(node: SceneNode, tokens: string[] = []): any {
  const settings: any = {};

  // Cascading Visibility Logic
  let isHiddenDesktop = tokens.includes('hidden') || tokens.includes('desktop:hidden');
  let isHiddenTablet = isHiddenDesktop;

  if (tokens.includes('tablet:hidden')) isHiddenTablet = true;
  if (tokens.includes('tablet:show')) isHiddenTablet = false;

  let isHiddenMobile = isHiddenTablet;

  if (tokens.includes('mobile:hidden')) isHiddenMobile = true;
  if (tokens.includes('mobile:show')) isHiddenMobile = false;

  if (isHiddenDesktop) { settings.hide_desktop = 'hidden-desktop'; settings._hide_desktop = 'hidden-desktop'; }
  if (isHiddenTablet) { settings.hide_tablet = 'hidden-tablet'; settings._hide_tablet = 'hidden-tablet'; }
  if (isHiddenMobile) { settings.hide_mobile = 'hidden-mobile'; settings._hide_mobile = 'hidden-mobile'; }

  tokens.forEach(token => {

    const widthMatch = token.match(/^(?:(tablet|mobile):)?w-full$/);
    if (widthMatch) {
      const breakpoint = widthMatch[1];
      const isWidget = node.name.toLowerCase().includes('el-') || node.type === 'TEXT';
      if (isWidget) {
        const key = breakpoint ? `_element_width_${breakpoint}` : '_element_width';
        settings[key] = '100%';
      } else {
        const key = breakpoint ? `width_${breakpoint}` : 'width';
        settings[key] = { unit: '%', size: 100, sizes: [] };
      }
    }

    const flexDirMatch = token.match(/^(?:(desktop|tablet|mobile):)?flex-(row|col|column|row-reverse|col-reverse|column-reverse)$/);
    if (flexDirMatch) {
      const breakpoint = flexDirMatch[1];
      let dir = flexDirMatch[2];
      if (dir === 'col') dir = 'column';
      if (dir === 'col-reverse') dir = 'column-reverse';
      const key = breakpoint && breakpoint !== 'desktop' ? `flex_direction_${breakpoint}` : 'flex_direction';
      settings[key] = dir;
    }

    const gapMatch = token.match(/^(?:(desktop|tablet|mobile):)?gap-(\d+)$/);
    if (gapMatch) {
      const breakpoint = gapMatch[1];
      const val = gapMatch[2];
      const key = breakpoint && breakpoint !== 'desktop' ? `flex_gap_${breakpoint}` : 'flex_gap';
      settings[key] = { column: val, row: val, isLinked: true, unit: 'px', size: parseInt(val) };
    }

    const itemsMatch = token.match(/^(?:(desktop|tablet|mobile):)?items-(start|center|end|stretch)$/);
    if (itemsMatch) {
      const breakpoint = itemsMatch[1];
      let val = itemsMatch[2];
      if (val === 'start') val = 'flex-start';
      if (val === 'end') val = 'flex-end';
      const key = breakpoint && breakpoint !== 'desktop' ? `flex_align_items_${breakpoint}` : 'flex_align_items';
      settings[key] = val;
    }
    
    const justifyMatch = token.match(/^(?:(desktop|tablet|mobile):)?justify-(start|center|end|between|around|evenly)$/);
    if (justifyMatch) {
      const breakpoint = justifyMatch[1];
      let val = justifyMatch[2];
      if (val === 'start') val = 'flex-start';
      if (val === 'end') val = 'flex-end';
      if (val === 'between') val = 'space-between';
      if (val === 'around') val = 'space-around';
      if (val === 'evenly') val = 'space-evenly';
      const key = breakpoint && breakpoint !== 'desktop' ? `flex_justify_content_${breakpoint}` : 'flex_justify_content';
      settings[key] = val;
    }

    const padMatch = token.match(/^(?:(tablet|mobile):)?(p|px|py|pt|pr|pb|pl)-(\d+)$/);
    if (padMatch) {
      const breakpoint = padMatch[1];
      const dir = padMatch[2];
      const val = padMatch[3];
      
      // Determine if this is likely a widget or a container.
      const isWidget = node.name.toLowerCase().includes('el-') || node.type === 'TEXT';
      const keyPrefix = isWidget ? '_padding' : 'padding';
      const key = breakpoint ? `${keyPrefix}_${breakpoint}` : keyPrefix;
      
      if (!settings[key]) {
        let defTop = '0', defRight = '0', defBottom = '0', defLeft = '0';
        if ('paddingTop' in node && typeof (node as any).paddingTop === 'number') {
          defTop = (node as any).paddingTop.toString();
          defRight = (node as any).paddingRight.toString();
          defBottom = (node as any).paddingBottom.toString();
          defLeft = (node as any).paddingLeft.toString();
        }
        settings[key] = { unit: 'px', top: defTop, right: defRight, bottom: defBottom, left: defLeft, isLinked: false };
      }
      
      if (dir === 'p') {
        settings[key].top = val; settings[key].right = val;
        settings[key].bottom = val; settings[key].left = val;
        settings[key].isLinked = true;
      } else if (dir === 'px') {
        settings[key].left = val; settings[key].right = val;
      } else if (dir === 'py') {
        settings[key].top = val; settings[key].bottom = val;
      } else if (dir === 'pt') { settings[key].top = val; }
      else if (dir === 'pr') { settings[key].right = val; }
      else if (dir === 'pb') { settings[key].bottom = val; }
      else if (dir === 'pl') { settings[key].left = val; }
    }
  });

  if ('layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE') {
    settings._position = 'absolute';
    settings._offset_x = { size: node.x, unit: 'px' };
    settings._offset_y = { size: node.y, unit: 'px' };
    settings._offset_orientation_h = 'start';
    settings._offset_orientation_v = 'start';
  }

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

// ---------------------------------------------------------------
// Preview-only helpers: lightweight tree walk, no Elementor JSON built
// ---------------------------------------------------------------

// Maximum nesting depth for the preview tree (protects against pathologically deep designs)
const MAX_PREVIEW_DEPTH = 8;

function getPreviewChildren(
  node: SceneNode,
  stats: any,
  invisibleNodes: string[],
  unsupportedTypes: Set<string>,
  depth: number = 0
): any[] {
  if (!('children' in node)) return [];
  return (node.children as SceneNode[])
    .map(child => getPreviewItem(child, stats, invisibleNodes, unsupportedTypes, depth))
    .filter(Boolean);
}

function getPreviewItem(
  node: SceneNode,
  stats: any,
  invisibleNodes: string[],
  unsupportedTypes: Set<string>,
  depth: number = 0
): any | null {
  if (node.visible === false) {
    invisibleNodes.push(node.name);
    return null;
  }

  const nodeName = node.name.toLowerCase();

  // Icon
  if (
    nodeName.startsWith('el-icon') &&
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'VECTOR')
  ) {
    stats.icons++;
    return { type: 'icon', label: node.name };
  }

  // Image / shape
  if (
    nodeName.startsWith('el-image') ||
    nodeName.includes('one image') ||
    node.type === 'RECTANGLE' ||
    node.type === 'ELLIPSE' ||
    node.type === 'VECTOR'
  ) {
    stats.images++;
    return { type: 'image', label: node.name };
  }

  // Text
  if (node.type === 'TEXT') {
    stats.headings++;
    const text = (node as TextNode).characters;
    return { type: 'heading', label: text.length > 40 ? text.slice(0, 40) + '\u2026' : text };
  }

  // Icon list
  if (
    nodeName.includes('icon-list') &&
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE')
  ) {
    stats.iconLists++;
    return { type: 'icon-list', label: node.name };
  }

  // Button
  if (
    nodeName.includes('el-btn') &&
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE')
  ) {
    stats.buttons++;
    return { type: 'button', label: node.name };
  }

  // Container (Frame / Component / Instance) — recurse up to MAX_PREVIEW_DEPTH
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    stats.containers++;
    const labelMatch = node.name.match(/^\(([^)]+)\)/);
    const label = labelMatch ? labelMatch[1].trim() : node.name;

    if (depth < MAX_PREVIEW_DEPTH) {
      const children = getPreviewChildren(node, stats, invisibleNodes, unsupportedTypes, depth + 1);
      return { type: 'container', label, childCount: children.length, children };
    }

    // At max depth: report count but don't recurse further
    const childCount = 'children' in node
      ? (node as FrameNode).children.filter(c => c.visible !== false).length
      : 0;
    return { type: 'container', label, childCount, children: [] };
  }

  // Unsupported type — log and skip
  unsupportedTypes.add(node.type);
  return null;
}

// The main brain: Turns a Figma layer into an Elementor JSON object.
function buildElementorNode(node: SceneNode, isTopLevel: boolean = false): any {
  if (node.visible === false) return null;

  const id = generateId();
  const nodeName = node.name.toLowerCase();

  const labelMatch = node.name.match(/^\(([^)]+)\)/);
  const sectionLabel = labelMatch ? labelMatch[1].trim() : '';

  let tokenSource = nodeName;
  if (labelMatch) {
    tokenSource = nodeName.slice(labelMatch[0].length).replace(/^[\)\s]+/, '');
  }

  // Expand grouped utility classes, e.g., tablet:(flex-column px-0) -> tablet:flex-column tablet:px-0
  tokenSource = tokenSource.replace(/(desktop|tablet|mobile):\s*\(\s*([^)]+?)\s*\)/g, (match, prefix, inner) => {
    return inner.split(/\s+/).filter(Boolean).map((t: string) => `${prefix}:${t}`).join(' ');
  });

  const tokens = tokenSource.split(/\s+/).filter(Boolean);

  // -------------------------------------------------------------
  // TYPE 0: ICON WIDGETS
  // -------------------------------------------------------------
  if (
    nodeName.startsWith('el-icon') &&
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'VECTOR')
  ) {
    const iconSettings: any = {
      selected_icon: { value: 'fas fa-star', library: 'fa-solid' },
      view: 'default'
    };

    let iconColor = '';
    let iconSize = 24;

    if ('children' in node) {
      node.children.forEach(child => {
        if (child.type === 'TEXT') {
          if (Array.isArray(child.fills) && child.fills.length > 0 && child.fills[0].type === 'SOLID') {
            iconColor = rgbaToHex(child.fills[0].color);
          }
          if (child.fontSize && typeof child.fontSize === 'number') {
            iconSize = child.fontSize;
          }
        } else if (child.type === 'VECTOR' || child.type === 'INSTANCE') {
          if ('fills' in child && Array.isArray(child.fills) && child.fills.length > 0 && child.fills[0].type === 'SOLID') {
            iconColor = rgbaToHex(child.fills[0].color);
          }
          iconSize = Math.max(child.width, child.height);
        }
      });
    } else if (node.type === 'VECTOR') {
      if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
        iconColor = rgbaToHex(node.fills[0].color);
      }
      iconSize = Math.max(node.width, node.height);
    }

    if (iconColor) iconSettings.primary_color = iconColor;
    if (iconSize > 0) iconSettings.size = { unit: 'px', size: Math.round(iconSize), sizes: [] };
    
    Object.assign(iconSettings, getSharedItemSettings(node, tokens));

    return { id, elType: 'widget', widgetType: 'icon', settings: iconSettings, elements: [] };
  }

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

    Object.assign(imageSettings, getSharedItemSettings(node, tokens));

    tokens.forEach(token => {
      const rMatch = token.match(/^rounded-(\d+)$/);
      if (rMatch) {
        const r = rMatch[1];
        imageSettings.image_border_radius = {
          unit: 'px', top: r, right: r, bottom: r, left: r, isLinked: true
        };
      }
    });

    return { id, elType: 'widget', widgetType: 'image', settings: imageSettings, elements: [] };
  }

  // -------------------------------------------------------------
  // TYPE B: TEXT LAYERS
  // -------------------------------------------------------------
  if (node.type === 'TEXT') {
    const textSettings: any = {
      title: node.characters,
      typography_typography: 'custom'
    };

    Object.assign(textSettings, getSharedItemSettings(node, tokens));

    if (Array.isArray(node.fills) && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
      textSettings.title_color = rgbaToHex(node.fills[0].color);
    }

    let desktopSize = 16;
    let tabletSize = 16;
    let mobileSize = 16;

    // Apply Responsive Radix Typography Scaling
    if (node.fontSize && typeof node.fontSize === 'number') {
      desktopSize = node.fontSize;
      const respSizes = getResponsiveTypography(desktopSize);
      tabletSize = respSizes.tabletSize;
      mobileSize = respSizes.mobileSize;

      textSettings.typography_font_size = { size: desktopSize, unit: 'px', sizes: [] };
      if (tabletSize !== desktopSize) textSettings.typography_font_size_tablet = { size: tabletSize, unit: 'px', sizes: [] };
      if (mobileSize !== desktopSize) textSettings.typography_font_size_mobile = { size: mobileSize, unit: 'px', sizes: [] };
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

    // Apply Responsive Line Height
    if (node.lineHeight && node.lineHeight !== figma.mixed) {
      const lh = node.lineHeight as any;
      if (lh.unit !== 'AUTO') {
        if (lh.unit === 'PIXELS') {
          const desktopLH = Math.round(lh.value);
          textSettings.typography_line_height = { unit: 'px', size: desktopLH, sizes: [] };

          if (desktopSize > 0) {
            const tabletLH = Math.round(desktopLH * (tabletSize / desktopSize));
            const mobileLH = Math.round(desktopLH * (mobileSize / desktopSize));

            if (tabletLH !== desktopLH) textSettings.typography_line_height_tablet = { unit: 'px', size: tabletLH, sizes: [] };
            if (mobileLH !== desktopLH) textSettings.typography_line_height_mobile = { unit: 'px', size: mobileLH, sizes: [] };
          }
        } else if (lh.unit === 'PERCENT') {
          // Relative EM sizes natively shift with font sizes without explicit tablet/mobile keys needed!
          textSettings.typography_line_height = { unit: 'em', size: Number((lh.value / 100).toFixed(2)), sizes: [] };
        }
      }
    }

    textSettings.header_size = 'h2';

    const headingMatch = nodeName.match(/\btext-(h[1-6])\b/);
    const isTextParagraph = /\btext-p\b/.test(nodeName) || /\btext-paragraph\b/.test(nodeName);

    if (isTextParagraph) {
      textSettings.header_size = 'p';
    } else if (headingMatch) {
      textSettings.header_size = headingMatch[1];
    }

    return { id, elType: 'widget', widgetType: 'heading', settings: textSettings, elements: [] };
  }

  // -------------------------------------------------------------
  // TYPE B.5: ICON LIST WIDGETS
  // -------------------------------------------------------------
  if (nodeName.includes('icon-list') && (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE')) {

    const determinedWidth = nodeName.includes('w-fit') ? 'initial' : 'inherit';

    const listSettings: any = {
      _element_width: determinedWidth,
      icon_list: [],
      typography_typography: 'custom',
      icon_self_align: 'flex-start',
      icon_vertical_align: 'top',
      vertical_align: 'top'
    };

    let iconSize = 16;
    let textColor = '';

    const listItem: any = {
      text: '',
      selected_icon: { value: 'fas fa-check', library: 'fa-solid' }
    };

    if ('children' in node) {
      node.children.forEach(child => {
        const childName = child.name.toLowerCase();

        if (child.type === 'TEXT') {
          listItem.text = child.characters;

          if (Array.isArray(child.fills) && child.fills.length > 0 && child.fills[0].type === 'SOLID') {
            textColor = rgbaToHex(child.fills[0].color);
          }

          let desktopSize = 16;
          let tabletSize = 16;
          let mobileSize = 16;

          // Apply Responsive Radix Typography Scaling
          if (child.fontSize && typeof child.fontSize === 'number') {
            desktopSize = child.fontSize;
            const respSizes = getResponsiveTypography(desktopSize);
            tabletSize = respSizes.tabletSize;
            mobileSize = respSizes.mobileSize;

            listSettings.typography_font_size = { size: desktopSize, unit: 'px', sizes: [] };
            if (tabletSize !== desktopSize) listSettings.typography_font_size_tablet = { size: tabletSize, unit: 'px', sizes: [] };
            if (mobileSize !== desktopSize) listSettings.typography_font_size_mobile = { size: mobileSize, unit: 'px', sizes: [] };
          }

          if (child.fontName && typeof child.fontName !== 'symbol') {
            listSettings.typography_font_family = child.fontName.family;
            const style = child.fontName.style.toLowerCase();
            if (style.includes('bold')) listSettings.typography_font_weight = '700';
            else if (style.includes('medium')) listSettings.typography_font_weight = '500';
            else if (style.includes('semibold')) listSettings.typography_font_weight = '600';
            else if (style.includes('light')) listSettings.typography_font_weight = '300';
            else listSettings.typography_font_weight = '400';
          }

          // Apply Responsive Line Height
          if (child.lineHeight && child.lineHeight !== figma.mixed) {
            const clh = child.lineHeight as any;
            if (clh.unit !== 'AUTO') {
              if (clh.unit === 'PIXELS') {
                const desktopLH = Math.round(clh.value);
                listSettings.typography_line_height = { unit: 'px', size: desktopLH, sizes: [] };

                if (desktopSize > 0) {
                  const tabletLH = Math.round(desktopLH * (tabletSize / desktopSize));
                  const mobileLH = Math.round(desktopLH * (mobileSize / desktopSize));

                  if (tabletLH !== desktopLH) listSettings.typography_line_height_tablet = { unit: 'px', size: tabletLH, sizes: [] };
                  if (mobileLH !== desktopLH) listSettings.typography_line_height_mobile = { unit: 'px', size: mobileLH, sizes: [] };
                }
              } else if (clh.unit === 'PERCENT') {
                listSettings.typography_line_height = { unit: 'em', size: Number((clh.value / 100).toFixed(2)), sizes: [] };
              }
            }
          }
        }
        else if (childName.includes('icon') || child.type === 'VECTOR' || child.type === 'INSTANCE') {
          iconSize = Math.max(child.width, child.height);

          if ('fills' in child && Array.isArray(child.fills) && child.fills.length > 0 && child.fills[0].type === 'SOLID') {
            listSettings.icon_color = rgbaToHex(child.fills[0].color);
          }
        }
      });
    }

    listSettings.icon_list.push(listItem);
    listSettings.icon_size = { size: Math.round(iconSize), unit: 'px', sizes: [] };
    if (textColor) listSettings.text_color = textColor;

    Object.assign(listSettings, getSharedItemSettings(node, tokens));

    return { id, elType: 'widget', widgetType: 'icon-list', settings: listSettings, elements: [] };
  }

  // -------------------------------------------------------------
  // TYPE B.75: BUTTON WIDGETS
  // -------------------------------------------------------------
  if (nodeName.includes('el-btn') && (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE')) {
    const buttonSettings: any = {
      text: 'Click here',
      size: 'md',
      typography_typography: 'custom'
    };

    if ('fills' in node && Array.isArray(node.fills)) {
      const solidFill = node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
      if (solidFill && (solidFill.opacity === undefined || solidFill.opacity > 0) && node.opacity > 0) {
        buttonSettings.background_color = rgbaToHex(solidFill.color);
      } else {
        buttonSettings.background_color = 'transparent';
      }
    } else {
      buttonSettings.background_color = 'transparent';
    }

    const radius = ('cornerRadius' in node && typeof node.cornerRadius === 'number') ? node.cornerRadius.toString() : '0';
    buttonSettings.border_radius = {
      unit: 'px',
      top: radius, right: radius, bottom: radius, left: radius,
      isLinked: true
    };

    if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
      const solidStroke = node.strokes.find((s: any) => s.type === 'SOLID' && s.visible !== false);
      if (solidStroke) {
        buttonSettings.border_border = 'solid';
        buttonSettings.border_color = rgbaToHex(solidStroke.color);
        if ('strokeWeight' in node && typeof node.strokeWeight === 'number') {
          const w = node.strokeWeight.toString();
          buttonSettings.border_width = {
            unit: 'px',
            top: w, right: w, bottom: w, left: w,
            isLinked: true
          };
        }
      }
    }

    if (node.layoutMode !== 'NONE') {
      const pTop = node.paddingTop.toString();
      const pRight = node.paddingRight.toString();
      const pBottom = node.paddingBottom.toString();
      const pLeft = node.paddingLeft.toString();

      buttonSettings.text_padding = {
        unit: 'px',
        top: pTop, right: pRight, bottom: pBottom, left: pLeft,
        isLinked: pTop === pRight && pRight === pBottom && pBottom === pLeft
      };
    }
    buttonSettings.align_self = 'stretch';
    buttonSettings.align = 'justify';
    buttonSettings.content_align = 'center';

    if (node.width > 0) {
      buttonSettings._element_width = 'initial';
      buttonSettings._element_custom_width = { unit: 'px', size: Math.round(node.width), sizes: [] };
    }

    if ('children' in node) {
      node.children.forEach(child => {
        if (child.type === 'TEXT') {
          buttonSettings.text = child.characters;

          if (Array.isArray(child.fills) && child.fills.length > 0 && child.fills[0].type === 'SOLID') {
            buttonSettings.button_text_color = rgbaToHex(child.fills[0].color);
          }

          if (child.fontSize && typeof child.fontSize === 'number') {
            buttonSettings.typography_font_size = { size: child.fontSize, unit: 'px', sizes: [] };
          }

          if (child.fontName && typeof child.fontName !== 'symbol') {
            buttonSettings.typography_font_family = child.fontName.family;
            const style = child.fontName.style.toLowerCase();
            if (style.includes('bold')) buttonSettings.typography_font_weight = '700';
            else if (style.includes('medium')) buttonSettings.typography_font_weight = '500';
            else if (style.includes('semibold')) buttonSettings.typography_font_weight = '600';
            else if (style.includes('light')) buttonSettings.typography_font_weight = '300';
            else buttonSettings.typography_font_weight = '400';
          }
        }
      });
    }

    Object.assign(buttonSettings, getSharedItemSettings(node, tokens));

    return { id, elType: 'widget', widgetType: 'button', settings: buttonSettings, elements: [] };
  }

  // -------------------------------------------------------------
  // TYPE C: CONTAINERS (Frames, Components, and Instances)
  // -------------------------------------------------------------
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    // FLAG: FALSE (Children inside a container are Inner Items, not Sections!)
    const children = node.children.map(child => buildElementorNode(child as SceneNode, false)).filter(Boolean);

    let flexDirection = '';
    let justifyContent = '';
    let alignItems = '';
    let gap = '';

    // Setting up responsive padding slots
    let padding: any = null;
    let paddingTablet: any = null;
    let paddingMobile: any = null;

    let backgroundColor = '';
    let borderRadius: any = null;
    let contentWidth = 'full';
    let boxedWidth = '';
    let innerCustomWidth = '';

    let isGrid = false;
    let gridCols = '';
    let gridRows = '';
    let gridGapX = '';
    let gridGapY = '';

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

    tokens.forEach(token => {
      if (token === 'w-full') {
        contentWidth = 'full';
        boxedWidth = '';
      } else if (token.startsWith('w-')) {
        const match = token.match(/^w-(\d+)$/);
        if (match) {
          if (isTopLevel) {
            contentWidth = 'boxed';
            boxedWidth = match[1];
          } else {
            contentWidth = 'full';
            innerCustomWidth = match[1];
          }
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

    // -----------------------------------------------------------------
    // PADDING EXTRACTION & RESPONSIVE RULES
    // -----------------------------------------------------------------
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

      // Apply 48px/16px rules ONLY to major sections!
      if (isTopLevel) {
        paddingTablet = {
          unit: 'px',
          top: pTop, right: '48', bottom: pBottom, left: '48',
          isLinked: false
        };

        paddingMobile = {
          unit: 'px',
          top: pTop, right: '16', bottom: pBottom, left: '16',
          isLinked: false
        };
      }
    }

    const containerSettings: any = {
      content_width: contentWidth
    };

    if (innerCustomWidth) {
      containerSettings.width = {
        unit: 'px',
        size: parseInt(innerCustomWidth),
        sizes: []
      };
    } else if (node.width > 0 && !isTopLevel) {
      const isFixedWidth =
        node.layoutMode === 'NONE' ||
        ('layoutSizingHorizontal' in node && (node as FrameNode).layoutSizingHorizontal === 'FIXED');

      if (isFixedWidth) {
        containerSettings.width = {
          unit: 'px',
          size: Math.round(node.width),
          sizes: []
        };
      }
    }

    if (sectionLabel) containerSettings._title = sectionLabel;
    if (boxedWidth) containerSettings.boxed_width = { unit: 'px', size: parseInt(boxedWidth), sizes: [] };

    if (isGrid) {
      containerSettings.container_type = 'grid';
      if (gridCols) containerSettings.grid_columns_grid = { unit: 'fr', size: parseInt(gridCols), sizes: [] };
      containerSettings.grid_rows_grid = { unit: 'fr', size: parseInt(gridRows || '1'), sizes: [] };

      const resolvedGridGapX = gridGapX || gap || '0';
      const resolvedGridGapY = gridGapY || gap || '0';

      containerSettings.grid_gaps = {
        unit: 'px', column: resolvedGridGapX, row: resolvedGridGapY,
        isLinked: resolvedGridGapX === resolvedGridGapY
      };
    } else {
      if (flexDirection) containerSettings.flex_direction = flexDirection;
      if (justifyContent) containerSettings.flex_justify_content = justifyContent;
      if (alignItems) containerSettings.flex_align_items = alignItems;
      if (gap) {
        containerSettings.flex_gap = { column: gap, row: gap, isLinked: true, unit: 'px', size: parseInt(gap) };
      }
    }

    // Attach all Standard and Responsive Paddings
    if (padding) containerSettings.padding = padding;
    if (paddingTablet) containerSettings.padding_tablet = paddingTablet;
    if (paddingMobile) containerSettings.padding_mobile = paddingMobile;

    Object.assign(containerSettings, getSharedItemSettings(node, tokens));

    if (backgroundColor) {
      containerSettings.background_background = 'classic';
      containerSettings.background_color = backgroundColor;
    }
    if (borderRadius) containerSettings.border_radius = borderRadius;

    // -----------------------------------------------------------------
    // HEIGHT → min_height
    // Map a Figma fixed height to Elementor's min_height so sections
    // keep their designed height (e.g. hero at 600px).
    // Fires when:
    //   • Auto-layout frame with layoutSizingVertical === 'FIXED'
    //   • Non-auto-layout frame (layoutMode === 'NONE') — always explicit
    // Skipped for HUG and FILL modes (content-driven height).
    // -----------------------------------------------------------------
    if (node.height > 0) {
      const isFixedHeight =
        node.layoutMode === 'NONE' ||
        ('layoutSizingVertical' in node &&
          (node as FrameNode).layoutSizingVertical === 'FIXED');

      if (isFixedHeight) {
        containerSettings.min_height = {
          unit: 'px',
          size: Math.round(node.height),
          sizes: []
        };
      }
    }

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