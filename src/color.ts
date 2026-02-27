/** ANSI color helpers — zero deps */

const ESC = '\x1b[';

export const colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,

  // Foreground
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,

  // Bright
  brightRed: `${ESC}91m`,
  brightGreen: `${ESC}92m`,
  brightYellow: `${ESC}93m`,
  brightBlue: `${ESC}94m`,
  brightMagenta: `${ESC}95m`,
  brightCyan: `${ESC}96m`,
};

let enabled = true;

export function setColorEnabled(value: boolean): void {
  enabled = value;
}

function wrap(color: string, text: string): string {
  if (!enabled) return text;
  return `${color}${text}${colors.reset}`;
}

export function bold(text: string): string {
  return wrap(colors.bold, text);
}

export function dim(text: string): string {
  return wrap(colors.dim, text);
}

export function red(text: string): string {
  return wrap(colors.red, text);
}

export function green(text: string): string {
  return wrap(colors.green, text);
}

export function yellow(text: string): string {
  return wrap(colors.yellow, text);
}

export function blue(text: string): string {
  return wrap(colors.blue, text);
}

export function magenta(text: string): string {
  return wrap(colors.magenta, text);
}

export function cyan(text: string): string {
  return wrap(colors.cyan, text);
}

export function gray(text: string): string {
  return wrap(colors.gray, text);
}

/** Color a filename based on its extension */
export function colorFile(name: string, isDirectory: boolean): string {
  if (isDirectory) return wrap(colors.bold + colors.blue, name);

  const dotIdx = name.lastIndexOf('.');
  if (dotIdx === -1) return name;

  const ext = name.slice(dotIdx).toLowerCase();

  // TypeScript / JavaScript
  if (['.ts', '.tsx'].includes(ext)) return wrap(colors.cyan, name);
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return wrap(colors.yellow, name);

  // Web
  if (['.html', '.htm'].includes(ext)) return wrap(colors.red, name);
  if (['.css', '.scss', '.less'].includes(ext)) return wrap(colors.magenta, name);

  // Data / Config
  if (['.json', '.yaml', '.yml', '.toml', '.xml'].includes(ext)) return wrap(colors.brightYellow, name);

  // Docs
  if (['.md', '.txt', '.rst'].includes(ext)) return wrap(colors.white, name);

  // Images
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) return wrap(colors.brightMagenta, name);

  // Languages
  if (['.py'].includes(ext)) return wrap(colors.brightGreen, name);
  if (['.rs'].includes(ext)) return wrap(colors.brightRed, name);
  if (['.go'].includes(ext)) return wrap(colors.brightCyan, name);
  if (['.rb'].includes(ext)) return wrap(colors.red, name);
  if (['.swift', '.kt'].includes(ext)) return wrap(colors.brightRed, name);
  if (['.java', '.cs'].includes(ext)) return wrap(colors.brightYellow, name);
  if (['.c', '.cpp', '.h'].includes(ext)) return wrap(colors.blue, name);
  if (['.sh', '.bash', '.zsh', '.fish'].includes(ext)) return wrap(colors.green, name);

  // Executables / Binaries
  if (['.exe', '.wasm'].includes(ext)) return wrap(colors.brightRed, name);

  // Lock / Generated
  if (['.lock'].includes(ext)) return wrap(colors.gray, name);

  return name;
}
