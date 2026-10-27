// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Zhoukpvip666
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const coreRequire = createRequire(path.join(root, 'packages/core/package.json'));
const { chromium } = coreRequire('playwright-core');
const questions = require('../examples/local-smoke/questions.json');
let requests = [];

function json(res, value, status = 200) {
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
	res.end(JSON.stringify(value));
}

const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url, 'http://127.0.0.1');
		if (url.pathname === '/questions') return json(res, questions.map(({ answer, expected, ...q }) => q));
		if (url.pathname === '/api/search') {
			let data = Object.fromEntries(url.searchParams);
			if (req.method === 'POST') {
				let body = '';
				for await (const chunk of req) body += chunk;
				data = JSON.parse(body);
				assert.match(req.headers['content-type'], /^application\/json/);
			}
			requests.push({ method: req.method, ...data });
			const question = questions.find((q) => q.title === data.title);
			await new Promise((resolve) => setTimeout(resolve, 80));
			return json(res, { results: question?.answer ? [{ question: question.title, answer: question.answer }] : [] });
		}
		if (url.pathname === '/api/broken') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			return res.end('invalid-json');
		}
		if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
		const file = url.pathname === '/' ? 'examples/local-smoke/index.html' :
			url.pathname === '/core.js' ? 'dist/core.js' :
			url.pathname === '/install/ocs.user.js' ? 'dist/ocs.user.js' : null;
		if (!file) { res.writeHead(404); return res.end(); }
		res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/html; charset=utf-8' });
		fs.createReadStream(path.join(root, file)).pipe(res);
	} catch (error) { json(res, { error: error.message }, 500); }
});

async function main() {
	const serve = process.argv.includes('--serve');
	await new Promise((resolve) => server.listen(serve ? 8788 : 0, '127.0.0.1', resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	if (serve) { console.log(`OCS local example: ${origin}`); return; }
	const executablePath = process.env.OCS_EDGE_PATH || [
		'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
		'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
	].find((file) => fs.existsSync(file));
	if (!executablePath) throw new Error('Set OCS_EDGE_PATH to a Chromium/Edge executable.');
	let browser;
	const checks = [];
	const check = (name, fn) => { fn(); checks.push(name); console.log(`PASS ${name}`); };
	try {
		browser = await chromium.launch({ executablePath, headless: true });
		const page = await browser.newPage({ viewport: { width: 1280, height: 1300 } });
		const pageErrors = [];
		page.on('pageerror', (err) => pageErrors.push(err.message));
		for (const method of ['get', 'post']) {
			requests = [];
			await page.goto(origin);
			await page.waitForFunction(() => window.demo?.ready);
			await page.evaluate((method) => window.runDemo(method), method);
			const state = await page.evaluate(() => ({
				results: window.demo.results,
				values: [...document.querySelectorAll('.question')].map((card) => ({
					id: card.dataset.id,
					answers: card.dataset.type === 'completion' ? [...card.querySelectorAll('textarea')].map((el) => el.value) :
						[...card.querySelectorAll('input:checked')].map((el) => Number(el.value))
				}))
			}));
			for (const q of questions) check(`${method.toUpperCase()} ${q.id}: search/match/fill`, () => {
				assert.deepEqual(state.values.find((v) => v.id === q.id).answers, q.expected);
				const result = state.results.find((r) => r.id === q.id);
				assert.equal(result.requested, true); assert.equal(result.resolved, true);
				assert.equal(result.finish, q.expected.length > 0); assert.equal(result.error, null);
			});
			check(`${method.toUpperCase()} request variables`, () => {
				assert.equal(requests.length, questions.length);
				for (const q of questions) {
					const request = requests.find((r) => r.title === q.title);
					assert.equal(request.method, method.toUpperCase()); assert.equal(request.type, q.type);
					assert.equal(request.options, q.type === 'completion' ? '\n' : q.options.join('\n'));
				}
			});
		}
		// Pause at the earliest question initialization, before any requests or writes start.
		await page.goto(origin);
		await page.waitForFunction(() => window.demo?.ready);
		await page.evaluate(() => {
			const original = OCS.OCSWorker.prototype.doWork;
			OCS.OCSWorker.prototype.doWork = function (...args) {
				this.opts.onResultsInit = () => this.emit('stop');
				return original.apply(this, args);
			};
			window.pendingDemo = window.runDemo();
		});
		await page.waitForFunction(() => window.demo.worker?.isStop);
		await page.waitForTimeout(400);
		const paused = await page.evaluate(() => ({ count: window.demo.requests, writes: document.querySelectorAll('input:checked').length, done: window.demo.done }));
		check('pause prevents initial requests and fills', () => assert.deepEqual(paused, { count: 0, writes: 0, done: false }));
		await page.evaluate(() => { window.demo.worker.emit('continuate'); });
		await page.waitForFunction(() => window.demo.done);
		const resumed = await page.evaluate(() => window.demo.results.filter((r) => r.finish).length);
		check('resume completes remaining work', () => assert.equal(resumed, 6));
		const broken = await page.evaluate(async () => {
			const result = await OCS.defaultAnswerWrapperHandler([{ name: 'invalid local provider', url: location.origin + '/api/broken', method: 'get', type: 'fetch', headers: {} }], { title: 'example' });
			return { error: !!result[0].error, results: result[0].results };
		});
		check('invalid provider JSON is reported with zero results', () => assert.deepEqual(broken, { error: true, results: [] }));
		check('no uncaught browser errors', () => assert.deepEqual(pageErrors, []));
		fs.mkdirSync(path.join(root, '.temp'), { recursive: true });
		await page.screenshot({ path: path.join(root, '.temp/local-smoke.png'), fullPage: true });
		fs.writeFileSync(path.join(root, '.temp/local-smoke-result.json'), JSON.stringify({ checks, count: checks.length, browser: browser.version() }, null, 2));
		console.log(`PASS ${checks.length} browser checks; screenshot: .temp/local-smoke.png`);
	} finally {
		await browser?.close();
		await new Promise((resolve) => server.close(resolve));
	}
}

main().catch((err) => { console.error(err); server.close(); process.exitCode = 1; });
