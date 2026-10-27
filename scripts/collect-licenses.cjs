// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Zhoukpvip666
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function packageForModule(id) {
	const file = id.replace(/^\0/, '').split('?')[0];
	if (!file.replace(/\\/g, '/').includes('/node_modules/')) return;
	let dir = path.dirname(file);
	while (dir !== path.dirname(dir)) {
		const manifest = path.join(dir, 'package.json');
		if (fs.existsSync(manifest)) {
			const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
			if (pkg.name && pkg.version) return { dir, pkg };
		}
		dir = path.dirname(dir);
	}
	throw new Error(`Cannot locate dependency package: ${file}`);
}

// Read packages actually present in Rollup's output, rather than relabeling all dependencies as MIT.
function licenseNotices(name, repositoryRoot = root) {
	return {
		name: 'ocs-license-notices',
		generateBundle(_options, bundle) {
			const packages = new Map();
			for (const output of Object.values(bundle)) {
				if (output.type !== 'chunk') continue;
				for (const id of Object.keys(output.modules)) {
					const item = packageForModule(id);
					if (!item) continue;
					const { dir, pkg } = item;
					const key = `${pkg.name}@${pkg.version}`;
					if (packages.has(key)) continue;
					const files = fs.readdirSync(dir).filter((f) =>
						/^(licen[sc]e|copying|notice|copyright|thirdpartynotices)(?:[.\-_].*)?$/i.test(f) &&
						fs.statSync(path.join(dir, f)).isFile()
					);
					let supplemental = [];
					if (key === 'easy-us@1.0.15' && pkg.license === 'MIT') {
						const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
						if (!readme.includes('[MIT](./LICENSE) © [enncy](https://github.com/enncy)')) {
							throw new Error('easy-us copyright declaration changed; review supplemental license.');
						}
						supplemental = ['LICENSE.txt', 'PROVENANCE.md'].map((file) => ({
							file: `fork supplement: ${file}`,
							text: fs.readFileSync(path.join(repositoryRoot, 'third_party/easy-us-1.0.15', file), 'utf8')
						}));
					}
					if (!files.some((f) => /^(licen[sc]e|copying)/i.test(f)) && !supplemental.length) {
						throw new Error(`Missing license text for bundled dependency ${key}; review before distributing.`);
					}
					packages.set(key, {
						name: pkg.name,
						version: pkg.version,
						license: pkg.license || pkg.licenses || 'SEE LICENSE TEXT',
						repository: typeof pkg.repository === 'object' ? pkg.repository.url : pkg.repository,
						files: files.sort().map((file) => ({ file, text: fs.readFileSync(path.join(dir, file), 'utf8') })).concat(supplemental)
					});
				}
			}
			this.emitFile({
				type: 'asset',
				fileName: `${name}.third-party.json`,
				source: JSON.stringify([...packages.values()].sort((a, b) => a.name.localeCompare(b.name)), null, 2) + '\n'
			});
		}
	};
}

function comment(text) {
	return text.split(/\r?\n/).map((line) => '// ' + line).join('\n');
}

function writeDistributionNotices(dist) {
	const packages = new Map();
	for (const name of ['core', 'index']) {
		for (const pkg of JSON.parse(fs.readFileSync(path.join(dist, `${name}.third-party.json`), 'utf8'))) {
			packages.set(`${pkg.name}@${pkg.version}`, pkg);
		}
	}
	const entries = [...packages.entries()].sort(([a], [b]) => a.localeCompare(b));
	const text = 'Third-party notices for bundled OCS dependencies\n\n' + entries.map(([key, pkg]) =>
		`${key}\nLicense: ${JSON.stringify(pkg.license)}\nSource: ${pkg.repository || 'See package metadata'}\n\n` +
		pkg.files.map((f) => `--- ${f.file} ---\n${f.text.trim()}\n`).join('\n')
	).join('\n' + '='.repeat(72) + '\n\n');
	fs.writeFileSync(path.join(dist, 'THIRD-PARTY-NOTICES.txt'), text);
	fs.copyFileSync(path.join(root, 'LICENSE'), path.join(dist, 'LICENSE'));
	fs.copyFileSync(path.join(root, 'FORK-NOTICE.md'), path.join(dist, 'FORK-NOTICE.md'));
	const supplementalDir = path.join(dist, 'third_party/easy-us-1.0.15');
	fs.mkdirSync(supplementalDir, { recursive: true });
	for (const file of ['LICENSE.txt', 'PROVENANCE.md']) {
		fs.copyFileSync(path.join(root, 'third_party/easy-us-1.0.15', file), path.join(supplementalDir, file));
	}
	const upstreamLicense = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').trim();
	const forkNotice = fs.readFileSync(path.join(root, 'FORK-NOTICE.md'), 'utf8').trim();
	const marker = '// OCS DISTRIBUTION LICENSE NOTICES';
	const block = marker + '\n' + comment(upstreamLicense + '\n\n' + forkNotice + '\n\n' + text) + '\n';
	for (const file of ['core.js', 'index.js', 'ocs.user.js', 'ocs.dev.user.js', 'ocs.common.user.js']) {
		const target = path.join(dist, file);
		const source = fs.readFileSync(target, 'utf8');
		if (source.includes(marker)) throw new Error(`License notices already written: ${file}`);
		if (file.endsWith('.user.js')) {
			const end = source.indexOf('// ==/UserScript==') + '// ==/UserScript=='.length;
			if (end < '// ==/UserScript=='.length) throw new Error(`Missing userscript metadata: ${file}`);
			fs.writeFileSync(target, source.slice(0, end) + '\n\n' + block + source.slice(end));
		} else {
			fs.writeFileSync(target, block + '\n' + source);
		}
	}
	console.log(`[licenses] ${packages.size} bundled dependencies; full notices embedded and copied to ${dist}`);
}

module.exports = { licenseNotices, writeDistributionNotices };
