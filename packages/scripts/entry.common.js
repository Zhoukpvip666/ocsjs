/* eslint-disable no-undef */
/// <reference path="./global.d.ts" />

// 用户脚本 API 可能由管理器注入为词法变量，并不是 globalThis 的属性。
const missingApis = [
	['GM_info', typeof GM_info],
	['GM_getTab', typeof GM_getTab],
	['GM_saveTab', typeof GM_saveTab],
	['GM_setValue', typeof GM_setValue],
	['GM_getValue', typeof GM_getValue],
	['unsafeWindow', typeof unsafeWindow],
	['GM_listValues', typeof GM_listValues],
	['GM_deleteValue', typeof GM_deleteValue],
	['GM_notification', typeof GM_notification],
	['GM_xmlhttpRequest', typeof GM_xmlhttpRequest],
	['GM_getResourceText', typeof GM_getResourceText],
	['GM_addValueChangeListener', typeof GM_addValueChangeListener],
	['GM_removeValueChangeListener', typeof GM_removeValueChangeListener]
].filter(([, type]) => type === 'undefined').map(([name]) => name);

if (missingApis.length) {
	const manager = typeof GM_info === 'undefined' ? '未知管理器' : GM_info.scriptHandler;
	const open = confirm(
		`OCS 启动检查未通过（${manager}），缺少接口：${missingApis.join(', ')}。` +
		'请检查脚本的 @grant 声明及管理器运行权限；如需查看安装教程，请点击确定。'
	);

	if (open) {
		window.location.href = 'https://docs.ocsjs.com/docs/script';
	}
	return;
}

const { start, definedProjects, CommonProject, RenderScript, logoSvg } = OCS;

const infos = GM_info;

(function () {
	'use strict';

	const projects = definedProjects();

	// 运行脚本
	start({
		projects: projects,
		renderConfig: {
			renderScript: RenderScript,
			styles: [STYLE],
			defaultPanelName: CommonProject.scripts.guide.namespace,
			title: `${logoSvg} OCS 全域名通用版 <span style="font-size: 12px; color: #969696;">v${infos.script.version}</span>`
		},
		updatePage:
			GM_info.scriptHandler === 'Tampermonkey'
				? 'https://greasyfork.org/zh-CN/scripts/481438'
				: 'https://scriptcat.org/zh-CN/script-show-page/1398'
	});
})();
