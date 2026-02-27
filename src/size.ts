/** Format bytes into human-readable units */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '  0 B';

  const units = ['B', 'K', 'M', 'G', 'T'];
  const base = 1024;

  if (bytes < base) {
    return `${bytes.toString().padStart(3)} B`;
  }

  let unitIdx = 0;
  let size = bytes;

  while (size >= base && unitIdx < units.length - 1) {
    size /= base;
    unitIdx++;
  }

  const formatted = size < 10 ? size.toFixed(1) : Math.round(size).toString();
  return `${formatted.padStart(4)}${units[unitIdx]}`;
}

/** Aggregate size of a directory (sum of all children) */
export function aggregateSize(children: Array<{ size: number; isDirectory: boolean; children: Array<{ size: number }> }>): number {
  let total = 0;
  for (const child of children) {
    total += child.size;
  }
  return total;
}
