#!/usr/bin/env node
/** Live browser acceptance only. Writes only extended-* evidence beside this script.
 * Run: node guanfeng/tests/browser/verify_extended.cjs
 * Optional: WB_BROWSER_URL, WB_BACKEND_URL, WB_GENERATION_ID, WB_PLAYWRIGHT,
 * WB_CHROME, GUANFENG_TEST_EDITOR_TOKEN or GUANFENG_TEST_EDITOR_INVITE.
 * No HAR/trace/storageState: credentials remain in memory. No paid generation.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const id = process.env.WB_GENERATION_ID || '0bb5d5b0-ec87-4844-b2fa-ec55feeca3f5';
const backend = process.env.WB_BACKEND_URL || 'http://127.0.0.1:18080';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(here, `extended-${stamp}-${id.slice(0, 8)}`);
const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitUntil(predicate, timeout = 15000) { const t = Date.now(); while (Date.now() - t < timeout) { if (await predicate()) return; await delay(100); } throw Error('Browser UI did not reach expected state'); }
const secrets = new Set();
for (const k of ['GUANFENG_TEST_EDITOR_TOKEN', 'GUANFENG_TEST_EDITOR_INVITE']) if (process.env[k]) secrets.add(process.env[k]);
const report = { startedAt: new Date().toISOString(), generationId: id, checks: [], defects: [], outages: [], phase: process.env.WB_EXTENDED_PHASE || 'all', requireChinese: process.env.WB_REQUIRE_CHINESE === 'true', expectedThreshold: process.env.WB_EXPECT_THRESHOLD === undefined ? null : Number(process.env.WB_EXPECT_THRESHOLD), browserErrors: [], consoleErrors: [], evidence: [], noPaidGeneration: true };
const contexts = [];
const ownedSessions = new Map();
const sessionObservers = new Set();
let browser, pw, wbUrl, originalDeployment, deployedByRun = false;
function sanitize(value) {
  let text = String(value);
  for (const secret of secrets) if (secret) text = text.split(secret).join('[REDACTED]');
  return text.replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED]');
}
function record(name, status, details = {}) { report.checks.push({ name, status, ...details }); console.log(`${status.toUpperCase()}: ${name}`); }
function defect(name, details) { report.defects.push({ name, ...details }); record(name, 'failed', details); }
function remember(data) { for (const k of ['token', 'invite']) if (typeof data?.[k] === 'string') secrets.add(data[k]); return data; }
function assert(ok, message) { if (!ok) throw Error(message); }
async function jsonFile(name, data) { await fs.writeFile(path.join(out, name), sanitize(JSON.stringify(data, null, 2))); report.evidence.push(name); }
async function backendReady(timeout = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const r = await fetch(`${backend}/api/wb/generation/owner`, { signal: AbortSignal.timeout(5000) }); const j = await r.json(); if (r.ok && j.code === 200) return j.data.ownerId; } catch {}
    await delay(2000);
  }
  throw Error('Backend unavailable for 180 seconds; transient disconnects were retried');
}
async function screenshot(page, name) {
  const masks = [page.locator('input[readonly]'), page.getByRole('textbox', { name: 'Invitation', exact: true }), page.getByRole('textbox', { name: '邀请码', exact: true })];
  await page.screenshot({ path: path.join(out, name), fullPage: true, mask: masks }); report.evidence.push(name);
}
async function newContext() {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true }); contexts.push(c);
  await c.addCookies([{ name: 'language', value: 'En', url: wbUrl }]);
  await c.route('**/api/wb/generation', async route => {
    if (route.request().method() === 'POST') { report.noPaidGeneration = false; return route.abort('blockedbyclient'); }
    return route.continue();
  });
  c.on('response', response => {
    if (new URL(response.url()).pathname !== '/api/wb/session' || response.request().method() !== 'POST') return;
    const observer = response.json().then(j => { if (j.code === 200 && j.data?.token) { remember(j.data); ownedSessions.set(j.data.token, c); } }).catch(()=>{});
    sessionObservers.add(observer); observer.finally(()=>sessionObservers.delete(observer));
  });
  c.on('page', p => {
    p.on('pageerror', e => report.browserErrors.push(sanitize(e.message)));
    p.on('console', async msg => {
      if (msg.type() !== 'error') return;
      for (const arg of msg.args()) {
        try { const value = await arg.evaluate(v => v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : null); if (value) report.consoleErrors.push({ name: value.name, message: sanitize(value.message), stack: sanitize(value.stack) }); } catch {}
      }
    });
  });
  return c;
}
async function gotoWorkbench(page) {
  await backendReady();
  for (let n = 0; n < 4; n++) {
    try { await page.goto(`${wbUrl}/workbench`, { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.locator('.wb-page').waitFor({ timeout: 45000 }); return; }
    catch (e) { if (n === 3) throw e; report.outages.push({ phase: 'workbench-navigation', retry: n + 1 }); await backendReady(); await delay(2000); }
  }
}
async function tab(page, label) { await page.getByRole('tab', { name: label, exact: true }).click(); }
async function generationPage(page) {
  await gotoWorkbench(page); await tab(page, 'AI application builder');
  await page.locator('.el-table__body tr').filter({ hasText: id }).first().click({ timeout: 60000 });
  await page.getByRole('heading', { name: id, exact: true }).waitFor();
}
async function uiAction(page, suffix, label) {
  await backendReady();
  for (let n = 0; n < 4; n++) {
    try {
      const response = page.waitForResponse(r => r.url().endsWith(`/api/wb/generation/${id}/${suffix}`) && r.request().method() === 'POST', { timeout: 45000 });
      await page.getByRole('button', { name: label, exact: true }).click({ timeout: 20000 });
      let r = await response;
      if (!r) {
        await screenshot(page, `app-before-manual-analysis-${report.evidence.length}.png`);
        defect('Initial app load does not execute runtime analysis', { url, manualActionRequired: true });
        const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/runtime/analysis' && r.request().method() === 'POST');
        await analyzeButton(page).click(); r = await pending;
      }
      const j = await r.json();
      assert(r.ok() && j.code === 200, `${suffix} returned HTTP ${r.status()} code ${j.code}`);
      return j.data;
    } catch (e) {
      if (n === 3) throw e;
      report.outages.push({ phase: suffix, retry: n + 1, error: sanitize(e.message) });
      await backendReady(); await generationPage(page); await delay(1000);
    }
  }
}
function analyzeButton(page) { return page.getByRole('button', { name: /^(?:执行分析|运行分析|开始分析|重新分析|分析|Analyze|Run analysis)$/i }); }
async function thresholdControl(page) {
  const semantic = page.getByRole('spinbutton', { name: /阈值|threshold/i });
  if (await semantic.count() === 1) return semantic;
  // Some generated forms render a semantic label next to its input but omit for/id.
  const label = page.locator('label').filter({ hasText: /阈值|threshold/i });
  if (await label.count() === 1) {
    const nested = label.locator('input[type=number]');
    if (await nested.count() === 1) return nested;
    const adjacent = label.locator('xpath=following-sibling::*[1][self::input]');
    if (await adjacent.count() === 1) return adjacent;
  }
  throw Error('No uniquely identifiable threshold control by Chinese/English label semantics');
}
function numberMatches(text, actual, exact = false) {
  const value = String(text).trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return false;
  if (exact) return Number(value) === actual;
  const digits = value.includes('.') ? value.split('.')[1].length : 0;
  return Math.abs(Number(value) - Number(Number(actual).toFixed(digits))) < 1e-9;
}
async function waitTaskReady(context) {
  const started = Date.now();
  let previous;
  while (Date.now() - started < Number(process.env.WB_TASK_WAIT_MS || 600000)) {
    try {
      const r = await context.request.get(`${backend}/api/wb/generation/${id}`); const j = await r.json();
      assert(j.code === 200 && j.data, 'Task query rejected');
      const data = j.data;
      if (data.status !== previous) { console.log('Task state: ' + data.status); previous = data.status; }
      if (data.status === 'ready') return data;
      if (['failed','interrupted'].includes(data.status)) {
        await jsonFile('generation-blocked.json', { id, status: data.status, errors: data.errors, stages: data.stages });
        record('generated application browser acceptance', 'blocked', { reason: `Task ended as ${data.status}; no deployment or substituted old application was used` }); return null;
      }
    } catch (e) { report.outages.push({ phase: 'wait-task-ready', error: sanitize(e.message) }); await backendReady(); }
    await delay(3000);
  }
  record('generated application browser acceptance', 'blocked', { reason: 'Task did not reach ready within configured wait; no deployment attempted' }); return null;
}
async function openAnalysis(page, url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/runtime/analysis' && r.request().method() === 'POST', { timeout: 5000 }).catch(() => null);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      let r = await response;
      if (!r) {
        await screenshot(page, `app-before-manual-analysis-${report.evidence.length}.png`);
        defect('Initial app load does not execute runtime analysis', { url, manualActionRequired: true });
        const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/runtime/analysis' && r.request().method() === 'POST');
        await analyzeButton(page).click(); r = await pending;
      }
      const j = await r.json();
      assert(r.ok() && j.code === 200 && j.data?.summary, 'Browser runtime analysis did not succeed');
      await analyzeButton(page).waitFor();
      await waitUntil(async () => await analyzeButton(page).isEnabled());
      return { response: j.data, request: r.request().postDataJSON(), httpStatus: r.status() };
    } catch (e) { if (attempt === 3) throw e; report.outages.push({ phase: 'app-analysis', retry: attempt + 1 }); await backendReady(); await delay(2000); }
  }
}
async function inspectDOM(page, captured, name) {
  const dom = await page.locator('section').evaluateAll(sections => sections.flatMap(section => {
    const headings = [...section.querySelectorAll(':scope > h2,:scope > h3')];
    return headings.map(heading => {
      const group = document.createElement('div');
      let sibling = heading.nextElementSibling;
      while (sibling && !/^H[23]$/.test(sibling.tagName)) { group.append(sibling.cloneNode(true)); sibling = sibling.nextElementSibling; }
      return {
        title: heading.textContent.trim(),
        headers: [...group.querySelectorAll('thead th')].map(c => c.textContent.trim()),
        rows: [...group.querySelectorAll('tr')].filter(tr => tr.querySelector('td')).map(tr => [...tr.querySelectorAll('th,td')].map(c => c.textContent.trim())),
        pairs: [...group.querySelectorAll('ul.kv > li')].map(e => [e.querySelector('span')?.textContent.trim(),e.querySelector('b')?.textContent.trim()]),
        paragraphs: [...group.querySelectorAll('p')].map(e=>e.textContent.trim()),
        metrics: [...group.querySelectorAll('.grid > div,.stats > div')].map(e => [e.querySelector('b')?.textContent.trim(), [...e.childNodes].filter(n => n !== e.querySelector('b')).map(n => n.textContent).join('').trim()]),
        eventCards: [...group.querySelectorAll('.event')].map(e => ({ text: e.textContent.trim(), pairs: [...e.querySelectorAll('li')].map(li=>[li.querySelector('span')?.textContent.trim(),li.querySelector('b')?.textContent.trim()]), lines: [...e.children].map(c => c.textContent.trim()) })),
        text: group.textContent.trim()
      };
    });
  }));
  await jsonFile(`${name}.json`, { request: captured.request, response: captured.response, sections: dom });
  const summary = dom.find(s => /Summary|统计摘要|汇总统计|统计结果|汇总/i.test(s.title || ''));
  const rawRows = [...(summary?.rows || []), ...(summary?.metrics || []), ...(summary?.pairs || [])];
  const summaryAliases = { mean: /^(mean|均值|平均)/i, max: /^(max|最大)/i, validCount: /^(validCount|有效)/i, missingCount: /^(missingCount|缺测|缺失)/i, exceedCount: /^(exceedCount|超阈|超限|超越)/i };
  const keys = Object.keys(captured.response.summary);
  const rows = Object.fromEntries(rawRows.filter(r => r.length >= 2));
  for (const k of keys) if (rows[k] === undefined) { const pair = rawRows.find(r => summaryAliases[k]?.test(r[0] || '')); if (pair) rows[k] = pair[1]; }
  const visible = keys.filter(k => rows[k] !== undefined);
  const mismatch = visible.filter(k => !numberMatches(rows[k], captured.response.summary[k], /Count$/.test(k)));
  if (!visible.length || mismatch.length) defect(`${name}: visible summary differs from real response`, { visibleKeys: visible, mismatch, renderedValues: rows, summary: captured.response.summary });
  else record(`${name}: visible summary equals real response with display rounding`, 'passed', { visibleKeys: visible, renderedValues: rows, summary: captured.response.summary });
  const missing = keys.filter(k => rows[k] === undefined);
  if (missing.length) defect(`${name}: incomplete summary fields`, { missingKeys: missing });
  const events = captured.response.events || [];
  const eventSection = dom.find(s => /Exceedance|超阈|超限|超越|事件记录/i.test(s.title || '') && !/摘要|汇总/.test(s.title || ''));
  if (events.length) {
    const cards = eventSection?.eventCards || [];
    if (cards.length) {
      const errors = [];
      if (cards.length !== events.length) errors.push({ reason: 'event card count differs', actual: cards.length, expected: events.length });
      events.forEach((event, index) => {
        const card = cards[index];
        if (!card) return;
        for (const field of ['start','end']) if (!card.text.includes(String(event[field]))) errors.push({ index, field, actual: card.text, expected: event[field] });
        const peak = card.pairs?.find(p=>/peak|\u5cf0\u503c/i.test(p[0]))?.[1] || card.text.match(/(?:peak|\u5cf0\u503c)\s*[:\uff1a]\s*(-?\d+(?:\.\d+)?)/i)?.[1];
        const records = card.pairs?.find(p=>/records|\u8bb0\u5f55/i.test(p[0]))?.[1] || card.text.match(/(?:records|\u8bb0\u5f55(?:\u6570)?)\s*[:\uff1a]\s*(\d+)/i)?.[1];
        const heightsLine = card.pairs?.find(p=>/heights|\u9ad8\u5ea6/i.test(p[0]))?.[1] || card.lines.find(line => /heights|\u9ad8\u5ea6/i.test(line)) || '';
        const heights = (heightsLine.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
        if (!numberMatches(peak, event.peak)) errors.push({index,field:'peak',actual:peak,expected:event.peak});
        if (!numberMatches(records,event.records,true)) errors.push({index,field:'records',actual:records,expected:event.records});
        if (JSON.stringify(heights) !== JSON.stringify(event.heights)) errors.push({index,field:'heights',actual:heights,expected:event.heights});
      });
      if (errors.length) defect(`${name}: event cards differ from backend`, { errors });
      else record(`${name}: every event card field matches backend`, 'passed', {eventCount:events.length,checkedFields:['start','end','peak','heights','records']});
    } else {
    const cellCount = eventSection?.rows?.length || 0;
    const blanks = cellCount > 0 && eventSection.rows.every(r => r.every(c => c === ''));
    if (blanks || cellCount !== events.length) defect(`${name}: event response does not render valid event rows`, { eventCount: events.length, renderedRows: cellCount, allCellsBlank: blanks, backendFields: Object.keys(events[0]), firstEvent: events[0], renderedFirstRow: eventSection?.rows?.[0] });
    else {
      const aliases = { start: /start|开始|起始/i, end: /end|结束|终止/i, peak: /peak|峰值/i, heights: /heights|高度/i, records: /records|记录数|样本数/i };
      const index = Object.fromEntries(Object.entries(aliases).map(([key, regex]) => [key, eventSection.headers.findIndex(h => regex.test(h))]));
      const differences = [];
      for (let n = 0; n < events.length; n++) for (const key of Object.keys(aliases)) {
        const text = eventSection.rows[n]?.[index[key]], actual = events[n][key];
        let same = text !== undefined && index[key] >= 0;
        if (same && key === 'heights') same = JSON.stringify((text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)) === JSON.stringify(actual);
        else if (same && typeof actual === 'number') same = numberMatches(text, actual, key === 'records');
        else if (same) same = text === String(actual);
        if (!same) differences.push({ row: n, field: key, rendered: text ?? null, actual });
      }
      if (differences.length) defect(`${name}: event table differs from backend values`, { differences });
      else record(`${name}: every event field matches backend`, 'passed', { eventCount: events.length, checkedFields: Object.keys(aliases) });
    }
    }
  } else record(`${name}: empty exceedance state matches response`, /No exceedance|\u672a\u51fa\u73b0|无超|未超|暂无|没有/i.test(eventSection?.text || '') ? 'passed' : 'failed');
  for (const section of dom) if (section.text.includes('[object Object]')) defect(`${name}: nested object is rendered as raw JavaScript text`, { heading: section.title, visibleText: section.text, qualityCoverage: captured.response.quality?.coverage });
  const coverage = captured.response.quality?.coverage;
  if (coverage) {
    const qualitySection = dom.find(section => /quality|\u8d28\u91cf/i.test(section.title || '') && (section.rows.some(row => /observed|coverage|\u5b9e\u6d4b|\u8986\u76d6/i.test(row[0] || '')) || section.paragraphs.some(t=>/coverage|\u89c2\u6d4b.*\u9ad8\u5ea6/i.test(t))));
    const coverageRow = qualitySection?.rows.find(row => /observed|coverage|\u5b9e\u6d4b|\u8986\u76d6/i.test(row[0] || ''));
    const rendered = coverageRow?.[1] || qualitySection?.paragraphs.find(t=>/coverage|\u89c2\u6d4b.*\u9ad8\u5ea6/i.test(t)) || '';
    const bounds = (rendered.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const ok = bounds.length === 2 && bounds[0] === coverage.minHeight && bounds[1] === coverage.maxHeight && /(?:^|[\s\d])m(?:\s|$)/i.test(rendered) && !rendered.includes('[object Object]');
    record(`${name}: quality coverage shows actual min/max height and metre units`, ok ? 'passed' : 'failed', {rendered,expected:coverage,label:coverageRow?.[0]});
  }
  const text = await page.locator('body').innerText();
  if (process.env.WB_REQUIRE_CHINESE === 'true') record(`${name}: Chinese content is rendered`, /[\u4e00-\u9fff]/.test(text) ? 'passed' : 'failed');
  await screenshot(page, `${name}.png`);
  return dom;
}
async function checkProfileAndTime(page, captured) {
  const matrix = captured.response.values;
  const valid = Array.isArray(matrix) && matrix.some(row => row.some(v => typeof v === 'number' && v !== 999 && v !== -999));
  const chart = await page.locator('svg polyline,svg path,circle').count();
  if (valid && !chart) defect('Real values matrix does not render a wind profile', { responseHasValues: true, responseHasSpeed: captured.response.speed !== undefined, renderedPlotElements: chart });
  else record('Real wind profile renders from response matrix', valid && chart > 0 ? 'passed' : 'failed');
  if (report.timeSelectionRequired === false) { record('time selection excluded by actual task prompt', 'passed', {reason:'Focused application explicitly avoids a time selector'}); return; }
  const selector = page.getByRole('combobox', { name: /\u89c2\u6d4b.*\u65f6|\u65f6\u95f4\u6233|time/i });
  const action = page.getByRole('button', {name:/\u6309\u6240\u9009\u65f6\u95f4\u5206\u6790/});
  if (await selector.count() === 1 && await action.count() === 1 && captured.response.times?.length > 1) {
    const selected = captured.response.times[0];
    await selector.selectOption({label:selected});
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/runtime/analysis' && r.request().method() === 'POST');
    await action.click(); const response = await pending; const j = await response.json(); const request = response.request().postDataJSON();
    await waitUntil(async () => await analyzeButton(page).isEnabled());
    const applied = request.start === selected && request.end === selected && j.data?.times?.length === 1 && j.data.times[0] === selected;
    await jsonFile('app-time-selection.json', { selected, request, returnedTimes:j.data?.times, summary:j.data?.summary });
    if (!applied) defect('Selected timestamp analysis does not constrain the real request/results', {selected,request,returnedTimeCount:j.data?.times?.length,returnedFirst:j.data?.times?.[0],returnedLast:j.data?.times?.at(-1)});
    else record('Selected timestamp constrains real analysis', 'passed');
    await screenshot(page,'app-time-selection.png');
  }
}
async function generatedScenario() {
  const c = await newContext(), control = await c.newPage(), app = await c.newPage();
  const ready = await waitTaskReady(c); if (!ready) return;
  report.taskPrompt = ready.prompt;
  report.timeSelectionRequired = !/Avoid time selector|no time selector/i.test(ready.prompt || '');
  await generationPage(control);
  originalDeployment = ready.deployment;
  let dep;
  if (originalDeployment?.status === 'running') { dep = originalDeployment; record('reuse existing deployed app before requested stop/restart', 'passed'); }
  else { dep = await uiAction(control, 'deploy', 'Deploy application'); deployedByRun = true; }
  assert(dep.status === 'running' && dep.url, 'Deploy did not return running URL');
  record('deploy through real workbench UI', 'passed', { deployment: dep });
  const captured = await openAnalysis(app, dep.url);
  const thresholdInput = await thresholdControl(app);
  const defaultThreshold = Number(await thresholdInput.inputValue());
  const expectedThreshold = process.env.WB_EXPECT_THRESHOLD;
  record('semantic threshold control agrees with initial real request', defaultThreshold === Number(captured.request.threshold) ? 'passed' : 'failed', { controlValue: defaultThreshold, requestThreshold: captured.request.threshold });
  if (expectedThreshold !== undefined) record('requested default threshold is rendered and sent', defaultThreshold === Number(expectedThreshold) && Number(captured.request.threshold) === Number(expectedThreshold) ? 'passed' : 'failed', { expected: Number(expectedThreshold), actual: defaultThreshold });
  await inspectDOM(app, captured, 'app-initial');
  await checkProfileAndTime(app, captured);
  const threshold = Math.min(150, Math.max(Number(captured.request.threshold) + 1, Number(captured.response.summary.max) + 1));
  await thresholdInput.fill(String(threshold));
  const pending = app.waitForResponse(r => new URL(r.url()).pathname === '/runtime/analysis' && r.request().method() === 'POST');
  await analyzeButton(app).click();
  const response = await pending; const body = await response.json();
  assert(response.ok() && body.code === 200, 'Dynamic analysis failed');
  const changed = { response: body.data, request: response.request().postDataJSON(), httpStatus: response.status() };
  await waitUntil(async () => await analyzeButton(app).isEnabled());
  assert(Number(changed.request.threshold) === threshold && Number(changed.response.provenance.threshold) === threshold, 'Dynamic threshold was not sent/returned');
  assert(changed.response.events.length === 0 && changed.response.summary.exceedCount === 0, 'Threshold above observed max did not eliminate exceedances');
  assert(captured.response.events.length > 0, 'Initial fixture had no events; cannot prove threshold effect');
  record('dynamic threshold changes real request and event results', 'passed', { threshold, initialEventCount: captured.response.events.length, changedEventCount: changed.response.events.length });
  await inspectDOM(app, changed, 'app-dynamic');
  // Restore visible control before stop; restart must execute the original bundle again.
  await generationPage(control);
  const stopped = await uiAction(control, 'stop', 'Stop deployment');
  assert(stopped.status === 'stopped', 'Stop did not report stopped');
  let offline = false;
  try { await app.goto(dep.url, { timeout: 10000, waitUntil: 'domcontentloaded' }); } catch { offline = true; }
  assert(offline, 'Browser still loads original app after stop');
  record('stop from UI makes app unreachable in browser', 'passed');
  await generationPage(control);
  dep = await uiAction(control, 'deploy', 'Deploy application'); deployedByRun = true;
  const restarted = await openAnalysis(app, dep.url);
  assert(JSON.stringify(restarted.response.summary) === JSON.stringify(captured.response.summary), 'Restarted app gives different summary for same UI parameters');
  record('restart and browser reaccess execute real analysis again', 'passed', { deployment: dep, request: restarted.request, summary: restarted.response.summary });
  await screenshot(app, 'app-restarted.png');
  await generationPage(control);
  await exportScenario(control);
  // Restore our deployment without touching any originally running instance.
  if (originalDeployment?.status !== 'running') { await uiAction(control, 'stop', 'Stop deployment'); deployedByRun = false; record('cleanup: app restored to stopped state', 'passed'); }
}
async function exportScenario(control) {
  const downloadWait = control.waitForEvent('download', { timeout: 12000 }).catch(() => null);
  const exportWait = control.waitForResponse(r => new URL(r.url()).pathname.endsWith('/export'), { timeout: 20000 }).catch(() => null);
  await control.getByRole('button', { name: 'Export source ZIP', exact: true }).click();
  const exportResponse = await exportWait;
  const download = await downloadWait;
  let exportError;
  if (exportResponse?.headers()['content-type']?.includes('application/json')) { try { const j = await exportResponse.json(); exportError = { code: j.code, message: j.msg || j.message || j.error }; } catch {} }
  if (!download) {
    const meta = { browserDownload: false, responseObserved: !!exportResponse, envelopeError: exportError, method: exportResponse?.request().method(), httpStatus: exportResponse?.status(), contentType: exportResponse?.headers()['content-type'], consoleErrors: report.consoleErrors.filter(e => /null|undefined|object|download/i.test(e.message)) };
    await jsonFile('export-ui-failure.json', meta); await screenshot(control, 'generation-export-failure.png');
    defect('Export source ZIP UI produces no browser download', meta);
    return;
  }
  const zip = path.join(out, 'generated-app.zip'); await download.saveAs(zip);
  const bytes = await fs.readFile(zip); assert(bytes[0] === 0x50 && bytes[1] === 0x4b, 'Browser download is not ZIP');
  const zipInfo = JSON.parse(execFileSync(process.env.GUANFENG_PYTHON || 'python', ['-c', [
    'import json,sys,zipfile,re',
    'with zipfile.ZipFile(sys.argv[1]) as z:',
    ' names=z.namelist()',
    ' badnames=[n for n in names if re.search(r"(?i)(^|/)(\\.env[^/]*|deepseek api key|api key|credentials)(/|$)",n)]',
    ' suspect=[]',
    ' for n in names:',
    '  if not n.endswith("/"):',
    '   b=z.read(n)',
    '   if re.search(rb"(?i)(sk-[a-z0-9_-]{16,}|Bearer[ \\t]+[a-z0-9_.-]{16,})",b): suspect.append(n)',
    ' print(json.dumps({"entries":names,"suspectEntryNames":suspect,"forbiddenEntryNames":badnames}))'
  ].join('\n'), zip], { encoding: 'utf8', windowsHide: true }));
  for (const required of ['src/App.vue', 'src/api.js', 'dist/index.html', 'tools/runtime-server.mjs']) assert(zipInfo.entries.includes(required), `ZIP lacks ${required}`);
  assert(!zipInfo.suspectEntryNames.length && !zipInfo.forbiddenEntryNames.length, 'Export contains a potential credential');
  const manifest = { file: 'generated-app.zip', httpMethod: exportResponse?.request().method(), httpStatus: exportResponse?.status(), contentType: exportResponse?.headers()['content-type'], suggestedFilename: download.suggestedFilename(), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...zipInfo };
  await jsonFile('export-manifest.json', manifest); report.evidence.push('generated-app.zip'); record('browser export downloads source and built application ZIP', 'passed', manifest);
  await screenshot(control, 'generation-export.png');
}
async function joinEditor(page, name, invite = '') {
  await tab(page, 'Collaboration & history');
  await page.getByRole('textbox', { name: 'Display name', exact: true }).fill(name);
  await page.locator('.wb-session-form label.el-radio').filter({ hasText: /^Editor$/ }).click();
  if (invite) await page.getByRole('textbox', { name: 'Invitation', exact: true }).fill(invite);
  const response = page.waitForResponse(r => r.url().endsWith('/api/wb/session') && r.request().method() === 'POST');
  await page.getByTestId('join-session').click();
  const r = await response; const j = await r.json(); remember(j.data);
  if (!r.ok() || j.code !== 200 || j.data?.role !== 'editor') return null;
  await page.getByTestId('join-session').waitFor({ state: 'detached' });
  await page.getByRole('heading', { name: 'Revision history', exact: true }).waitFor();
  return j.data;
}
async function loadDAG(page) {
  await tab(page, 'Workflow studio');
  await page.getByRole('textbox', { name: 'Project title', exact: true }).waitFor();
  await page.locator('.wb-dag-node').first().waitFor({ timeout: 30000 });
}
async function readProject(c, token) {
  const r = await c.request.get(`${backend}/api/wb/projects/demo`, { headers: { 'X-Session': token } }); const j = await r.json();
  assert(j.code === 200, 'Project read failed; session may have expired on restart'); return j.data;
}
async function collaborationAttempt() {
  const owner = await backendReady();
  const ca = await newContext(), cb = await newContext();
  const a = await ca.newPage(), b = await cb.newPage();
  await Promise.all([gotoWorkbench(a), gotoWorkbench(b)]);
  let invite = process.env.GUANFENG_TEST_EDITOR_INVITE || '';
  const sponsor = process.env.GUANFENG_TEST_EDITOR_TOKEN;
  if (sponsor) {
    const r = await ca.request.post(`${backend}/api/wb/projects/demo/invite`, { headers: { 'X-Session': sponsor }, data: { role: 'editor' } });
    const j = await r.json(); remember(j.data); if (j.code === 200) invite = j.data.invite;
  }
  let sa = await joinEditor(a, 'Browser extended A', invite);
  if (!sa) {
    // No token extraction/bypass. A new owner after a short restart permits a fresh first editor.
    for (let n = 0; n < 6 && !sa; n++) {
      await delay(2000); const current = await backendReady();
      if (current !== owner) { await gotoWorkbench(a); sa = await joinEditor(a, 'Browser extended A'); break; }
    }
  }
  if (!sa) { record('two browser contexts: editor collaboration', 'blocked', { reason: 'Existing first editor requires a fresh GUANFENG_TEST_EDITOR_INVITE or GUANFENG_TEST_EDITOR_TOKEN, matching existing integration test bootstrap; no credentials were extracted from logs/files' }); return; }
  // Issue the second editor invite through the real UI. Never serialize response/headers/storage.
  const inviteResponse = a.waitForResponse(r => r.url().endsWith('/api/wb/projects/demo/invite') && r.request().method() === 'POST');
  await a.getByRole('button', { name: 'Create invitation', exact: true }).click();
  const ir = await inviteResponse; const ij = await ir.json(); remember(ij.data);
  assert(ij.code === 200 && ij.data.invite, 'UI editor invitation failed');
  const sb = await joinEditor(b, 'Browser extended B', ij.data.invite);
  assert(sb, 'Second isolated browser context could not join with editor invite');
  record('two independent browser contexts join as invited editors', 'passed', { contexts: 2, roles: ['editor', 'editor'], credentialsPersisted: false });
  const original = await readProject(ca, sa.token);
  await Promise.all([loadDAG(a), loadDAG(b)]);
  const initialTitleB = await b.getByRole('textbox', { name: 'Project title', exact: true }).inputValue();
  assert(initialTitleB === original.title, 'B did not load shared original title');
  const title = `Browser extended ${stamp}`;
  let changed = false;
  try {
    await a.getByRole('textbox', { name: 'Project title', exact: true }).fill(title);
    const saveA = a.waitForResponse(r => new URL(r.url()).pathname.endsWith('/api/wb/projects/demo') && r.request().method() === 'PUT');
    await a.getByTestId('save-workflow').click(); const ar = await saveA; const aj = await ar.json();
    assert(aj.code === 200 && aj.data.title === title, 'Editor A UI save failed'); changed = true;
    const revisionA = aj.data.revision;
    // B intentionally saves its stale UI; A and B have genuinely distinct session tokens.
    await b.getByRole('textbox', { name: 'Project title', exact: true }).fill(`${title} stale B`);
    const saveB = b.waitForResponse(r => new URL(r.url()).pathname.endsWith('/api/wb/projects/demo') && r.request().method() === 'PUT');
    await b.getByTestId('save-workflow').click(); const br = await saveB; const bj = await br.json();
    assert(bj.code === 409 || br.status() === 409, 'Stale B revision was not rejected');
    await b.getByRole('tab', { name: 'Collaboration & history', exact: true }).waitFor();
    await b.getByRole('heading', { name: title, exact: true }).waitFor();
    const after = await readProject(cb, sb.token); assert(after.revision === revisionA && after.title === title, 'B did not see A saved project after conflict');
    await screenshot(b, 'collaboration-B-conflict-shared-project.png');
    await tab(b, 'Workflow studio');
    assert((await b.getByRole('textbox', { name: 'Project title', exact: true }).inputValue()).endsWith('stale B'), 'Conflict discarded unsaved local title');
    await b.getByRole('alert').filter({ hasText: 'Another session' }).waitFor();
    await screenshot(b, 'collaboration-B-local-conflict-preserved.png');
    record('A UI save, stale B conflict, shared revision and unsaved UI preservation', 'passed', { initialRevision: original.revision, savedRevision: revisionA, conflictCode: bj.code, conflictHttpStatus: br.status() });
    // Load B through the UI and explicitly confirm replacement of stale canvas.
    await b.getByRole('button', { name: 'Load project', exact: true }).click();
    await b.getByRole('button', { name: 'Confirm', exact: true }).click();
    await waitUntil(async () => await b.getByRole('textbox', { name: 'Project title', exact: true }).inputValue() === title);
    await screenshot(a, 'collaboration-A-saved.png'); await screenshot(b, 'collaboration-B-reloaded.png');
    record('B explicitly reloads shared project through UI', 'passed');
    const diffR = await cb.request.get(`${backend}/api/wb/projects/demo/diff?from=${original.revision}&to=${revisionA}`, { headers: { 'X-Session': sb.token } });
    const diff = await diffR.json(); assert(diff.code === 200 && diff.data.changes.some(c => c.field === 'title'), 'Saved revision diff missing title change');
    await jsonFile('collaboration-diff.json', diff.data);
    // Restore only if our own revision is still current; preserve all concurrent changes.
    const current = await readProject(ca, sa.token);
    if (current.revision === revisionA && current.title === title) {
      const rr = await ca.request.post(`${backend}/api/wb/projects/demo/rollback`, { headers: { 'X-Session': sa.token }, data: { revision: revisionA, targetRevision: original.revision } }); const restored = await rr.json();
      assert(restored.code === 200 && restored.data.title === original.title, 'Rollback cleanup failed'); changed = false;
      record('revision diff and conditional rollback cleanup', 'passed', { restoredRevision: restored.data.revision });
    } else record('conditional cleanup', 'blocked', { reason: 'Concurrent changes detected; preserving newer project state' });
    // Reuse context B as a real viewer UI session after leaving editor UI.
    await tab(b, 'Collaboration & history');
    const leaveWait = b.waitForResponse(r => new URL(r.url()).pathname === '/api/wb/session/leave' && r.request().method() === 'POST');
    await b.getByRole('button', { name: 'Leave session', exact: true }).click();
    const leaveResponse = await leaveWait; const left = await leaveResponse.json();
    assert(left.code === 200, 'UI leave was rejected');
    const denied = await cb.request.get(`${backend}/api/wb/projects/demo`, {headers:{'X-Session':sb.token}}); const deniedBody = await denied.json();
    assert(deniedBody.code !== 200, 'Departed editor token still reads protected project');
    record('UI leave invalidates editor session on server', 'passed', {httpStatus:leaveResponse.status(),oldSessionRejected:true});
    await b.getByRole('textbox', { name: 'Display name', exact: true }).fill('Browser extended viewer');
    await b.locator('.wb-session-form label.el-radio').filter({ hasText: /^Viewer$/ }).click();
    const viewerR = b.waitForResponse(r => r.url().endsWith('/api/wb/session') && r.request().method() === 'POST');
    await b.getByTestId('join-session').click(); const vr = await viewerR; const vj = await vr.json(); remember(vj.data);
    assert(vj.code === 200 && vj.data.role === 'viewer', 'Viewer UI join failed'); await loadDAG(b);
    assert(await b.getByTestId('save-workflow').isDisabled(), 'Viewer save button enabled');
    assert(await b.getByRole('textbox', { name: 'Project title', exact: true }).isDisabled(), 'Viewer title is editable');
    record('second context viewer UI is read-only', 'passed'); await screenshot(b, 'collaboration-viewer-readonly.png');
  } finally {
    if (changed) {
      try { const current = await readProject(ca, sa.token); if (current.title === title) {
        const r = await ca.request.post(`${backend}/api/wb/projects/demo/rollback`, { headers: { 'X-Session': sa.token }, data: { revision: current.revision, targetRevision: original.revision } });
        const j = await r.json(); record('cleanup after interrupted collaboration', j.code === 200 ? 'passed' : 'failed');
      }} catch (e) { record('collaboration cleanup', 'blocked', { reason: sanitize(e.message) }); }
    }
  }
}
async function catalogScenario() {
  const context = await newContext(), page = await context.newPage();
  await gotoWorkbench(page);
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/wb/components' && r.request().method() === 'GET');
  await tab(page, 'Components & plugins');
  const response = await pending; const payload = await response.json();
  assert(response.ok() && payload.code === 200 && Array.isArray(payload.data), 'Live catalog response is unavailable');
  const components = payload.data;
  const card = page.locator('.wb-card').filter({ has: page.getByRole('heading', { name: 'Components & plugins', exact: true }) });
  const search = card.getByPlaceholder('Search', { exact: true });
  const rows = card.locator('.el-table__body tr');
  await waitUntil(async () => await rows.count() === components.length);
  const key = c => `${c.id}@${c.version}`;
  const matching = components.filter(c => [c.id,c.name,c.category,c.version,c.description,...(c.tags || [])].join(' ').toLowerCase().includes('meteorology'));
  const hiddenFieldMatches = matching.filter(c => ![c.id,c.name,c.category,c.version].join(' ').toLowerCase().includes('meteorology'));
  await search.fill('meteorology');
  await waitUntil(async () => await rows.count() === matching.length);
  const rendered = await rows.evaluateAll(list => list.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim())));
  const actualKeys = rendered.map(c => `${c[0]}@${c[2]}`);
  assert(JSON.stringify(actualKeys.sort()) === JSON.stringify(matching.map(key).sort()), 'meteorology search differs from real component metadata');
  record('catalog meteorology filter equals real description/tags metadata', 'passed', { total: components.length, matched: matching.length, matchesFromDescriptionOrTags: hiddenFieldMatches.map(key), renderedKeys: actualKeys });
  if (!hiddenFieldMatches.length) record('description/tags-only search coverage', 'blocked', { reason: 'Current live metadata has no meteorology match solely in description/tags' });
  await screenshot(page, 'catalog-meteorology.png');
  const selection = matching.find(c => ['unit','example','testReference'].every(k => c[k] !== undefined));
  if (selection) {
    const targetRow = rows.filter({ has: page.locator('td').filter({ hasText: new RegExp(`^${selection.id}$`) }) }).filter({ hasText: selection.version });
    await targetRow.click();
    const detailsCard = page.locator('.wb-card').filter({ has: page.getByRole('heading', { name: 'Schemas & parameters', exact: true }) });
    await detailsCard.getByRole('heading', { name: `${selection.name || selection.id} · ${selection.version}`, exact: true }).waitFor();
    const details = JSON.parse(await detailsCard.locator('pre').innerText());
    for (const field of ['unit','example','testReference']) assert(JSON.stringify(details[field]) === JSON.stringify(selection[field]), `Details field ${field} differs from live metadata`);
    record('catalog details show real unit/example/testReference', 'passed', { component: key(selection), unit: details.unit, example: details.example, testReference: details.testReference });
    await screenshot(page, 'catalog-details.png');
    await jsonFile('catalog-details.json', { component: key(selection), source: selection, renderedDetails: details });
  } else record('catalog unit/example/testReference details', 'blocked', { reason: 'No matching component in current backend response provides all three fields; rebuild backend metadata then rerun catalog phase' });
  await search.fill('METEOROLOGY');
  await waitUntil(async () => await rows.count() === matching.length);
  record('catalog metadata search is case insensitive', 'passed');
  await search.fill('extended-query-no-such-component-4378');
  await waitUntil(async () => await rows.count() === 0);
  await screenshot(page, 'catalog-no-results.png');
  record('catalog nonmatching search removes all rows', 'passed');
  await search.fill(''); await waitUntil(async () => await rows.count() === components.length);
  record('clearing catalog search restores live components', 'passed', { restoredCount: components.length });
  await jsonFile('catalog-filter.json', { query:'meteorology', components, matchedKeys:matching.map(key), descriptionOrTagOnlyKeys:hiddenFieldMatches.map(key), renderedRows:rendered });
}
async function main() {
  await fs.mkdir(out, { recursive: true });
  let modulePath = process.env.WB_PLAYWRIGHT;
  if (!modulePath) { try { modulePath = require.resolve('playwright'); } catch {
    const py = execFileSync(process.env.GUANFENG_PYTHON || 'python', ['-c', 'import pathlib,playwright; print(pathlib.Path(playwright.__file__).parent / "driver" / "package")'], { encoding: 'utf8', windowsHide: true }); modulePath = py.trim();
  }}
  pw = require(modulePath);
  await backendReady();
  for (const candidate of [process.env.WB_BROWSER_URL, 'http://127.0.0.1:5174', 'http://127.0.0.1:5173'].filter(Boolean)) {
    try { const r = await fetch(candidate, { signal: AbortSignal.timeout(4000) }); if (r.ok) { wbUrl = candidate; break; } } catch {}
  }
  assert(wbUrl, 'No running workbench frontend on configured URL or 5174/5173'); report.workbenchUrl = wbUrl;
  const executablePath = process.env.WB_CHROME || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser = await pw.chromium.launch({ executablePath, headless: true }); report.browser = browser.version();
  if (!['collaboration', 'export', 'catalog'].includes(process.env.WB_EXTENDED_PHASE)) { try { await generatedScenario(); } catch (e) { record('generated browser lifecycle incomplete', 'failed', { error: sanitize(e.message) }); } }
  if (process.env.WB_EXTENDED_PHASE === 'catalog') await catalogScenario();
  if (process.env.WB_EXTENDED_PHASE === 'export') { const c = await newContext(); const p = await c.newPage(); await generationPage(p); await exportScenario(p); }
  for (let attempt = 0; attempt < (['generation', 'export', 'catalog'].includes(process.env.WB_EXTENDED_PHASE) ? 0 : 3); attempt++) {
    const owner = await backendReady();
    try { await collaborationAttempt(); break; } catch (e) {
      const after = await backendReady();
      if (after !== owner && attempt < 2) { report.outages.push({ phase: 'collaboration', reason: 'Backend instance restarted; retry with fresh UI sessions', retry: attempt + 1 }); continue; }
      record('collaboration browser scenario incomplete', 'failed', { error: sanitize(e.message) }); break;
    }
  }
}
main().catch(e => record('environment or browser startup', 'blocked', { error: sanitize(e.message) })).finally(async () => {
  if (deployedByRun && originalDeployment?.status !== 'running' && browser) {
    try { const c = contexts[0]; const r = await c.request.post(`${backend}/api/wb/generation/${id}/stop`); const j = await r.json(); record('final runtime cleanup', j.code === 200 ? 'passed' : 'failed'); } catch { record('final runtime cleanup', 'blocked', { reason: 'Backend unavailable; stop app after restart' }); }
  }
  await Promise.allSettled([...sessionObservers]);
  let cleared = 0;
  for (const [token, context] of ownedSessions) {
    try {
      const r = await context.request.post(`${backend}/api/wb/session/leave`, {headers:{'X-Session':token},data:{}}); const j = await r.json();
      const verify = await context.request.get(`${backend}/api/wb/projects/demo`, {headers:{'X-Session':token}}); const state = await verify.json();
      if (state.code !== 200) cleared++;
      else record('finally own session cleanup', 'failed', {reason:'Own session remains authorized after leave'});
    } catch { record('finally own session cleanup', 'blocked', {reason:'Backend unavailable while revoking own session'}); }
  }
  if (ownedSessions.size) record('finally revoke every session created by this run', cleared === ownedSessions.size ? 'passed' : 'failed', {created:ownedSessions.size,confirmedUnauthorized:cleared});
  await Promise.allSettled(contexts.map(c => c.close())); if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  if (report.browserErrors.length) record('uncaught browser exceptions', 'failed', { count: report.browserErrors.length });
  else record('uncaught browser exceptions', 'passed');
  record('no paid model generation was requested', report.noPaidGeneration ? 'passed' : 'failed');
  await fs.writeFile(path.join(out, 'results.json'), sanitize(JSON.stringify(report, null, 2)));
  const lines = ['# Extended live browser acceptance', '', `Task: ${id}`, `Time: ${report.startedAt}`, `Workbench: ${wbUrl || 'unavailable'}`, '', '## Checks', '', ...report.checks.map(c => `- **${c.status}** ${c.name}${c.error || c.reason ? ': ' + (c.error || c.reason) : ''}`), '', '## Genuine UI defects', '', ...report.defects.map(d => `- ${d.name}: ${JSON.stringify(d)}`), '', '## Reproduce', '', '```powershell', 'node guanfeng/tests/browser/verify_extended.cjs', '# Optional alternate generated task ID (no new model calls):', '$env:WB_GENERATION_ID = "<ready task id>"', 'node guanfeng/tests/browser/verify_extended.cjs', '```', '', 'Editor bootstrap follows verify_core.py: GUANFENG_TEST_EDITOR_INVITE or GUANFENG_TEST_EDITOR_TOKEN can be supplied in process environment. Both are kept in memory; no response headers, tokens, HAR, trace or storageState are exported.', '', 'Each screenshot/JSON/ZIP in this directory is captured from the live run. Failed UI event/schema assertions remain failed; data service success is not substituted for a working event table. Collaboration changes are conditionally rolled back only if our own saved revision remains current.'];
  await fs.writeFile(path.join(out, 'REPORT.md'), sanitize(lines.join('\n')));
  console.log('Evidence: ' + out); process.exitCode = report.checks.some(c => c.status === 'failed') ? 1 : report.checks.some(c => c.status === 'blocked') ? 2 : 0;
});
