import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

// Entorno con Chromium preinstalado: se reutiliza ese binario. En otros entornos
// Playwright usa su navegador oficial (`npx playwright install chromium`).
const preinstalledChromium = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(preinstalledChromium) ? preinstalledChromium : undefined;

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'off',
    launchOptions: {
      executablePath,
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
    },
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
