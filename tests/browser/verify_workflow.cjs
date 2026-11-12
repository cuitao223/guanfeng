#!/usr/bin/env node
/**
 * Live workflow browser acceptance. Writes only tests/browser/workflow-* evidence.
 * Uses Edge headless and the existing Python Playwright driver package when Node
 * cannot resolve playwright. It creates one editor through the UI, never steals
 * an existing editor session, and leaves/restores only its own changes.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const here = __dirname;
const backend = process.env.WB_BACKEND_URL || 'http://127.0.0.1:18080';
const configuredBrowser = process.env.WB_BROWSER_URL;
const out = path.join(here, `workflow-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const secrets = new Set();
const report = { startedAt: new Date().toISOString(), backend, checks: [], evidence: [], blocked: [], cleanup: [], errors: [] };
const contexts = [];
let browser = null;
let playwright = null;
let editorToken = null;
let sessionCreated = false;
let initialProject = null;
let lastOwnRevision = null;
let ownChangesSaved = false;
let lastOwnProject = null;
let requestContext = null;
let initialOwner = null;
let datasets = [];
let restoreAttempted = false;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function safeText(value) {
  let text = String(value == null ? '' : value);
  for (const secret of secrets) if (secret) text = text.split(secret).join('[REDACTED]');
  return text.replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED]');
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function record(name, status, details = {}) {
  const clean = JSON.parse(safeText(JSON.stringify(details)));
  report.checks.push({ name, status, ...clean });
  console.log(`${status.toUpperCase()}: ${name}`);
}
async function writeEvidence(name, value) {
  const target = path.join(out, name);
  const body = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  await fs.writeFile(target, safeText(body), 'utf8');
  report.evidence.push(name);
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(out, name), fullPage: true });
  report.evidence.push(name);
}
async function waitUntil(predicate, timeout = 20000) {
  const end = Date.now() + timeout;
  let lastError = null;
  while (Date.now() < end) {
    try { if (await predicate()) return; } catch (error) { lastError = error; }
    await delay(120);
  }
  throw lastError || new Error('Timed out waiting for browser state');
}
async function resolvePlaywright() {
  let modulePath = process.env.WB_PLAYWRIGHT;
  if (!modulePath) {
    try { modulePath = require.resolve('playwright'); } catch {
      const python = process.env.GUANFENG_PYTHON || 'python';
      modulePath = execFileSync(python, ['-c', 'import pathlib,playwright; print(pathlib.Path(playwright.__file__).parent / "driver" / "package")'], { encoding: 'utf8', windowsHide: true }).trim();
    }
  }
  return require(modulePath);
}
async function apiJson(request, method, endpoint, body, token) {
  const options = { method, headers: { accept: 'application/json' } };
  if (token) options.headers['X-Session'] = token;
  if (body !== undefined) { options.headers['content-type'] = 'application/json'; options.data = body; }
  const response = await request.fetch(backend + endpoint, options);
  const json = await response.json();
  return { response, json };
}
function dataOf(result) {
  assert(result.json && result.json.code === 200, `API ${result.response.status()} ${result.json?.msg || 'failed'}`);
  return result.json.data;
}
async function backendReady(request) {
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    try {
      const result = await apiJson(request, 'GET', '/api/wb/health');
      if (result.response.ok() && result.json.code === 200 && result.json.data?.status === 'ok') return;
    } catch {}
    await delay(250);
  }
  throw new Error('Backend health did not become ready');
}
async function selectElement(page, label, optionText) {
  const field = page.getByText(label, { exact: true }).last();
  const formItem = field.locator('..');
  const select = formItem.locator('.el-select').first();
  await select.click();
  await page.locator('.el-select-dropdown:visible').getByRole('option', { name: optionText, exact: true }).click();
}
async function clickTab(page, label) { await page.getByRole('tab', { name: label, exact: true }).click(); }
async function createEditor(page) {
  await clickTab(page, 'Collaboration & history');
  await page.getByLabel('Display name', { exact: true }).fill('Workflow browser acceptance');
  await page.locator('.wb-session-form label.el-radio').filter({hasText: /^Editor$/}).click();
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/wb/session') && response.request().method() === 'POST'),
    page.getByTestId('join-session').click()
  ]);
  const json = await response.json();
  if (!response.ok() || json.code !== 200) {
    if (String(json.msg || '').toLowerCase().includes('editor')) {
      report.blocked.push({ reason: 'An editor session already exists; no existing session was taken over.', message: safeText(json.msg) });
      throw Object.assign(new Error('Existing editor session; refusing to steal it'), { blocked: true });
    }
    throw new Error(`Editor session creation failed: ${safeText(json.msg)}`);
  }
  const session = json.data;
  assert(session?.role === 'editor' && session.token, 'Session response did not return editor credentials');
  editorToken = session.token;
  secrets.add(editorToken);
  sessionCreated = true;
  record('create-editor-through-ui', 'passed', { role: session.role, credentialsPersisted: false });
}
async function loadDag(page) {
  await clickTab(page, 'Workflow studio');
  await page.getByRole('button', { name: 'Load project', exact: true }).click();
  await waitUntil(async () => (await page.locator('.wb-dag-node').count()) > 0);
  const result = await apiJson(page.request, 'GET', '/api/wb/projects/demo', undefined, editorToken);
  initialProject = dataOf(result);
  await writeEvidence('workflow-original-project.json', {revision:initialProject.revision,title:initialProject.title,workflow:initialProject.workflow});
  assert(initialProject.workflow?.nodes?.length > 0, 'Loaded project has no workflow nodes');
  record('load-project-dag-through-ui', 'passed', { revision: initialProject.revision, nodeCount: initialProject.workflow.nodes.length, edgeCount: initialProject.workflow.edges.length });
}
async function nodeIds(page) {
  const nodes = await page.locator('.wb-dag-node').evaluateAll(items => items.map(item => item.getAttribute('aria-label')).filter(Boolean));
  return nodes;
}
async function chooseComponent(page, displayName) {
  const select = page.locator('.wb-toolbar .el-select').first();
  await select.click();
  await page.locator('.el-select-dropdown:visible').getByRole('option', { name: new RegExp(`^${displayName} @`, 'i') }).first().click();
}
async function addNode(page, displayName) {
  const before = await nodeIds(page);
  await chooseComponent(page, displayName);
  await page.getByTestId('add-node').click();
  await waitUntil(async () => (await nodeIds(page)).length === before.length + 1);
  const after = await nodeIds(page);
  return after.find(id => !before.includes(id));
}
async function selectNode(page, id) {
  await page.locator(`.wb-dag-node[aria-label="${id}"]`).click();
  await waitUntil(async () => (await page.locator('.wb-node-inspector p').innerText()).includes(id));
}
async function editNodeParams(page, id, value) {
  await selectNode(page, id);
  const textarea = page.getByRole('textbox', { name: 'Parameters', exact: true });
  await textarea.fill(JSON.stringify(value));
  await page.locator('.wb-node-inspector').getByRole('button', { name: /Save project Parameters/i }).click();
  assert(JSON.stringify(JSON.parse(await textarea.inputValue())) === JSON.stringify(value), 'UI params differ from requested values');
}
async function setDatasetByUI(page, nodeId, datasetId) {
  await selectNode(page, nodeId);
  const select = page.locator('.wb-node-inspector .el-select').first();
  await select.click();
  const meta = datasets.find(item => item.id === datasetId);
  assert(meta, 'Requested real dataset missing');
  await page.locator('.el-select-dropdown:visible').getByRole('option', { name: meta.name || meta.id, exact: true }).click();
}
async function selectOption(page, select, name) {
  await select.click();
  const combo = select.locator('[role="combobox"]');
  const controls = await combo.getAttribute('aria-controls');
  assert(controls, 'Element Plus select has no owned listbox');
  const listbox = page.locator(`[id="${controls}"]`);
  await listbox.getByRole('option', { name, exact: true }).click();
  await page.waitForTimeout(180);
}
async function connectByUI(page, from, to) {
  const selects = page.locator('.wb-toolbar .el-select');
  await selectOption(page, selects.nth(1), from);
  await selectOption(page, selects.nth(2), to);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await waitUntil(async () => await page.locator(`g[aria-label="Disconnect: ${from} \u2192 ${to}"]`).count() === 1);
}
async function clickEdgeAndDisconnect(page, from, to) {
  const edge = page.locator(`g[aria-label="Disconnect: ${from} \u2192 ${to}"]`);
  const hit = await edge.locator('path').first().evaluate(item => {
    const p = item.getPointAtLength(item.getTotalLength() / 2);
    const q = new DOMPoint(p.x, p.y).matrixTransform(item.getScreenCTM());
    return { x: q.x, y: q.y };
  });
  await page.mouse.click(hit.x, hit.y);
  await waitUntil(async () => await edge.locator('path').last().getAttribute('stroke') === '#f7bf65');
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await waitUntil(async () => await page.locator(`g[aria-label="Disconnect: ${from} \u2192 ${to}"]`).count() === 0);
}
async function saveProject(page) {
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/wb/projects/demo') && response.request().method() === 'PUT'),
    page.getByTestId('save-workflow').click()
  ]);
  const json = await response.json();
  assert(response.ok() && json.code === 200, `Project save failed: ${safeText(json.msg)}`);
  const saved = json.data;
  lastOwnRevision = saved.revision;
  ownChangesSaved = true;
  lastOwnProject = saved;
  await writeEvidence('workflow-last-own-project.json', {revision:saved.revision,title:saved.title,workflow:saved.workflow});
  return saved;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function equal(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
function chartRows(chart) {
  const data = chart.data;
  if (chart.kind === 'profile') return { header: ['time', 'height', 'speed', 'direction'], rows: data.times.flatMap((time, i) => data.heightArr.map((height, j) => [time, height, data.values[i][j], data.dirs[i][j]])) };
  const grid = data.grid;
  return { header: ['x', 'y', 'value'], rows: grid.y.flatMap((y, i) => grid.x.map((x, j) => [x, y, grid.values[i][j]])) };
}
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (ch === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function unescapeHtml(value) { return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
async function verifyDownload(page, file, chart, stem) {
  const row = page.getByTestId('workflow-exports').locator('.el-table__body tbody tr').filter({ hasText: file.name });
  assert(await row.count() === 1, 'Export metadata row missing from real UI');
  assert((await row.innerText()).includes(file.sha256), 'Displayed hash differs from run metadata');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    row.getByRole('button', { name: 'Download file', exact: true }).click()
  ]);
  assert(!(await download.failure()), 'UI download failed');
  const bytes = await fs.readFile(await download.path());
  const hash = createHash('sha256').update(bytes).digest('hex');
  const response = await page.request.get(backend + file.url);
  const backendBytes = await response.body();
  assert(response.ok() && bytes.equals(backendBytes), 'UI download bytes differ from backend export');
  assert(bytes.length === file.bytes && hash === file.sha256, 'UI download length/hash differs from workflow metadata');
  const expected = chartRows(chart);
  if (file.format === 'csv') {
    const actual = parseCsv(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    assert(equal(actual.shift(), expected.header), 'CSV headers differ from chart source');
    assert(actual.length === expected.rows.length, 'CSV row count differs from source');
    actual.forEach((row, i) => {
      assert(row.length === expected.rows[i].length, 'CSV column count mismatch');
      row.forEach((value, j) => assert(typeof expected.rows[i][j] === 'number' ? Number(value) === expected.rows[i][j] : value === expected.rows[i][j], `CSV source cell differs at ${i},${j}`));
    });
  } else {
    const matches = [...bytes.toString('utf8').matchAll(/<pre>([\s\S]*?)<\/pre>/g)];
    assert(matches.length === 1, 'HTML export missing source data/provenance');
    const source = JSON.parse(unescapeHtml(matches[0][1]));
    for (const key of chart.kind === 'profile' ? ['times','heightArr','values','dirs','summary'] : ['grid','summary']) {
      assert(equal(source[key], chart.data[key]), `HTML source ${key} differs from chart`);
    }
  }
  const outputName = `${stem}-${file.name}`;
  assert(path.basename(outputName) === outputName, 'Unsafe export filename');
  await fs.writeFile(path.join(out, outputName), bytes); report.evidence.push(outputName);
  return { name: file.name, bytes: bytes.length, sha256: hash, downloadedThroughUi: true, backendBytesEqual: true, allSourceCellsMatched: true, rows: expected.rows.length };
}
async function runUiWorkflow(page, expectedKind, evidenceName) {
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/wb/workflow/run') && response.request().method() === 'POST'),
    page.getByTestId('run-workflow').click()
  ]);
  const json = await response.json();
  assert(response.ok() && json.code === 200, `Workflow run failed: ${safeText(json.msg)}`);
  const run = json.data;
  assert(run.status === 'succeeded' && run.nodes.every(node => node.status === 'succeeded'), 'Workflow contains an unsuccessful node');
  assert(run.result?.chart?.kind === expectedKind, `Expected ${expectedKind} chart`);
  assert(run.result?.exports?.length === 2, 'Expected CSV and HTML exports');
  const chart = run.result.chart;
  const visual = page.getByTestId(`workflow-${expectedKind}-chart`);
  await visual.waitFor({ state: 'visible' });
  let visualization;
  if (expectedKind === 'profile') {
    const quality = run.workflow.nodes.find(node => node.component === 'quality');
    const reader = run.workflow.nodes.find(node => node.component === 'reader');
    const source = dataOf(await apiJson(page.request, 'POST', '/api/wb/analysis', { ...quality.params, datasetId: reader.params.datasetId }));
    for (const key of ['times','heightArr','values','dirs','summary']) assert(equal(chart.data[key], source[key]), `Profile chart ${key} differs from real analysis API`);
    await waitUntil(async () => await visual.locator('canvas').evaluate(canvas => {
      if (!canvas.width || !canvas.height) return false;
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let marks = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 0 && pixels[i] + pixels[i + 1] + pixels[i + 2] > 180) marks++;
      return marks > 100;
    }));
    visualization = await visual.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height, svgLabels: canvas.parentElement.querySelectorAll('svg text').length }));
    assert(visualization.svgLabels > 0, 'Profile axes have no real labels');
  } else {
    const reader = run.workflow.nodes.find(node => node.component === 'reader');
    const source = dataOf(await apiJson(page.request, 'GET', '/api/wb/datasets/' + reader.params.datasetId));
    assert(equal(chart.data.grid, source.grid), 'Heatmap data differs from real scientific dataset API');
    const cells = visual.locator('svg rect').filter({ has: page.locator('title') });
    const expected = chartRows(chart);
    assert(await cells.count() === expected.rows.length, 'Heatmap cell count differs from real grid');
    const titles = await cells.locator('title').allTextContents();
    const colors = await cells.evaluateAll(items => [...new Set(items.map(item => item.getAttribute('fill')))]);
    assert(colors.length > 1, 'Heatmap is a single fixed color');
    for (const index of [0, Math.floor(titles.length / 2), titles.length - 1]) {
      const [x, y, value] = expected.rows[index];
      const rounded = Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));
      assert(titles[index].includes(`x: ${x}, y: ${y}`) && titles[index].includes(rounded), 'Visible heatmap title differs from source sample');
    }
    visualization = { cells: titles.length, distinctColors: colors.length, sourceShape: [chart.data.grid.y.length, chart.data.grid.x.length] };
  }
  const exports = [];
  for (const file of run.result.exports) exports.push(await verifyDownload(page, file, chart, evidenceName));
  await screenshot(page, evidenceName + '.png');
  await writeEvidence(evidenceName + '.json', { runId: run.id, status: run.status, workflow: run.workflow, visualization, chartKind: chart.kind, summary: chart.data.summary, exports });
  record(`${expectedKind}-real-ui-chart-and-exports`, 'passed', { runId: run.id, visualization, exports });
  return run;
}
async function newBlank(page) {
  const waiting = page.getByRole('button', { name: 'New blank', exact: true }).click();
  await waiting;
  const confirm = page.locator('.el-message-box').getByRole('button', { name: 'Confirm', exact: true });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await waitUntil(async () => await page.locator('.wb-dag-node').count() === 0);
}
async function profileScenario(page) {
  await newBlank(page);
  const dbs = datasets.find(item => item.format === 'radar-dbs'); assert(dbs, 'DBS source absent');
  const reader = await addNode(page, 'reader');
  const quality = await addNode(page, 'quality');
  const statistics = await addNode(page, 'statistics');
  const chart = await addNode(page, 'chart');
  const exportNode = await addNode(page, 'export');
  const disposable = await addNode(page, 'statistics');
  await selectNode(page, disposable);
  await page.getByRole('button', { name: 'Remove node', exact: true }).click();
  assert(!(await nodeIds(page)).includes(disposable), 'UI node removal failed');
  await editNodeParams(page, reader, { datasetId: dbs.id });
  await editNodeParams(page, quality, { heightMin: 127, heightMax: 500, threshold: 11, rejectInvalidDirection: true });
  await editNodeParams(page, chart, { mode: 'profile' });
  await editNodeParams(page, exportNode, { format: 'both' });
  await connectByUI(page, reader, quality);
  await connectByUI(page, quality, statistics);
  await connectByUI(page, statistics, chart);
  await connectByUI(page, chart, exportNode);
  await clickEdgeAndDisconnect(page, chart, exportNode);
  await connectByUI(page, chart, exportNode);
  const saved = await saveProject(page);
  assert(saved.workflow.nodes.length === 5 && !saved.workflow.nodes.some(node => node.id === disposable), 'Saved nodes differ from UI edits');
  assert(equal(saved.workflow.nodes.find(node => node.id === quality).params, {heightMin:127,heightMax:500,threshold:11,rejectInvalidDirection:true}), 'Saved parameters differ from UI input');
  await selectNode(page, quality);
  await page.getByRole('textbox', { name: 'Parameters', exact: true }).fill('{"threshold":99}');
  await page.getByRole('button', { name: 'Load project', exact: true }).click();
  await page.locator('.el-message-box').getByRole('button', { name: 'Confirm', exact: true }).click();
  await waitUntil(async () => await page.locator('.wb-node-inspector textarea').count() === 0);
  await selectNode(page, quality);
  assert(equal(JSON.parse(await page.getByRole('textbox', { name: 'Parameters', exact: true }).inputValue()), saved.workflow.nodes.find(node=>node.id===quality).params), 'Reload failed to restore saved node parameters');
  record('ui-dag-add-remove-edge-select-disconnect-reconnect-params-save-reload', 'passed', { revision: saved.revision, nodes: 5, removed: disposable });
  await screenshot(page, 'workflow-dag-editor.png');
  await runUiWorkflow(page, 'profile', 'workflow-profile');
}
async function gridScenario(page) {
  await newBlank(page);
  const reader = await addNode(page, 'reader');
  const quality = await addNode(page, 'quality');
  const chart = await addNode(page, 'chart');
  const exportNode = await addNode(page, 'export');
  await editNodeParams(page, reader, { datasetId: 'era5-temperature' });
  await editNodeParams(page, quality, {});
  await editNodeParams(page, chart, { mode: 'grid' });
  await editNodeParams(page, exportNode, { format: 'both' });
  await connectByUI(page, reader, quality);
  await connectByUI(page, quality, chart);
  await connectByUI(page, chart, exportNode);
  await runUiWorkflow(page, 'grid', 'workflow-grid');
}
async function restoreAndLeave(page) {
  if (!editorToken) return;
  restoreAttempted = true;
  try {
    const owner = dataOf(await apiJson(page.request, 'GET', '/api/wb/generation/owner')).ownerId;
    if (owner !== initialOwner) throw new Error('Backend owner changed; project rollback not attempted with stale session');
    const current = dataOf(await apiJson(page.request, 'GET', '/api/wb/projects/demo', undefined, editorToken));
    if (ownChangesSaved) {
      if (current.revision !== lastOwnRevision || !equal(current.workflow, lastOwnProject.workflow) || current.title !== lastOwnProject.title) {
        report.cleanup.push({ action: 'rollback-own-project-change', status: 'failed', reason: 'Project changed since our last save; did not overwrite another writer.' });
      } else {
        const restored = dataOf(await apiJson(page.request, 'POST', '/api/wb/projects/demo/rollback', { revision: current.revision, targetRevision: initialProject.revision }, editorToken));
        assert(equal(restored.workflow, initialProject.workflow) && restored.title === initialProject.title, 'Rollback did not restore original project content');
        report.cleanup.push({ action: 'rollback-own-project-change', status: 'passed', originalRevision: initialProject.revision, ownRevision: lastOwnRevision, restoredRevision: restored.revision, contentIdentical: true, historyPreserved: true });
      }
    } else report.cleanup.push({ action: 'rollback-own-project-change', status: 'not-needed', reason: 'No shared project save completed.' });
  } catch (error) { report.cleanup.push({ action: 'rollback-own-project-change', status: 'failed', message: safeText(error.message) }); }
  try {
    const left = dataOf(await apiJson(page.request, 'POST', '/api/wb/session/leave', {}, editorToken));
    assert(left.left === true, 'Session leave not confirmed');
    const denied = await apiJson(page.request, 'GET', '/api/wb/projects/demo', undefined, editorToken);
    assert(denied.json.code !== 200, 'Revoked token still has project access');
    report.cleanup.push({ action: 'session-leave-and-access-revoked', status: 'passed' });
    editorToken = null;
  } catch (error) { report.cleanup.push({ action: 'session-leave', status: 'failed', message: safeText(error.message) }); }
}
async function recoverAbortedRun(page) {
  const file = process.env.WB_WORKFLOW_RECOVERY;
  if (!file) return;
  const absolute = path.resolve(file);
  assert(path.dirname(absolute) === here && path.basename(absolute).startsWith('workflow-recovery-'), 'Recovery file must be a workflow-recovery-* evidence beside this script');
  const recovery = JSON.parse(await fs.readFile(absolute, 'utf8'));
  const current = dataOf(await apiJson(page.request, 'GET', '/api/wb/projects/demo', undefined, editorToken));
  const original = recovery.original;
  if (current.title === original.title && equal(current.workflow, original.workflow)) {
    record('recover-aborted-prior-run', 'passed', {alreadyRestored:true}); return;
  }
  const expected = recovery.expectedCurrent;
  assert(current.revision === expected.revision && current.title === expected.title && equal(current.workflow, expected.workflow) && current.updatedBy === 'Workflow browser acceptance', 'Recovery guard refused: project changed after the aborted run');
  const restored = dataOf(await apiJson(page.request, 'POST', '/api/wb/projects/demo/rollback', {revision:current.revision,targetRevision:original.revision}, editorToken));
  assert(restored.title === original.title && equal(restored.workflow, original.workflow), 'Prior-run recovery content mismatch');
  record('recover-aborted-prior-run', 'passed', {originalRevision:original.revision,fromRevision:current.revision,restoredRevision:restored.revision,contentIdentical:true});
}
async function main() {
  await fs.mkdir(out, { recursive: true });
  playwright = await resolvePlaywright();
  requestContext = await playwright.request.newContext();
  await backendReady(requestContext);
  initialOwner = dataOf(await apiJson(requestContext, 'GET', '/api/wb/generation/owner')).ownerId;
  datasets = dataOf(await apiJson(requestContext, 'GET', '/api/wb/datasets'));
  const candidates = [configuredBrowser, 'http://127.0.0.1:5174', 'http://127.0.0.1:5173'].filter(Boolean);
  let workbenchUrl = null;
  for (const candidate of candidates) { try { const response = await requestContext.get(candidate); if (response.ok()) { workbenchUrl = candidate; break; } } catch {} }
  assert(workbenchUrl, 'No running workbench frontend found');
  const browserPath = process.env.WB_CHROME || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser = await playwright.chromium.launch({ executablePath: browserPath, headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport:{width:1920,height:1080} }); contexts.push(context);
  await context.addCookies([{name:'language',value:'En',url:workbenchUrl}]);
  context.setDefaultTimeout(12000);
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ type: 'pageerror', message: safeText(error.message) }));
  await page.goto(workbenchUrl + '/workbench', { waitUntil: 'domcontentloaded' });
  await waitUntil(async () => await page.getByRole('tab', { name: 'Collaboration & history', exact: true }).count() === 1);
  await createEditor(page);
  await recoverAbortedRun(page);
  await loadDag(page);
  await profileScenario(page);
  await gridScenario(page);
  assert(report.errors.length === 0, 'Browser page reported uncaught errors');
  record('workflow-browser-acceptance', 'passed', { workbenchUrl, browser: await browser.version(), projectRestoredInFinally: false });
}
(async () => {
  try { await main(); }
  catch (error) {
    if (contexts[0]?.pages()[0]) await screenshot(contexts[0].pages()[0], 'workflow-failure.png').catch(()=>{});
    if (error.blocked) record('workflow-browser-acceptance', 'blocked', { reason: safeText(error.message) });
    else { report.errors.push({ type: 'fatal', message: safeText(error.stack || error.message) }); record('workflow-browser-acceptance', 'failed', { error: safeText(error.message) }); }
  }
  finally {
    // Cleanup is attempted before contexts/browser are closed while request headers remain in memory.
    try {
      if (contexts[0] && editorToken) await restoreAndLeave(contexts[0].pages()[0]);
    } catch (error) { report.cleanup.push({ action: 'cleanup-finally', status: 'failed', message: safeText(error.message) }); }
    for (const context of contexts) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (requestContext) await requestContext.dispose().catch(() => {});
    report.finishedAt = new Date().toISOString();
    report.restoreAttempted = restoreAttempted;
    report.sessionCredentialsPersisted = false;
    report.sharedProjectSaved = ownChangesSaved;
    report.scope = 'Live Edge UI only; no Vue instance access, response mocks, model calls, session theft, or service restart. Shared project conditionally restored; run artifacts/history retained.';
    report.passed = report.checks.some(item => item.name === 'workflow-browser-acceptance' && item.status === 'passed') && report.errors.length === 0 && report.cleanup.every(item => item.status !== 'failed');
    await writeEvidence('results.json', report).catch(() => {});
    await writeEvidence('README.md', `Workflow UI evidence\n\nRun: ${report.startedAt}\nPassed: ${report.passed}\nEvidence is from live Edge headless UI and real local HTTP responses.\n` ).catch(() => {});
    process.exitCode = report.passed ? 0 : (report.blocked.length ? 2 : 1);
  }
})();
