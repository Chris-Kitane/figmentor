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
