import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ArborOptions, TreeNode, GitStatus } from './types.js';
import { GitignoreFilter } from './gitignore.js';
import { getGitRoot, getGitStatusMap, getFileGitStatus, type GitStatusMap } from './git.js';

/** Walk a directory and build a tree */
export function walkTree(options: ArborOptions): TreeNode {
  const rootPath = resolve(options.root);

  // Set up gitignore filter
  let gitignoreFilter: GitignoreFilter | null = null;
  if (options.respectGitignore) {
    gitignoreFilter = new GitignoreFilter(rootPath);
    gitignoreFilter.loadFromDir(rootPath);
  }

  // Set up git status
  let gitRoot: string | null = null;
  let gitStatusMap: GitStatusMap | null = null;
  if (options.showGitStatus) {
    gitRoot = getGitRoot(rootPath);
    if (gitRoot) {
      gitStatusMap = getGitStatusMap(gitRoot);
    }
  }

  // Build pattern matcher
  const patternMatcher = options.pattern ? buildPatternMatcher(options.pattern) : null;

  function walk(dir: string, depth: number): TreeNode {
    const stat = statSync(dir);
    const name = dir === rootPath ? '.' : dir.split('/').pop()!;

    const node: TreeNode = {
      name,
      path: dir,
      isDirectory: stat.isDirectory(),
      size: stat.size,
      modifiedMs: stat.mtimeMs,
      children: [],
      gitStatus: null,
      depth,
    };

    if (!stat.isDirectory()) {
      // Get git status for files
      if (gitRoot && gitStatusMap) {
        node.gitStatus = getFileGitStatus(dir, rootPath, gitRoot, gitStatusMap);
      }
      return node;
    }

    // Check depth limit
    if (options.maxDepth !== -1 && depth >= options.maxDepth) {
      return node;
    }

    // Load nested .gitignore
    if (gitignoreFilter && depth > 0) {
      gitignoreFilter.loadFromDir(dir);
    }

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return node; // Permission denied, etc.
    }

    // Filter entries
    const children: TreeNode[] = [];
    for (const entry of entries) {
      // Skip hidden files
      if (!options.showHidden && entry.startsWith('.')) continue;

      const fullPath = join(dir, entry);

      let entryStat;
      try {
        entryStat = statSync(fullPath);
      } catch {
        continue; // Broken symlink, etc.
      }

      const isDir = entryStat.isDirectory();

      // Skip gitignored
      if (gitignoreFilter?.isIgnored(fullPath, isDir)) continue;

      // Dirs-only mode
      if (options.dirsOnly && !isDir) continue;

      // Pattern filter (don't filter directories — they may contain matches)
      if (patternMatcher && !isDir && !patternMatcher(entry)) continue;

      const child = walk(fullPath, depth + 1);

      // If pattern is set and this is a directory with no children, skip it
      if (patternMatcher && isDir && child.children.length === 0) continue;

      children.push(child);
    }

    // Sort
    node.children = sortNodes(children, options);

    // Aggregate directory size
    if (node.children.length > 0) {
      node.size = node.children.reduce((sum, c) => sum + c.size, 0);
    }

    return node;
  }

  return walk(rootPath, 0);
}

/** Sort tree nodes according to options */
function sortNodes(nodes: TreeNode[], options: ArborOptions): TreeNode[] {
  const sorted = [...nodes];

  // Always sort directories first
  sorted.sort((a, b) => {
    // Directories first
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }

    switch (options.sortBy) {
      case 'size':
        return a.size - b.size;
      case 'modified':
        return a.modifiedMs - b.modifiedMs;
      case 'name':
      default:
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
  });

  if (options.reverse) {
    sorted.reverse();
  }

  return sorted;
}

/** Build a glob pattern matcher (simple implementation) */
function buildPatternMatcher(pattern: string): (name: string) => boolean {
  // Support comma-separated patterns
  const patterns = pattern.split(',').map(p => p.trim());

  const regexes = patterns.map(p => {
    let regex = '';
    for (let i = 0; i < p.length; i++) {
      const c = p[i]!;
      if (c === '*') {
        regex += '.*';
      } else if (c === '?') {
        regex += '.';
      } else if ('.+^${}()|\\[]'.includes(c)) {
        regex += '\\' + c;
      } else {
        regex += c;
      }
    }
    return new RegExp(`^${regex}$`, 'i');
  });

  return (name: string) => regexes.some(r => r.test(name));
}
