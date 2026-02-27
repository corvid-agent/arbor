import { execSync } from 'node:child_process';
import { relative, sep } from 'node:path';
import type { GitStatus } from './types.js';

/** Map of relative file paths to their git status */
export type GitStatusMap = Map<string, GitStatus>;

/** Get git status for all files in a directory */
export function getGitStatusMap(rootDir: string): GitStatusMap | null {
  try {
    const output = execSync('git status --porcelain=v1 -u', {
      cwd: rootDir,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const map: GitStatusMap = new Map();

    for (const line of output.split('\n')) {
      if (!line || line.length < 4) continue;

      const indexStatus = line[0]!;
      const workStatus = line[1]!;
      const filePath = line.slice(3).trim();

      // Normalize path separators
      const normalizedPath = filePath.split('/').join(sep);

      let status: GitStatus = null;

      // Prioritize working tree status, then index status
      if (workStatus === 'M') status = 'modified';
      else if (workStatus === 'D') status = 'deleted';
      else if (workStatus === '?') status = 'untracked';
      else if (indexStatus === 'M') status = 'staged';
      else if (indexStatus === 'A') status = 'added';
      else if (indexStatus === 'D') status = 'deleted';
      else if (indexStatus === 'R') status = 'renamed';

      if (status) {
        map.set(normalizedPath, status);
      }
    }

    return map;
  } catch {
    // Not a git repo or git not available
    return null;
  }
}

/** Get the git root directory */
export function getGitRoot(dir: string): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd: dir,
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/** Look up git status for a specific path */
export function getFileGitStatus(
  filePath: string,
  rootDir: string,
  gitRoot: string,
  statusMap: GitStatusMap,
): GitStatus {
  // Make path relative to git root
  const relPath = relative(gitRoot, filePath);
  return statusMap.get(relPath) ?? null;
}

/** Format a git status indicator */
export function formatGitStatus(status: GitStatus): string {
  switch (status) {
    case 'modified': return 'M';
    case 'added': return 'A';
    case 'deleted': return 'D';
    case 'renamed': return 'R';
    case 'untracked': return '?';
    case 'staged': return 'S';
    case 'ignored': return 'I';
    default: return '';
  }
}
