#!/usr/bin/env node
// Real browser recording only. No seeded state, fabricated frames, or model calls.
// Run from any directory: node guanfeng/tests/demo/record_demo.cjs
// Optional: WB_BROWSER_URL, WB_BACKEND_URL, WB_CHROME, WB_PLAYWRIGHT,
// GUANFENG_PYTHON. Outputs stay under workspace evidence/demo/.
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const workspace = path.resolve(__dirname, '../../..');
const evidenceRoot = path.join(workspace, 'evidence/demo');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(evidenceRoot, stamp);
const python = process.env.GUANFENG_PYTHON || 'python';
const backend = process.env.WB_BACKEND_URL || 'http://127.0.0.1:18080';
const started = performance.now();
const elapsed = () => Math.round(performance.now() - started);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const clean = value => String(value).replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED]');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {
  schemaVersion: 1, startedAt: new Date().toISOString(), status: 'recording',
  source: 'Live Edge headless browser operating the actual workbench UI',
  session: 'Fresh anonymous context; no session created and no saved browser state loaded',
  route: ['DBS analysis', 'Multi-time profile comparison', 'GOES satellite grid heatmap'],
  actions: [], responses: [], blockedRequests: [], browserErrors: [], artifacts: [],
  notes: ['UI clicks, scrolling and mouse hover are recorded in real time.',
    'No API result injection, mock responses, static-image synthesis or model requests.',
    'Response evidence contains only paths, body hashes, counts and scientific summaries; no request headers, tokens or storage state.',
    'All action offsets are relative to script start; recordingStartedOffsetMs identifies video origin.'],
  rerun: 'node guanfeng/tests/demo/record_demo.cjs'
};
let browser, context, page, video, cdp, ffmpeg, queue = Promise.resolve();
const responses = [], frames = [];
async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
async function step(name, action) {
  const entry = { name, startedAt: new Date().toISOString(), offsetMs: elapsed() };
  report.actions.push(entry);
  try { entry.details = await action(); entry.status = 'passed'; }
  catch (error) { entry.status = 'failed'; entry.error = clean(error.message); throw error; }
  finally { entry.finishedOffsetMs = elapsed(); }
}
async function backendReady() {
  const end = Date.now() + 90000;
  while (Date.now() < end) {
    try { const r = await fetch(`${backend}/api/wb/health`, { signal: AbortSignal.timeout(4000) }); const j = await r.json(); if (r.ok && j.code === 200) return; } catch {}
    await pause(1000);
  }
  throw Error('Backend health unavailable after 90 seconds, including restart recovery window');
}
async function artifact(file, extra = {}) {
  const bytes = await fs.readFile(file);
  const item = { file: path.relative(out, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: digest(bytes), ...extra };
  report.artifacts.push(item); return item;
}
async function discover() {
  let modulePath = process.env.WB_PLAYWRIGHT;
  if (!modulePath) { try { modulePath = require.resolve('playwright'); } catch {
    modulePath = execFileSync(python, ['-c', 'import pathlib,playwright; print(pathlib.Path(playwright.__file__).parent / "driver" / "package")'], { encoding: 'utf8', windowsHide: true }).trim();
  }}
  const pw = require(modulePath);
  // Use the same ffmpeg executable that Playwright recordVideo actually needs.
  try {
    const moduleRoot = path.extname(modulePath) ? path.dirname(modulePath) : modulePath;
    const { registry } = require(path.join(moduleRoot, 'lib/server/registry/index.js'));
    const candidate = registry.findExecutable('ffmpeg').executablePath();
    if (candidate && await exists(candidate)) {
      execFileSync(candidate, ['-version'], { stdio: 'ignore', windowsHide: true }); ffmpeg = candidate;
    }
  } catch {}
  return pw;
}
async function startScreencast() {
  const dir = path.join(out, 'frames'); await fs.mkdir(dir, { recursive: true });
  cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', frame => {
    // Ack immediately to avoid blocking subsequent real browser frames.
    cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
    const name = `frames/${String(frames.length).padStart(6, '0')}.jpg`;
    const bytes = Buffer.from(frame.data, 'base64');
    frames.push({ file: name, sourceTimestampSeconds: frame.metadata.timestamp, observedOffsetMs: elapsed(), sha256: digest(bytes) });
    queue = queue.then(() => fs.writeFile(path.join(out, name), bytes));
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: 960, maxHeight: 600, everyNthFrame: 1 });
}
async function encodeScreencast() {
  await queue;
  if (frames.length < 2) throw Error('Insufficient live screencast frames; no animation can be claimed');
  const source = path.join(out, 'screencast-frames.json');
  await fs.writeFile(source, JSON.stringify({ source: 'CDP Page.screencastFrame JPEG events', recordingEndedOffsetMs: elapsed(), frames }, null, 2));
  const code = [
    'import sys,json', 'from pathlib import Path', 'from PIL import Image',
    'root=Path(sys.argv[1]); manifest=json.loads((root/"screencast-frames.json").read_text())',
    'frames=manifest["frames"]; images=[]; durations=[]',
    'for i,frame in enumerate(frames):',
    '    with Image.open(root/frame["file"]) as image: images.append(image.convert("RGB"))',
    '    if i+1<len(frames):',
    '        nxt=frames[i+1]; delta=(nxt.get("sourceTimestampSeconds",0)-frame.get("sourceTimestampSeconds",0))*1000',
    '        if delta<=0: delta=nxt["observedOffsetMs"]-frame["observedOffsetMs"]',
    '    else: delta=manifest["recordingEndedOffsetMs"]-frame["observedOffsetMs"]',
    '    durations.append(max(1,round(delta)))',
    'images[0].save(root/"demo-live.webp",save_all=True,append_images=images[1:],duration=durations,loop=0,quality=78,method=4)',
    'with Image.open(root/"demo-live.webp") as check: print(json.dumps({"format":check.format,"frames":check.n_frames,"size":check.size,"durationMs":sum(durations)}))'
  ].join('\n');
  const encoded = JSON.parse(execFileSync(python, ['-c', code, out], { encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 }));
  await artifact(source, { role: 'Unmodified live frame timestamps and JPEG hashes' });
  await artifact(path.join(out, 'demo-live.webp'), { source: 'Continuous real CDP screencast frames with timestamp-derived display durations', ...encoded });
}
async function chooseDataset(dataset) {
  const select = page.locator('.panel-filter .el-select').first();
  await select.scrollIntoViewIfNeeded(); await select.click();
  await page.getByRole('option', { name: dataset.name || dataset.id, exact: true }).click();
}
async function moveAcross(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox(); if (!box || box.width < 100 || box.height < 100) throw Error('Chart has no usable visible area');
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(box.x + box.width * (0.25 + i * 0.08), box.y + box.height * (0.42 + i * 0.025), { steps: 12 });
    await pause(260);
  }
  await pause(1800);
}
async function main() {
  await fs.mkdir(out, { recursive: true }); report.scriptSha256 = digest(await fs.readFile(__filename));
  const pw = await discover();
  await backendReady();
  let base;
  for (const url of [process.env.WB_BROWSER_URL, 'http://127.0.0.1:5174', 'http://127.0.0.1:5173'].filter(Boolean)) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(4000) })).ok) { base = url; break; } } catch {}
  }
  if (!base) throw Error('No running frontend at configured URL, 5174 or 5173');
  report.workbenchUrl = new URL('/workbench', base).href;
  browser = await pw.chromium.launch({ executablePath: process.env.WB_CHROME || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  report.browser = browser.version(); report.viewport = { width: 1440, height: 1000 };
  report.capture = ffmpeg ? 'Playwright recordVideo: real WebM via existing bundled ffmpeg' : 'CDP Page.startScreencast: real JPEG frames, Pillow animated WebP';
  const options = { viewport: report.viewport, locale: 'en-US', acceptDownloads: false };
  if (ffmpeg) options.recordVideo = { dir: out, size: report.viewport };
  context = await browser.newContext(options);
  await context.addCookies([{ name: 'language', value: 'En', url: base }]);
  await context.route('**/api/wb/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() !== 'GET' && !(request.method() === 'POST' && url.pathname === '/api/wb/analysis')) {
      report.blockedRequests.push({ path: url.pathname, method: request.method(), offsetMs: elapsed() });
      await route.abort('blockedbyclient'); return;
    }
    await route.continue();
  });
  report.recordingStartedOffsetMs = elapsed();
  page = await context.newPage(); if (ffmpeg) video = page.video(); else await startScreencast();
  page.setDefaultTimeout(45000);
  page.on('pageerror', e => report.browserErrors.push({ offsetMs: elapsed(), message: clean(e.message) }));
  page.on('response', response => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith('/api/wb/')) return;
    const item = { path: url.pathname, method: response.request().method(), httpStatus: response.status(), offsetMs: elapsed() }; report.responses.push(item);
    if (url.pathname === '/api/wb/analysis' || url.pathname.startsWith('/api/wb/datasets')) responses.push((async () => {
      try {
        const bytes = await response.body(); item.bodySha256 = digest(bytes); const j = JSON.parse(bytes); item.code = j.code;
        if (j.data?.summary) item.summary = j.data.summary;
        if (j.data?.grid) item.grid = { xCount: j.data.grid.x?.length, yCount: j.data.grid.y?.length, unit: j.data.grid.unit, variable: j.data.grid.variable };
      } catch { item.bodyAvailable = false; }
    })());
  });
  await step('Open the actual workbench without creating a session', async () => {
    await page.goto(report.workbenchUrl, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('analyze').waitFor(); await pause(1800);
    return { sessionCreated: false };
  });
  const datasetResponse = await page.request.get(new URL('/api/wb/datasets', base).href);
  const datasetEnvelope = await datasetResponse.json();
  if (datasetEnvelope.code !== 200 || !Array.isArray(datasetEnvelope.data)) throw Error('Cannot read real dataset catalogue');
  const datasets = datasetEnvelope.data;
  const dbs = datasets.find(d => d.kind === 'profile');
  const satellite = datasets.find(d => d.kind === 'grid' && /goes|satellite|ABI|C13/i.test(`${d.id} ${d.name} ${d.source}`));
  if (!dbs || !satellite) throw Error('DBS or real satellite dataset missing; no substitute demonstration is permitted');
  report.datasets = [dbs, satellite].map(d => ({ id: d.id, name: d.name, kind: d.kind, format: d.format, source: d.source, timeStart: d.timeStart, timeEnd: d.timeEnd }));
  await step('Run real DBS analysis and inspect the wind chart', async () => {
    await backendReady(); await chooseDataset(dbs);
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/wb/analysis' && r.request().method() === 'POST', { timeout: 120000 });
    await page.getByTestId('analyze').click(); const r = await pending; const j = await r.json();
    if (j.code !== 200 || !(j.data?.summary?.validCount > 0)) throw Error('Real DBS analysis did not return valid samples');
    await page.waitForFunction(() => { const c = document.querySelector('.wb-chart canvas'); return c && c.width > 100 && c.height > 100; });
    await moveAcross(page.locator('.wb-chart'));
    return { datasetId: dbs.id, summary: j.data.summary, times: j.data.times.length, heights: j.data.heightArr.length };
  });
  await step('Switch to multi-time profile comparison using the visible control', async () => {
    await page.locator('.el-radio-button').filter({ hasText: 'Profile comparison' }).click();
    await page.locator('.compare-chart svg path').first().waitFor();
    await moveAcross(page.locator('.compare-chart'));
    return { seriesControlVisible: await page.locator('.wb-section .el-select').count(), realProfilePaths: await page.locator('.compare-chart svg path').count() };
  });
  await step('Select the actual GOES satellite NetCDF and inspect its heatmap', async () => {
    await backendReady();
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === `/api/wb/datasets/${encodeURIComponent(satellite.id)}`, { timeout: 120000 });
    await chooseDataset(satellite); const r = await pending; const j = await r.json();
    if (j.code !== 200 || !j.data?.grid?.x?.length || !j.data?.grid?.y?.length) throw Error('Real satellite grid failed to load');
    const chart = page.getByTestId('workflow-grid-chart'); await chart.waitFor();
    const count = j.data.grid.x.length * j.data.grid.y.length;
    await page.waitForFunction(expected => { const svg = document.querySelector('[data-testid="workflow-grid-chart"] svg'); return svg && svg.querySelectorAll('rect > title').length === expected; }, count);
    await moveAcross(chart);
    await page.locator('.wb-content').evaluate(el => el.scrollBy({ top: 250, behavior: 'smooth' })); await pause(1800);
    return { datasetId: satellite.id, xCount: j.data.grid.x.length, yCount: j.data.grid.y.length, cells: count, unit: j.data.grid.unit, summary: j.data.summary, provenance: j.data.provenance };
  });
  if (report.blockedRequests.length) throw Error('A disallowed mutating request was attempted and blocked');
  if (report.browserErrors.length) throw Error('Uncaught browser errors occurred; see report');
  report.status = 'passed';
}
(async () => {
  try { await main(); } catch (error) { report.status = 'failed'; report.error = clean(error.stack || error.message); process.exitCode = 1; }
  finally {
    try {
      if (cdp) { await cdp.send('Page.stopScreencast'); await encodeScreencast(); }
      if (context) await context.close();
      if (video) {
        await video.saveAs(path.join(out, 'demo-live.webm'));
        const original = await video.path(); if (original !== path.join(out, 'demo-live.webm')) await fs.unlink(original);
        const file = path.join(out, 'demo-live.webm'), bytes = await fs.readFile(file);
        if (bytes.readUInt32BE(0) !== 0x1a45dfa3 || bytes.length < 10000) throw Error('Invalid or empty WebM container');
        // Decode the actual recording to verify it is playable, not only an existing file.
        const decoded = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-an', '-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-f', 'webm', '-'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], timeout: 90000, maxBuffer: 1024 * 1024 });
        if (decoded.error || decoded.status !== 0) throw Error(clean(decoded.error?.message || decoded.stderr));
        const duration = decoded.stderr.match(/Duration:\s*([0-9:.]+)/)?.[1];
        const size = decoded.stderr.match(/Video:.*?[, ](\d{3,5})x(\d{3,5})/);
        const finalFrames = [...decoded.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1];
        await artifact(file, { container: 'WebM', source: 'Playwright native live browser video', decodedSuccessfully: true, duration, decodedFrames: Number(finalFrames || 0), width: size ? Number(size[1]) : null, height: size ? Number(size[2]) : null });
        report.mediaValidation = { method: 'Full ffmpeg decode and VP8 encode to discarded WebM stream', exitCode: decoded.status, duration, decodedFrames: Number(finalFrames || 0) };
        // Extract verification stills from the real video, never construct the video from stills.
        for (const [index, action] of report.actions.entries()) {
          if (action.status !== 'passed') continue;
          const seconds = Math.max(0, (action.finishedOffsetMs - report.recordingStartedOffsetMs - 800) / 1000);
          const still = path.join(out, `verify-${index + 1}.png`);
          execFileSync(ffmpeg, ['-hide_banner', '-ss', String(seconds), '-i', file, '-frames:v', '1', '-c:v', 'png', '-f', 'image2', still], { stdio: 'ignore', windowsHide: true, timeout: 30000 });
          await artifact(still, { source: 'Frame extracted from the live WebM solely for visual verification', videoOffsetSeconds: seconds, action: action.name });
        }
      }
    } catch (error) { report.status = 'failed'; report.captureError = clean(error.message); process.exitCode = 1; }
    await Promise.allSettled(responses);
    if (browser) await browser.close().catch(() => {});
    report.finishedAt = new Date().toISOString(); report.elapsedMs = elapsed();
    await fs.mkdir(out, { recursive: true });
    await fs.writeFile(path.join(out, 'recording.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, directory: path.relative(workspace, out), capture: report.capture, actions: report.actions.map(a => ({ name: a.name, status: a.status })), artifacts: report.artifacts, error: report.error, captureError: report.captureError }, null, 2));
  }
})();
