# arbor

Fast, beautiful directory tree CLI. Zero runtime dependencies.

```
 .
├──  src         12K
│   ├──  test     3.2K
│   │   ├──  color.test.ts   1.1K
│   │   └──  walk.test.ts    2.1K
│   ├──  cli.ts              4.1K [M]
│   ├──  render.ts           2.9K
│   └──  walk.ts             4.5K [?]
├──  package.json            1.2K
└──  tsconfig.json           512 B

2 directories, 7 files, 14K
```

## Features

- File type icons (nerd font)
- Color-coded filenames by language
- Git status indicators — `[M]`odified, `[A]`dded, `[?]` untracked, `[S]`taged
- `.gitignore`-aware — automatically skips ignored files
- File sizes with human-readable units
- Glob pattern filtering
- Directories-first sorting with name/size/modified options
- Programmatic API for use in other tools

## Install

```bash
npm install -g arbor-tree
```

Or run directly:

```bash
npx arbor-tree
```

## Usage

```bash
arbor [directory] [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-d, --max-depth <n>` | Max depth to recurse (default: unlimited) |
| `-a, --all` | Show hidden files (dotfiles) |
| `-s, --size` | Show file sizes |
| `--no-icons` | Disable file icons |
| `--no-git` | Disable git status indicators |
| `--no-gitignore` | Don't respect .gitignore files |
| `-D, --dirs-only` | Only show directories |
| `-p, --pattern <glob>` | Filter files by glob (e.g. `'*.ts'`) |
| `--no-color` | Disable color output |
| `--no-summary` | Disable summary line |
| `--sort <key>` | Sort by: `name`, `size`, `modified` |
| `-r, --reverse` | Reverse sort order |

### Examples

```bash
# Show current directory
arbor

# Show a specific directory with file sizes
arbor src -s

# Only TypeScript files
arbor -p '*.ts'

# Two levels deep, all files including hidden
arbor -d 2 -a

# Largest files first
arbor -s --sort size -r

# Just the directory structure
arbor -D
```

## API

```typescript
import { walkTree, renderTree, defaultOptions } from 'arbor-tree';

const tree = walkTree({ ...defaultOptions, root: './src', showSize: true });
const output = renderTree(tree, { ...defaultOptions, showSize: true });
console.log(output);
```

## Requirements

- Node.js >= 20
- A terminal with nerd font for icons (optional — works fine without, icons just won't render)

## License

MIT
