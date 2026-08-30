import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { execSync } from 'node:child_process';

function buildVersion() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    let dirty = '';
    try {
      execSync('git diff --quiet HEAD', { stdio: 'ignore' });
    } catch (e) {
      dirty = '-dirty';
    }
    return `${hash}${dirty}`;
  } catch (e) {
    return 'unknown';
  }
}

export default defineConfig({
  plugins: [viteSingleFile()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion()),
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000
  }
});
