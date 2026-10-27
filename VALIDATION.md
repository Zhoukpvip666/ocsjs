# 本次 fork 验证记录

日期：2026-10-27（北京时间）。

- fork：[Zhoukpvip666/ocsjs](https://github.com/Zhoukpvip666/ocsjs)。
- 上游：[ocsjs/ocsjs](https://github.com/ocsjs/ocsjs)，`5.0` 分支。
- 基线提交：`da5c0775a9d055724149ff505eae75bd85d334f9`，包版本 `5.2.3`。
- 环境：Windows、Node.js `24.19.0`、pnpm `11.25.0`、独立无头 Microsoft Edge。
- 浏览器实际版本写入本机 `.temp/local-smoke-result.json`。

## 结果

共 **191 项检查通过，0 项失败**，完整构建通过。

| 检查 | 结果 | 覆盖范围 |
| --- | --- | --- |
| 上游匹配算法 | 164 / 164 | 单选、多选、相近选项消歧、判断、填空 |
| 独立 Edge 本地示例 | 22 / 22 | 实际 OCSWorker、GET/POST 题库请求、DOM 读取与填写、启动前暂停/恢复、错误响应 |
| 软件许可与版权产物 | 5 / 5 | 上游 LICENSE 未改写、输出目录声明、7 项实际打包依赖声明、独立 JS/用户脚本内嵌声明、easy-us 来源 |
| 完整构建 | 通过 | utils/core/scripts TypeScript、Vite、LESS、标准/通用/调试用户脚本 |

浏览器用例直接加载本次构建的 `dist/core.js`，调用 OCS 的
`OCSWorker`、`defaultAnswerWrapperHandler` 与默认题型解析器；测试没有另写答案匹配算法。
网页选择器和点击/输入回调是本地示例适配器，不是学习通的真实平台适配器。

## 示例题与预期

GET 与 POST 两种方式分别验证下列 8 个例子。

| 示例 | 预期与实测 |
| --- | --- |
| 中国首都，选项乱序 | 选择第 3 项“北京” |
| 多选质数，文本答案 `2#3#5` | 选择值为 5、2、3 的选项 |
| 地球围绕太阳运行 | 选择“正确” |
| 两空填空 | 按顺序填入“1949”“北京” |
| 多选字母答案 `AC` | 选择第 1、3 项 |
| 带 `A.`/`B.` 前缀的选项 | 选择“B. 4” |
| 题库未收录 | 保留空白，标记未匹配 |
| 答案不在选项中 | 保留空白，标记未匹配 |

界面中“6 题已填写，2 题未匹配”是预期结果。它验证了已知题库答案的匹配与填写，
不能代表真实未知题目的答案准确率。

附加检查：GET/POST 中的题目、题型、选项变量正确；在初始化钩子暂停后不发起请求、
不填写，继续后完成；题库返回无效 JSON 时记录错误且无答案；浏览器无未捕获错误。
这不证明运行中已有请求的即时取消能力。

## 本次处理

### 后续：Tampermonkey 启动检查修复（2026-10-27）

实际页面出现“不支持 Tampermonkey”弹窗后，定位到三种入口通过
`Reflect.get(globalThis, api)` 检查 API；管理器将 API 注入为脚本作用域变量时会被漏检。
已改为直接对 API 标识符执行 `typeof`，并在接口确实缺失时列出具体名称。
新增 `pnpm test:startup`：三种入口各覆盖作用域注入、全局属性注入、缺失请求 API、
缺失 GM_info，共 **12 项通过**。这些是可复现的隔离兼容测试；用户当前 Edge 页面
仍需替换脚本后实测，不能据此宣称所有真实平台流程已验证。

后续用户控制台报告入口附近 `Missing initializer in destructuring declaration`。
本地完整文件的语法检查与独立浏览器加载均通过，尚未取得用户实际安装副本，不能
断言是管理器缺陷或复制损坏。现已将三种入口的顶层对象解构改为直接访问 `OCS.*`。
重建后通过 12 项启动测试、164 项匹配测试及 5 项许可检查；隔离 Edge 中的完整脚本
仍可挂载面板。新增本机安装地址 <http://127.0.0.1:8788/install/ocs.user.js>，减少手动
复制整份文件的步骤。该地址由 `pnpm example:local` 提供，真实管理器安装仍待用户确认。

- 保留根 MIT 许可和 `Copyright (c) 2022 enncy`，新增 [fork 来源说明](FORK-NOTICE.md)。
- 用户脚本名称和 namespace/source 标明独立 fork；原作者字段保留 enncy。
- 按实际打包模块收集 7 项第三方依赖的完整许可文件，保留各自 MIT、ISC、
  DOMPurify 的 MPL-2.0 OR Apache-2.0 等声明，不统一改写为 MIT。
- `easy-us@1.0.15` 缺少 LICENSE 的情况、补附文本和证据详见
  [来源记录](third_party/easy-us-1.0.15/PROVENANCE.md)。补附依据是发布包的 MIT 声明和
  README 原作者归属，不冒充缺失的原始许可文件。
- 修复 pnpm 11 构建白名单兼容、工作区 Vite/LESS 路径、utils 首次编译顺序、
  scripts 缺失的 lodash 类型依赖，使普通 `pnpm build` 可完成。

## 如何复现

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm test:local
pnpm test:licenses
pnpm example:local
```

交互示例地址：<http://127.0.0.1:8788/>。Windows 自动寻找 Edge；其他安装位置或系统可
设置 `OCS_EDGE_PATH` 指向 Chromium/Edge 可执行文件后再运行 `pnpm test:local`。
本地测试无需账号、题库密钥或 AI 密钥。截图和机器可读结果在忽略目录 `.temp/`。

标准安装文件：`dist/ocs.user.js`，适用于支持的油猴/脚本猫管理器；它不是 Edge 原生扩展。
`ocs.dev.user.js` 包含本机 file URL，仅供开发，不应作为可移植安装包分发。

## 验证边界

本次未在已登录学习通、智慧树等真实站点运行，未验证课程视频、时长记录、视频弹题、
真实平台翻页与交卷、脚本管理器 GM API、外部题库、AI 或联网查证来源。
本地示例仅展示和验证已知答案的通用流程，未提交任何真实课程作业。
