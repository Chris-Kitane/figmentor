export function safeColor(val: any): string {
  if (!val) return '';
  return /^#[0-9a-fA-F]{3,8}$/.test(String(val)) ? String(val) : '';
}

export function safeCSSString(str: any): string {
  return String(str).replace(/['";\\]/g, '');
}

export function isSafeImageUrl(url: any): boolean {
  try {
    return new URL(String(url)).protocol === 'https:';
  } catch {
    return false;
  }
}
