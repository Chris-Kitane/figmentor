# Figma to Elementor Plugin: Parsing Rules

To ensure predictable and flexible exports from Figma to Elementor, the plugin follows a strict hierarchy for extracting layer properties. 

These rules guarantee that the design is exported accurately by default, while allowing developers to forcefully override properties using Tailwind-style tokens.

## 1. The Override Hierarchy
The core philosophy of the parser is **Tokens > Design Properties**.

1. **Tokens First (Overrides):** If a layer's name contains recognized Tailwind-style classes (e.g., `flex-row`, `p-32`, `gap-16`), these tokens will **always override** the corresponding visual properties set in the Figma design panel.
2. **Design Properties (Fallback):** If a layer does not contain specific Tailwind classes for a property (e.g., you set `flex-row` but didn't set a `p-[n]` token), the plugin will **automatically extract** the native Figma design properties (Auto Layout padding, background colors, gaps, border radius, etc.) and map them directly to Elementor.

## 2. Token Exceptions
Not all naming conventions in layer names are considered "Tailwind classes" that override layout properties. The following conventions are special directives and do not interfere with layout parsing:

* **Section Labels:** `([layer name])`
  * Example: `(Hero Section)`
  * Purpose: This explicitly names the container in the Elementor Navigator structure (`_title`). It is extracted and stripped before parsing layout tokens.
  
* **Text Directives:** `text-[type]`
  * Example: `text-h1`, `text-h2`, `text-p`, `text-paragraph`
  * Purpose: This strictly defines the HTML tag that the Heading Widget will use in Elementor. It does not override typography styles (font size, weight, line height), which are still extracted natively from the Figma text properties.

## 3. Top-Level Export Rule
* **WYSIWYG Exporting:** Whatever node(s) you select in Figma are exactly what gets exported as the top-level sections in Elementor.
* **No Forced Wrappers:** Selecting multiple sibling sections and exporting them will result in multiple sibling sections in Elementor. Selecting a giant "Page" frame will export that page frame as a master parent container.

## 4. Responsive Token Grouping
To keep layer names clean and avoid repetitive prefixes, the parser supports parenthetical grouping for responsive breakpoints:
* **Syntax:** `[breakpoint]:(token1 token2 ...)`
* **Example:** `tablet:(flex-col px-0 w-full)`
* **Result:** This expands under the hood to `tablet:flex-col tablet:px-0 tablet:w-full`.

## 5. Cascading Visibility Logic
Visibility tokens follow a **Top-Down Cascading Inheritance** model, matching Elementor's native responsive engine.

* **Desktop rules all:** `hidden` (or `desktop:hidden`) hides the element on Desktop, and because it cascades down, it naturally stays hidden on Tablet and Mobile.
* **Tablet cascades to Mobile:** `tablet:hidden` leaves Desktop visible, but completely hides the element on Tablet and Mobile.
* **Mobile acts alone:** `mobile:hidden` only hides the element on Mobile.
* **Overrides (`show`):** You can break the inheritance chain with a `show` class. For example, `hidden mobile:show` hides it on Desktop and Tablet, but forces it to appear on Mobile screens.

## 6. Container Sizing (`w-full`)
* **Top-Level Sections:** When a node has the `w-full` class and is the absolute top-level selection, it is translated into a **Full Width** section in Elementor.
* **Inner Containers/Widgets:** When nested containers or text/widgets have `w-full` (or responsive versions like `mobile:w-full`), the parser correctly maps this to `_element_width = '100%'` (Custom Width slider) rather than "Boxed" vs "Full Width", ensuring precise responsive overrides in Elementor.

## 7. Widget Declarations
To force a Figma layer to render as a specific Elementor widget, prepend the layer name with a widget directive. The parser will extract child layers appropriately:
* **`el-image`**: Forces the layer to be an Image Widget. (Alternatively, just use a plain Rect/Ellipse).
* **`el-btn`**: Forces the layer to be a Button Widget. (Extracts background fill, border, and nested text layer).
* **`el-icon`**: Forces the layer to be an Icon Widget. (Extracts size and primary color from a nested vector or icon-font text layer).
* **`icon-list`**: Maps a Frame into an Icon List Widget, dynamically converting its children into list items.
