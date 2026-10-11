const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8094', viewport: { width: 1440, height: 900 }, channel: 'msedge', launchOptions: { args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'node server.cjs', url: 'http://127.0.0.1:8094', env: { PORT: '8094' }, reuseExistingServer: false },
});
