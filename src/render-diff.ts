import type { DiffNode } from './types.js';
import { bold, dim, green, red, yellow, cyan, gray } from './color.js';
import { formatSize } from './size.js';
import { getIcon } from './icons.js';

/** Box-drawing characters */
const BRANCH = '├── ';
const LAST = '└── ';
const PIPE = '│   ';
const SPACE = '    ';

export interface DiffRenderOptions {
  showSize: boolean;
  showIcons: boolean;
  showUnchanged: boolean;
}

/** Render a diff tree to a colored string */
export function renderDiff(diff: DiffNode, options: DiffRenderOptions): string {
  const lines: string[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let addedSize = 0;
  let removedSize = 0;

  // Root line
  const rootIcon = options.showIcons ? `${getIcon(diff.name, true, true)} ` : '';
  lines.push(`${rootIcon}${bold(diff.name)}`);

  function render(node: DiffNode, prefix: string): void {
    const children = options.showUnchanged
      ? node.children
      : node.children.filter(c => c.status !== 'unchanged');

    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const isLast = i === children.length - 1;
      const connector = isLast ? LAST : BRANCH;
      const childPrefix = isLast ? SPACE : PIPE;

      // Status marker
      const marker = statusMarker(child.status);

      // Build line
      let line = prefix + dim(connector);

      // Icon
      if (options.showIcons) {
        const icon = getIcon(child.name, child.isDirectory, child.isDirectory && child.children.length > 0);
        line += `${icon} `;
      }

      // Name with diff color
      line += colorByStatus(child.name, child.status, child.isDirectory);

      // Size diff
      if (options.showSize && !child.isDirectory) {
        line += '  ' + sizeDiff(child);
      }

      // Status marker at end
      line += ` ${marker}`;

      lines.push(line);

      // Count
      if (!child.isDirectory) {
        switch (child.status) {
          case 'added':
            addedCount++;
            addedSize += child.sizeRight;
            break;
          case 'removed':
            removedCount++;
            removedSize += child.sizeLeft;
            break;
          case 'modified':
            modifiedCount++;
            break;
        }
      }

      // Recurse
      if (child.isDirectory && child.children.length > 0) {
        const filteredChildren = options.showUnchanged
          ? child.children
          : child.children.filter(c => c.status !== 'unchanged');
        if (filteredChildren.length > 0) {
          render(child, prefix + dim(childPrefix));
        }
      }
    }
  }

  render(diff, '');

  // Summary
  lines.push('');
  const parts: string[] = [];
  if (addedCount > 0) parts.push(green(`+${addedCount} added`));
  if (removedCount > 0) parts.push(red(`-${removedCount} removed`));
  if (modifiedCount > 0) parts.push(yellow(`~${modifiedCount} modified`));
  if (parts.length === 0) parts.push(gray('no differences'));

  lines.push(parts.join(', '));

  // Size summary
  if (options.showSize && (addedSize > 0 || removedSize > 0)) {
    const sizeParts: string[] = [];
    if (addedSize > 0) sizeParts.push(green(`+${formatSize(addedSize).trim()}`));
    if (removedSize > 0) sizeParts.push(red(`-${formatSize(removedSize).trim()}`));
    lines.push(sizeParts.join(', '));
  }

  return lines.join('\n');
}

function statusMarker(status: string): string {
  switch (status) {
    case 'added': return green('[+]');
    case 'removed': return red('[-]');
    case 'modified': return yellow('[~]');
    default: return '';
  }
}

function colorByStatus(name: string, status: string, isDirectory: boolean): string {
  switch (status) {
    case 'added': return green(isDirectory ? bold(name) : name);
    case 'removed': return red(isDirectory ? bold(name) : name);
    case 'modified': return yellow(isDirectory ? bold(name) : name);
    default: return isDirectory ? bold(name) : gray(name);
  }
}

function sizeDiff(node: DiffNode): string {
  switch (node.status) {
    case 'added':
      return green(formatSize(node.sizeRight).trim());
    case 'removed':
      return red(formatSize(node.sizeLeft).trim());
    case 'modified': {
      const diff = node.sizeRight - node.sizeLeft;
      const sign = diff >= 0 ? '+' : '';
      return yellow(`${formatSize(node.sizeLeft).trim()} → ${formatSize(node.sizeRight).trim()} (${sign}${formatSize(Math.abs(diff)).trim()})`);
    }
    default:
      return gray(formatSize(node.sizeRight).trim());
  }
}
