import type { ArborOptions, TreeNode } from './types.js';
import { getIcon } from './icons.js';
import { colorFile, bold, dim, green, red, yellow, cyan, magenta, gray } from './color.js';
import { formatSize } from './size.js';
import { formatGitStatus } from './git.js';

/** Box-drawing characters */
const BRANCH = '├── ';
const LAST = '└── ';
const PIPE = '│   ';
const SPACE = '    ';

/** Render a tree to a string */
export function renderTree(root: TreeNode, options: ArborOptions): string {
  const lines: string[] = [];
  let fileCount = 0;
  let dirCount = 0;
  let totalSize = 0;

  // Root line
  const rootIcon = options.showIcons ? `${getIcon(root.name, true, true)} ` : '';
  lines.push(`${rootIcon}${bold(root.name)}`);

  function render(node: TreeNode, prefix: string): void {
    const children = node.children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const isLast = i === children.length - 1;
      const connector = isLast ? LAST : BRANCH;
      const childPrefix = isLast ? SPACE : PIPE;

      // Build the line
      let line = prefix + dim(connector);

      // Icon
      if (options.showIcons) {
        const icon = getIcon(child.name, child.isDirectory, child.isDirectory && child.children.length > 0);
        line += `${icon} `;
      }

      // Name with color
      if (child.isBrokenSymlink) {
        line += red(child.name);
      } else {
        line += colorFile(child.name, child.isDirectory);
      }

      // Symlink target
      if (child.isSymlink && child.symlinkTarget) {
        if (child.isBrokenSymlink) {
          line += ` ${red('->')} ${red(child.symlinkTarget)} ${yellow('[broken]')}`;
        } else {
          line += ` ${dim('->')} ${dim(child.symlinkTarget)}`;
        }
      }

      // Size
      if (options.showSize) {
        line += `  ${gray(formatSize(child.size))}`;
      }

      // Git status
      if (options.showGitStatus && child.gitStatus) {
        const indicator = formatGitStatus(child.gitStatus);
        line += ` ${colorGitStatus(indicator, child.gitStatus)}`;
      }

      lines.push(line);

      // Count
      if (child.isDirectory) {
        dirCount++;
      } else {
        fileCount++;
        totalSize += child.size;
      }

      // Recurse into directories
      if (child.isDirectory && child.children.length > 0) {
        render(child, prefix + dim(childPrefix));
      }
    }
  }

  render(root, '');

  // Summary
  if (options.showSummary) {
    lines.push('');
    const parts: string[] = [];
    parts.push(`${cyan(dirCount.toString())} ${dirCount === 1 ? 'directory' : 'directories'}`);
    parts.push(`${cyan(fileCount.toString())} ${fileCount === 1 ? 'file' : 'files'}`);
    if (options.showSize) {
      parts.push(gray(formatSize(totalSize)));
    }
    lines.push(parts.join(', '));
  }

  return lines.join('\n');
}

/** Colorize git status indicator */
function colorGitStatus(indicator: string, status: string): string {
  switch (status) {
    case 'modified': return yellow(`[${indicator}]`);
    case 'added':
    case 'staged': return green(`[${indicator}]`);
    case 'deleted': return red(`[${indicator}]`);
    case 'renamed': return cyan(`[${indicator}]`);
    case 'untracked': return magenta(`[${indicator}]`);
    default: return gray(`[${indicator}]`);
  }
}
