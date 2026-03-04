#!/usr/bin/env node

import { resolve } from 'node:path';
import { walkTree } from './walk.js';
import { renderTree } from './render.js';
import { formatJson, formatPaths, formatCsv } from './format.js';
import { setColorEnabled } from './color.js';
import { defaultOptions, type ArborOptions } from './types.js';
import { diffTrees } from './diff.js';
import { renderDiff } from './render-diff.js';

function printHelp(): void {
  console.log(`
arbor - Fast, beautiful directory tree

Usage: arbor [directory] [options]
       arbor diff <dir1> <dir2> [options]

Options:
  -d, --max-depth <n>    Max depth to recurse (default: unlimited)
  -a, --all              Show hidden files (dotfiles)
  -s, --size             Show file sizes
  --no-icons             Disable file icons
  --no-git               Disable git status indicators
  --no-gitignore         Don't respect .gitignore files
  -D, --dirs-only        Only show directories
  -p, --pattern <glob>   Filter files by glob pattern (e.g. '*.ts')
  --no-follow            Don't follow symlinks into directories
  --no-color             Disable color output
  --no-summary           Disable summary line
  --sort <key>           Sort by: name, size, modified (default: name)
  -r, --reverse          Reverse sort order
  --json                 Output as JSON
  --paths                Output flat list of paths (like find)
  --csv                  Output as CSV (path, type, size, modified, git_status)
  --show-unchanged       In diff mode, show unchanged files too
  -h, --help             Show this help
  -v, --version          Show version

Commands:
  diff <dir1> <dir2>     Compare two directory trees

Examples:
  arbor                  Show tree of current directory
  arbor src              Show tree of src directory
  arbor -s -a            Show all files with sizes
  arbor -p '*.ts'        Show only TypeScript files
  arbor -d 2             Show tree to depth 2
  arbor --sort size -r   Show largest files first
  arbor --json | jq '.children[].name'
  arbor --paths           Flat list for piping
  arbor --csv > tree.csv  Export for spreadsheets
  arbor diff src dist    Compare src and dist directories
  arbor diff a b -s      Compare with size details
`);
}

type ParseResult = {
  mode: 'tree';
  options: ArborOptions;
} | {
  mode: 'diff';
  left: string;
  right: string;
  options: ArborOptions;
  showUnchanged: boolean;
}

function parseArgs(args: string[]): ParseResult {
  const options = { ...defaultOptions };

  // Check for diff subcommand
  if (args[0] === 'diff') {
    return parseDiffArgs(args.slice(1), options);
  }

  let showUnchanged = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;
    const consumed = parseCommonFlag(arg, args, i, options);
    if (consumed !== null) {
      i += consumed;
    } else if (arg === '--show-unchanged') {
      showUnchanged = true;
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      console.error('Run arbor --help for usage');
      process.exit(1);
    } else {
      options.root = resolve(arg);
    }
    i++;
  }

  return { mode: 'tree', options };
}

function parseDiffArgs(args: string[], options: ArborOptions): ParseResult {
  const positionals: string[] = [];
  let showUnchanged = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;
    const consumed = parseCommonFlag(arg, args, i, options);
    if (consumed !== null) {
      i += consumed;
    } else if (arg === '--show-unchanged') {
      showUnchanged = true;
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      console.error('Run arbor --help for usage');
      process.exit(1);
    } else {
      positionals.push(resolve(arg));
    }
    i++;
  }

  if (positionals.length !== 2) {
    console.error('Error: diff requires exactly two directories');
    console.error('Usage: arbor diff <dir1> <dir2> [options]');
    process.exit(1);
  }

  return {
    mode: 'diff',
    left: positionals[0]!,
    right: positionals[1]!,
    options,
    showUnchanged,
  };
}

/** Parse a common flag. Returns number of extra args consumed (0 for single flags, 1 for value flags), or null if not recognized. */
function parseCommonFlag(arg: string, args: string[], i: number, options: ArborOptions): number | null {
  switch (arg) {
    case '-h':
    case '--help':
      printHelp();
      process.exit(0);
      return -1;

    case '-v':
    case '--version':
      console.log('arbor 0.1.0');
      process.exit(0);
      return -1;

    case '-d':
    case '--max-depth': {
      const val = args[i + 1];
      if (!val || isNaN(parseInt(val))) {
        console.error('Error: --max-depth requires a number');
        process.exit(1);
      }
      options.maxDepth = parseInt(val!);
      return 1;
    }

    case '-a':
    case '--all':
      options.showHidden = true;
      return 0;

    case '-s':
    case '--size':
      options.showSize = true;
      return 0;

    case '--no-icons':
      options.showIcons = false;
      return 0;

    case '--no-git':
      options.showGitStatus = false;
      return 0;

    case '--no-gitignore':
      options.respectGitignore = false;
      return 0;

    case '-D':
    case '--dirs-only':
      options.dirsOnly = true;
      return 0;

    case '-p':
    case '--pattern': {
      const val = args[i + 1];
      if (!val) {
        console.error('Error: --pattern requires a value');
        process.exit(1);
      }
      options.pattern = val!;
      return 1;
    }

    case '--no-follow':
      options.followSymlinks = false;
      return 0;

    case '--no-color':
      options.noColor = true;
      return 0;

    case '--no-summary':
      options.showSummary = false;
      return 0;

    case '--sort': {
      const val = args[i + 1];
      if (!val || !['name', 'size', 'modified'].includes(val)) {
        console.error('Error: --sort must be one of: name, size, modified');
        process.exit(1);
      }
      options.sortBy = val as ArborOptions['sortBy'];
      return 1;
    }

    case '-r':
    case '--reverse':
      options.reverse = true;
      return 0;

    case '--json':
      options.outputFormat = 'json';
      return 0;

    case '--paths':
      options.outputFormat = 'paths';
      return 0;

    case '--csv':
      options.outputFormat = 'csv';
      return 0;

    default:
      return null;
  }
}

function main(): void {
  const result = parseArgs(process.argv.slice(2));

  const options = result.options;

  // Disable color for non-tree formats or when explicitly requested
  if (options.noColor || (result.mode === 'tree' && options.outputFormat !== 'tree') || !process.stdout.isTTY || process.env['NO_COLOR']) {
    setColorEnabled(false);
  }

  try {
    if (result.mode === 'diff') {
      const leftOptions = { ...options, root: result.left };
      const rightOptions = { ...options, root: result.right };
      const leftTree = walkTree(leftOptions);
      const rightTree = walkTree(rightOptions);
      const diff = diffTrees(leftTree, rightTree);
      const output = renderDiff(diff, {
        showSize: options.showSize,
        showIcons: options.showIcons,
        showUnchanged: result.showUnchanged,
      });
      console.log(output);
      return;
    }

    const tree = walkTree(options);
    let output: string;

    switch (options.outputFormat) {
      case 'json':
        output = formatJson(tree, options);
        break;
      case 'paths':
        output = formatPaths(tree);
        break;
      case 'csv':
        output = formatCsv(tree, options);
        break;
      case 'tree':
      default:
        output = renderTree(tree, options);
        break;
    }

    console.log(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
