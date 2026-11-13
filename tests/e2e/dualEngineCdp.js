import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { test as base, expect, chromium } from '@playwright/test';

const isStr = (v) => Object.prototype.toString.call(v) === '[object String]';

const DEFAULT_OBSCURA_CANDIDATES = [
  '/opt/homebrew/bin/obscura',
  '/usr/local/bin/obscura',
  path.join(os.homedir(), '.obscura', 'bin', 'obscura'),
  path.join(os.homedir(), '.cargo', 'bin', 'obscura'),
  '/usr/bin/obscura',
];

export const resolveObscuraBinary = ({
  env = process.env,
  existsSync = fs.existsSync,
  candidates = DEFAULT_OBSCURA_CANDIDATES,
} = {}) => {
  const explicit = isStr(env?.OBSCURA_BIN) ? env.OBSCURA_BIN.trim() : '';
  if (explicit && existsSync(explicit)) return explicit;

  const pathDirs = isStr(env?.PATH) ? env.PATH.split(path.delimiter).filter(Boolean) : [];
  for (const dir of pathDirs) {
    const candidate = path.join(dir, 'obscura');
    if (existsSync(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }

  return null;
};

export const resolveDualEngineConfig = ({
  env = process.env,
  defaultPort = 43164,
  existsSync = fs.existsSync,
} = {}) => {
  const rawEngine = isStr(env?.E2E_ENGINE) ? env.E2E_ENGINE.trim().toLowerCase() : 'auto';
  const explicitWs = isStr(env?.OBSCURA_WS_ENDPOINT) ? env.OBSCURA_WS_ENDPOINT.trim() : '';
  const obscuraBin = resolveObscuraBinary({ env, existsSync });
  const cdpPort = Number(env?.OBSCURA_CDP_PORT) > 0 ? Number(env.OBSCURA_CDP_PORT) : defaultPort;

  const obscuraAvailable = Boolean(explicitWs || obscuraBin);
  const effectiveFastEngine =
    rawEngine === 'chromium'
      ? 'chromium'
      : rawEngine === 'obscura' || rawEngine === 'auto'
        ? obscuraAvailable
          ? 'obscura'
          : 'chromium'
        : 'chromium';

  return {
    requestedEngine: rawEngine,
    effectiveFastEngine,
    obscuraAvailable,
    obscuraBin,
    cdpPort,
    wsEndpoint: explicitWs || (obscuraAvailable ? `http://127.0.0.1:${cdpPort}` : null),
    fallbackToChromium: rawEngine === 'obscura' && !obscuraAvailable,
  };
};

const waitForCdpReady = async (endpointUrl, timeoutMs = 3500) => {
  const deadline = Date.now() + timeoutMs;
  const probeUrl = endpointUrl.startsWith('ws')
    ? endpointUrl.replace(/^ws/, 'http').replace(/\/devtools\/.*$/, '/json/version')
    : `${endpointUrl.replace(/\/+$/, '')}/json/version`;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(probeUrl);
      if (res.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  return false;
};

export const test = base.extend({
  e2eEngine: ['auto', { option: true }],
  obscuraPort: [43164, { option: true }],
  browser: [
    async ({ browser: defaultBrowser, e2eEngine, obscuraPort }, use) => {
      const mergedEnv = {
        ...process.env,
        E2E_ENGINE:
          e2eEngine && e2eEngine !== 'auto' ? e2eEngine : process.env.E2E_ENGINE || 'auto',
      };
      const cfg = resolveDualEngineConfig({ env: mergedEnv, defaultPort: obscuraPort });
      if (cfg.effectiveFastEngine !== 'obscura') {
        await use(defaultBrowser);
        return;
      }

      let daemonProc = null;
      let cdpBrowser = null;
      try {
        const alreadyUp = await waitForCdpReady(cfg.wsEndpoint, 120);
        if (!alreadyUp && cfg.obscuraBin) {
          daemonProc = spawn(
            cfg.obscuraBin,
            ['--headless', `--remote-debugging-port=${cfg.cdpPort}`],
            { stdio: 'ignore' },
          );
          await waitForCdpReady(cfg.wsEndpoint, 3500);
        }
        cdpBrowser = await chromium.connectOverCDP(cfg.wsEndpoint);
        await use(cdpBrowser);
      } catch {
        await use(defaultBrowser);
      } finally {
        if (cdpBrowser) {
          try {
            await cdpBrowser.close();
          } catch {}
        }
        if (daemonProc && !daemonProc.killed) {
          daemonProc.kill('SIGTERM');
        }
      }
    },
    { scope: 'test' },
  ],
});

export { expect };
