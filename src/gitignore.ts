import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** A compiled .gitignore rule */
interface IgnoreRule {
  pattern: RegExp;
  negated: boolean;
  dirOnly: boolean;
}

/** Parse a .gitignore file into rules */
function parseGitignore(content: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];

  for (let line of content.split('\n')) {
    line = line.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    let negated = false;
    if (line.startsWith('!')) {
      negated = true;
      line = line.slice(1);
    }

    // Trailing slash means dir-only
    let dirOnly = false;
    if (line.endsWith('/')) {
      dirOnly = true;
      line = line.slice(0, -1);
    }

    // Remove leading slash (anchored to gitignore dir)
    if (line.startsWith('/')) {
      line = line.slice(1);
    }

    const pattern = globToRegex(line);
    rules.push({ pattern, negated, dirOnly });
  }

  return rules;
}

/** Convert a gitignore glob pattern to a regex */
function globToRegex(glob: string): RegExp {
  let regex = '';
  let i = 0;

  // If no slash in pattern, match against basename only
  const matchBasename = !glob.includes('/');

  while (i < glob.length) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          regex += '(?:.+/)?';
          i += 3;
          continue;
        } else {
          regex += '.*';
          i += 2;
          continue;
        }
      }
      regex += '[^/]*';
    } else if (c === '?') {
      regex += '[^/]';
    } else if (c === '[') {
      // Character class — pass through
      const closeIdx = glob.indexOf(']', i + 1);
      if (closeIdx === -1) {
        regex += '\\[';
      } else {
        regex += glob.slice(i, closeIdx + 1);
        i = closeIdx;
      }
    } else if ('.+^${}()|\\'.includes(c)) {
      regex += '\\' + c;
    } else {
      regex += c;
    }
    i++;
  }

  if (matchBasename) {
    return new RegExp(`(?:^|/)${regex}$`);
  }

  return new RegExp(`^${regex}(?:$|/)`);
}

/** Gitignore matcher that supports nested .gitignore files */
export class GitignoreFilter {
  private rules: Array<{ rules: IgnoreRule[]; base: string }> = [];

  constructor(private rootDir: string) {}

  /** Load a .gitignore file at the given directory */
  loadFromDir(dir: string): void {
    try {
      const content = readFileSync(join(dir, '.gitignore'), 'utf-8');
      const rules = parseGitignore(content);
      if (rules.length > 0) {
        this.rules.push({ rules, base: dir });
      }
    } catch {
      // No .gitignore in this dir — that's fine
    }
  }

  /** Check if a path should be ignored */
  isIgnored(filePath: string, isDirectory: boolean): boolean {
    let ignored = false;

    for (const { rules, base } of this.rules) {
      const rel = relative(base, filePath).split(sep).join('/');

      for (const rule of rules) {
        if (rule.dirOnly && !isDirectory) continue;

        if (rule.pattern.test(rel)) {
          ignored = !rule.negated;
        }
      }
    }

    return ignored;
  }
}
