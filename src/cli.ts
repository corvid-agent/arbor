#!/usr/bin/env node

import { resolve } from 'node:path';
import { walkTree } from './walk.js';
import { renderTree } from './render.js';
import { setColorEnabled } from './color.js';
import { defaultOptions, type ArborOptions } from './types.js';

function printHelp(): void {
  console.log(`
arbor - Fast, beautiful directory tree

Usage: arbor [directory] [options]

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
  -h, --help             Show this help
  -v, --version          Show version

Examples:
  arbor                  Show tree of current directory
  arbor src              Show tree of src directory
  arbor -s -a            Show all files with sizes
  arbor -p '*.ts'        Show only TypeScript files
  arbor -d 2             Show tree to depth 2
  arbor --sort size -r   Show largest files first
`);
}

function parseArgs(args: string[]): ArborOptions {
  const options = { ...defaultOptions };
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    switch (arg) {
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;

      case '-v':
      case '--version':
        console.log('arbor 0.1.0');
        process.exit(0);
        break;

      case '-d':
      case '--max-depth': {
        const val = args[++i];
        if (!val || isNaN(parseInt(val))) {
          console.error('Error: --max-depth requires a number');
          process.exit(1);
        }
        options.maxDepth = parseInt(val);
        break;
      }

      case '-a':
      case '--all':
        options.showHidden = true;
        break;

      case '-s':
      case '--size':
        options.showSize = true;
        break;

      case '--no-icons':
        options.showIcons = false;
        break;

      case '--no-git':
        options.showGitStatus = false;
        break;

      case '--no-gitignore':
        options.respectGitignore = false;
        break;

      case '-D':
      case '--dirs-only':
        options.dirsOnly = true;
        break;

      case '-p':
      case '--pattern': {
        const val = args[++i];
        if (!val) {
          console.error('Error: --pattern requires a value');
          process.exit(1);
        }
        options.pattern = val;
        break;
      }

      case '--no-follow':
        options.followSymlinks = false;
        break;

      case '--no-color':
        options.noColor = true;
        break;

      case '--no-summary':
        options.showSummary = false;
        break;

      case '--sort': {
        const val = args[++i];
        if (!val || !['name', 'size', 'modified'].includes(val)) {
          console.error('Error: --sort must be one of: name, size, modified');
          process.exit(1);
        }
        options.sortBy = val as ArborOptions['sortBy'];
        break;
      }

      case '-r':
      case '--reverse':
        options.reverse = true;
        break;

      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          console.error('Run arbor --help for usage');
          process.exit(1);
        }
        // Positional argument = directory
        options.root = resolve(arg);
        break;
    }

    i++;
  }

  return options;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  // Detect color support
  if (options.noColor || !process.stdout.isTTY || process.env['NO_COLOR']) {
    setColorEnabled(false);
  }

  try {
    const tree = walkTree(options);
    const output = renderTree(tree, options);
    console.log(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
