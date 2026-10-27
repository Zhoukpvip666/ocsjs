// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Zhoukpvip666
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const names = [
	'GM_info', 'GM_getTab', 'GM_saveTab', 'GM_setValue', 'GM_getValue', 'unsafeWindow',
	'GM_listValues', 'GM_deleteValue', 'GM_notification', 'GM_xmlhttpRequest',
	'GM_getResourceText', 'GM_addValueChangeListener', 'GM_removeValueChangeListener'
];

function run(entry, { lexical, missing } = {}) {
	const source = fs.readFileSync(path.join(root, 'packages/scripts', entry), 'utf8');
	let started = 0;
	const messages = [];
	const context = {
		STYLE: 'local-css', window: { location: { href: 'https://mooc1.chaoxing.com/' } },
		confirm: (message) => { messages.push(message); return false; },
		OCS: {
			start: () => started++, definedProjects: () => [], RenderScript: {}, logoSvg: '',
			CommonProject: { scripts: { guide: { namespace: 'guide' } } }
		}
	};
	const apis = Object.fromEntries(names.map((name) => [name, () => {}]));
	apis.GM_info = { scriptHandler: 'Tampermonkey', script: { version: '5.2.3' } };
	apis.unsafeWindow = {};
	apis.GM_getResourceText = () => 'local-css';
	if (missing) apis[missing] = undefined;
	vm.createContext(context);
	if (lexical) {
		context.injectedApis = apis;
		vm.runInContext(`(function(${names.join(',')}) {\n${source}\n})(...Object.values(injectedApis))`, context);
	} else {
		Object.assign(context, apis);
		vm.runInContext(`(function(){\n${source}\n})()`, context);
	}
	return { started, messages, url: context.window.location.href };
}

for (const entry of ['entry.js', 'entry.dev.js', 'entry.common.js']) {
	test(`${entry}: supports APIs injected as lexical bindings`, () => {
		const result = run(entry, { lexical: true });
		assert.equal(result.started, 1);
		assert.deepEqual(result.messages, []);
	});
	test(`${entry}: still supports APIs on the global object`, () => {
		const result = run(entry);
		assert.equal(result.started, 1);
		assert.deepEqual(result.messages, []);
	});
	test(`${entry}: reports a missing API and does not start or navigate after cancellation`, () => {
		const result = run(entry, { lexical: true, missing: 'GM_xmlhttpRequest' });
		assert.equal(result.started, 0);
		assert.equal(result.messages.length, 1);
		assert.match(result.messages[0], /GM_xmlhttpRequest/);
		assert.equal(result.url, 'https://mooc1.chaoxing.com/');
	});
	test(`${entry}: missing GM_info produces a diagnostic rather than ReferenceError`, () => {
		const result = run(entry, { lexical: true, missing: 'GM_info' });
		assert.equal(result.started, 0);
		assert.equal(result.messages.length, 1);
		assert.match(result.messages[0], /GM_info/);
	});
}
