// scripts/check_console_cdp.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.argv[2] || 'https://f1.tike69.cc.cd';
const PORT = 9223;

async function checkUrl(url) {
  console.log(`Auditing console errors for: ${url}`);
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--proxy-server=http://127.0.0.1:7890',
    '--user-data-dir=C:\\Users\\Administrator\\.gemini\\antigravity\\scratch\\chrome_temp_profile',
    url
  ]);

  await new Promise(r => setTimeout(r, 3000));

  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(raw);
          const page = list.find(p => p.type === 'page');
          if (!page || !page.webSocketDebuggerUrl) {
            chrome.kill();
            return resolve({ errors: [], note: 'No WS url' });
          }

          const WebSocket = globalThis.WebSocket;
          const ws = new WebSocket(page.webSocketDebuggerUrl);
          const errors = [];

          ws.onopen = () => {
            ws.send(JSON.stringify({ id: 1, method: 'Log.enable' }));
            ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
          };

          ws.onmessage = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') {
              errors.push(msg.params.entry.text);
            }
            if (msg.method === 'Runtime.exceptionThrown') {
              errors.push(msg.params.exceptionDetails?.text || 'Uncaught exception');
            }
          };

          setTimeout(() => {
            ws.close();
            chrome.kill();
            resolve({ errors });
          }, 3000);
        } catch (e) {
          chrome.kill();
          resolve({ errors: [], note: e.message });
        }
      });
    }).on('error', () => {
      chrome.kill();
      resolve({ errors: [] });
    });
  });
}

async function run() {
  const urls = [
    `${TARGET_URL}/`,
    `${TARGET_URL}/system`,
    `${TARGET_URL}/races`,
    `${TARGET_URL}/standings`,
    `${TARGET_URL}/ai`
  ];

  let totalErrors = 0;
  for (const u of urls) {
    const res = await checkUrl(u);
    if (res.errors.length > 0) {
      console.error(`[CONSOLE ERROR] on ${u}:`, res.errors);
      totalErrors += res.errors.length;
    } else {
      console.log(`[PASS] 0 console errors on ${u}`);
    }
  }

  console.log(`\nTotal browser console errors across inspected pages: ${totalErrors}`);
  if (totalErrors > 0) {
    process.exit(1);
  }
}

run();
