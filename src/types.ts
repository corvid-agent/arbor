/** Options for tree generation */
export interface ArborOptions {
  /** Root directory to scan (default: cwd) */
  root: string;
  /** Max depth to recurse (-1 = unlimited) */
  maxDepth: number;
  /** Show hidden files (dotfiles) */
  showHidden: boolean;
  /** Show file sizes */
  showSize: boolean;
  /** Show file icons (nerd font) */
  showIcons: boolean;
  /** Show git status indicators */
  showGitStatus: boolean;
  /** Respect .gitignore files */
  respectGitignore: boolean;
  /** Only show directories */
  dirsOnly: boolean;
  /** Glob pattern filter (e.g. '*.ts') */
  pattern: string | null;
  /** Disable color output */
  noColor: boolean;
  /** Show summary line */
  showSummary: boolean;
  /** Sort: 'name' | 'size' | 'modified' */
  sortBy: 'name' | 'size' | 'modified';
  /** Reverse sort order */
  reverse: boolean;
  /** Follow symlinks into directories (default true) */
  followSymlinks: boolean;
  /** Output format: 'tree' (default), 'json', 'paths', 'csv' */
  outputFormat: 'tree' | 'json' | 'paths' | 'csv';
}

export const defaultOptions: ArborOptions = {
  root: '.',
  maxDepth: -1,
  showHidden: false,
  showSize: false,
  showIcons: true,
  showGitStatus: true,
  respectGitignore: true,
  dirsOnly: false,
  pattern: null,
  noColor: false,
  showSummary: true,
  sortBy: 'name',
  reverse: false,
  followSymlinks: true,
  outputFormat: 'tree',
};

/** A node in the file tree */
export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedMs: number;
  children: TreeNode[];
  gitStatus: GitStatus | null;
  depth: number;
  isSymlink: boolean;
  symlinkTarget: string | null;
  isBrokenSymlink: boolean;
}

/** Git status for a file */
export type GitStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'ignored'
  | 'staged'
  | null;

/** Diff status for tree comparison */
export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

/** A node in a diff tree */
export interface DiffNode {
  name: string;
  path: string;
  isDirectory: boolean;
  status: DiffStatus;
  /** Size in left tree (0 if added) */
  sizeLeft: number;
  /** Size in right tree (0 if removed) */
  sizeRight: number;
  children: DiffNode[];
}
