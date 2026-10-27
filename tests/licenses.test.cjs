// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Zhoukpvip666
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const comment = (text) => text.trim().split('\n').map((line) => '// ' + line).join('\n');
const originalLicense = read('LICENSE');
const graphs = ['core', 'index'].flatMap((name) => JSON.parse(read(`dist/${name}.third-party.json`)));
const dependencies = [...new Map(graphs.map((pkg) => [`${pkg.name}@${pkg.version}`, pkg])).values()];

test('root LICENSE retains upstream copyright and complete text', () => {
	const upstream = execFileSync('git', ['show', 'da5c0775a9d055724149ff505eae75bd85d334f9:LICENSE'], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
	assert.equal(originalLicense, upstream);
	assert.match(originalLicense, /Copyright \(c\) 2022 enncy/);
});

test('distribution copies original LICENSE and fork provenance', () => {
	assert.equal(read('dist/LICENSE'), originalLicense);
	assert.equal(read('dist/FORK-NOTICE.md'), read('FORK-NOTICE.md'));
	for (const file of ['LICENSE.txt', 'PROVENANCE.md']) {
		assert.equal(read(`dist/third_party/easy-us-1.0.15/${file}`), read(`third_party/easy-us-1.0.15/${file}`));
	}
});

test('all bundled dependencies have full notices and source information', () => {
	assert.ok(dependencies.length > 0);
	const notices = read('dist/THIRD-PARTY-NOTICES.txt');
	for (const pkg of dependencies) {
		assert.ok(pkg.repository, `${pkg.name}: repository missing`);
		assert.ok(pkg.files.length, `${pkg.name}: license text missing`);
		assert.ok(notices.includes(`${pkg.name}@${pkg.version}`));
		for (const file of pkg.files) assert.ok(notices.includes(file.text.trim()), `${pkg.name}: incomplete ${file.file}`);
	}
	assert.match(notices, /dompurify/);
	assert.match(notices, /Apache License/);
	assert.match(notices, /ISC/);
});

test('standalone JS and userscripts embed upstream and dependency notices', () => {
	for (const name of ['core.js', 'index.js', 'ocs.user.js', 'ocs.dev.user.js', 'ocs.common.user.js']) {
		const source = read(`dist/${name}`);
		assert.ok(source.includes(comment(originalLicense)), name);
		for (const pkg of dependencies) {
			for (const file of pkg.files) assert.ok(source.includes(comment(file.text)), `${name}: incomplete ${pkg.name}/${file.file}`);
		}
		if (name.endsWith('.user.js')) {
			assert.match(source, /^\/\/ ==UserScript==/);
			assert.match(source, /\/\/ @license\s+MIT/);
			assert.match(source, /\/\/ @author\s+enncy/);
			assert.match(source, /\/\/ @source\s+https:\/\/github.com\/Zhoukpvip666\/ocsjs/);
		}
	}
});

test('easy-us supplement stays pinned to reviewed version and copyright source', () => {
	const pkg = dependencies.find((pkg) => pkg.name === 'easy-us');
	assert.equal(pkg.version, '1.0.15');
	assert.equal(pkg.license, 'MIT');
	assert.match(pkg.files.find((f) => f.file.includes('LICENSE')).text, /© enncy/);
	assert.match(pkg.files.find((f) => f.file.includes('PROVENANCE')).text, /7b880d95a25766a78fc559c94a75b785eb13dc7b/);
});
