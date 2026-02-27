/** File extension to nerd font icon mapping */
const extIcons: Record<string, string> = {
  // TypeScript / JavaScript
  '.ts': '',
  '.tsx': '',
  '.js': '',
  '.jsx': '',
  '.mjs': '',
  '.cjs': '',
  // Web
  '.html': '',
  '.css': '',
  '.scss': '',
  '.less': '',
  '.svg': '',
  // Data
  '.json': '',
  '.yaml': '',
  '.yml': '',
  '.toml': '',
  '.xml': '',
  '.csv': '',
  // Config
  '.env': '',
  '.ini': '',
  '.conf': '',
  // Docs
  '.md': '',
  '.txt': '',
  '.pdf': '',
  '.doc': '',
  '.docx': '',
  // Images
  '.png': '',
  '.jpg': '',
  '.jpeg': '',
  '.gif': '',
  '.webp': '',
  '.ico': '',
  // Languages
  '.py': '',
  '.rb': '',
  '.rs': '',
  '.go': '',
  '.java': '',
  '.c': '',
  '.cpp': '',
  '.h': '',
  '.cs': '',
  '.swift': '',
  '.kt': '',
  '.lua': '',
  '.r': '',
  '.R': '',
  '.php': '',
  '.sh': '',
  '.bash': '',
  '.zsh': '',
  '.fish': '',
  // Build / Package
  '.lock': '',
  '.dockerfile': '',
  // Archives
  '.zip': '',
  '.tar': '',
  '.gz': '',
  '.tgz': '',
  // Binary / Compiled
  '.wasm': '',
  '.exe': '',
  // Git
  '.gitignore': '',
  '.gitmodules': '',
};

/** Well-known filename to icon mapping */
const nameIcons: Record<string, string> = {
  'Dockerfile': '',
  'docker-compose.yml': '',
  'docker-compose.yaml': '',
  'Makefile': '',
  'CMakeLists.txt': '',
  'LICENSE': '',
  'LICENSE.md': '',
  'README.md': '',
  'README': '',
  '.gitignore': '',
  '.gitmodules': '',
  '.editorconfig': '',
  '.prettierrc': '',
  '.eslintrc': '',
  'tsconfig.json': '',
  'package.json': '',
  'package-lock.json': '',
  'yarn.lock': '',
  'pnpm-lock.yaml': '',
  'Cargo.toml': '',
  'Cargo.lock': '',
  'go.mod': '',
  'go.sum': '',
  'Gemfile': '',
  'Gemfile.lock': '',
  'requirements.txt': '',
  'pyproject.toml': '',
  '.env': '',
  '.env.local': '',
  '.env.example': '',
};

const DIR_ICON = '';
const DIR_OPEN_ICON = '';
const DEFAULT_FILE_ICON = '';

/** Get the icon for a file or directory */
export function getIcon(name: string, isDirectory: boolean, isOpen = false): string {
  if (isDirectory) {
    return isOpen ? DIR_OPEN_ICON : DIR_ICON;
  }

  // Check exact filename first
  if (nameIcons[name]) {
    return nameIcons[name];
  }

  // Check extension
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = name.slice(dotIdx).toLowerCase();
    if (extIcons[ext]) {
      return extIcons[ext];
    }
  }

  return DEFAULT_FILE_ICON;
}
