import { relative } from 'node:path';
import type { ArborOptions, TreeNode } from './types.js';
import { formatSize } from './size.js';
import { formatGitStatus } from './git.js';

/** Flatten a tree into a list of all nodes (depth-first) */
function flatten(node: TreeNode): TreeNode[] {
  const result: TreeNode[] = [];
  for (const child of node.children) {
    result.push(child);
    if (child.isDirectory) {
      result.push(...flatten(child));
    }
  }
  return result;
}

/** Format the tree as a JSON object */
export function formatJson(root: TreeNode, options: ArborOptions): string {
  function toJsonNode(node: TreeNode): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      name: node.name,
      path: relative(root.path, node.path) || '.',
      type: node.isDirectory ? 'directory' : 'file',
    };

    if (options.showSize) {
      obj.size = node.size;
    }

    obj.modified = new Date(node.modifiedMs).toISOString();

    if (options.showGitStatus && node.gitStatus) {
      obj.gitStatus = node.gitStatus;
    }

    if (node.isSymlink) {
      obj.isSymlink = true;
      obj.symlinkTarget = node.symlinkTarget;
      if (node.isBrokenSymlink) {
        obj.isBrokenSymlink = true;
      }
    }

    if (node.isDirectory && node.children.length > 0) {
      obj.children = node.children.map(toJsonNode);
    }

    return obj;
  }

  return JSON.stringify(toJsonNode(root), null, 2);
}

/** Format the tree as a flat list of paths (like find) */
export function formatPaths(root: TreeNode): string {
  const nodes = flatten(root);
  return nodes
    .map(node => relative(root.path, node.path))
    .join('\n');
}

/** Format the tree as CSV (path, type, size, modified, git_status) */
export function formatCsv(root: TreeNode, options: ArborOptions): string {
  const lines: string[] = [];
  lines.push('path,type,size,modified,git_status');

  const nodes = flatten(root);
  for (const node of nodes) {
    const relPath = relative(root.path, node.path);
    const type = node.isDirectory ? 'directory' : 'file';
    const size = node.size.toString();
    const modified = new Date(node.modifiedMs).toISOString();
    const git = (options.showGitStatus && node.gitStatus)
      ? formatGitStatus(node.gitStatus)
      : '';

    // Escape CSV fields that contain commas or quotes
    const escapeCsv = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    lines.push([escapeCsv(relPath), type, size, modified, git].join(','));
  }

  return lines.join('\n');
}
