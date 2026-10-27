# Fork 来源、许可证与版权

本仓库是 [ocsjs/ocsjs](https://github.com/ocsjs/ocsjs) 的独立 fork，维护账户为
[Zhoukpvip666](https://github.com/Zhoukpvip666/ocsjs)，不代表上游官方发布。

- 初始基线：上游 `5.0` 分支，提交 `da5c0775a9d055724149ff505eae75bd85d334f9`。
- 上游作者：enncy；原始版权声明 `Copyright (c) 2022 enncy` 完整保留在 [LICENSE](LICENSE)。
- 上游代码继续采用 MIT 许可证；本 fork 新增的测试、文档和构建辅助代码同样采用 MIT。
- 新增内容版权：`Copyright (c) 2026 Zhoukpvip666`，仅适用于本 fork 新增内容。
- fork 不会转移上游代码版权。作者信息、上游来源和原有版权声明不应替换为 fork 维护者。

MIT 允许复制、修改和分发，要求在软件副本或实质部分中保留版权声明及许可文本。
分发源码时一并提供 `LICENSE`；分发构建产物时还应包含相应第三方依赖的许可与声明。
本 fork 的构建步骤将根许可证、依赖声明及本文件写入输出目录，并在用户脚本中嵌入声明。
依据：[上游 LICENSE](https://github.com/ocsjs/ocsjs/blob/5.0/LICENSE)、
[MIT 许可证原文](https://opensource.org/license/mit)。

依赖各自适用其许可证，不能因为主项目采用 MIT 就将全部依赖声明成 MIT。
构建所用依赖的实际版本、许可证和许可文件由 `scripts/collect-licenses.cjs` 生成到
`dist/THIRD-PARTY-NOTICES.txt`；缺少许可证文本时构建检查失败，须核查后再分发。
本次发现 `easy-us@1.0.15` 发布包缺少其 README 链接的 LICENSE 文件；依据包中 MIT
声明和原有作者归属补附了标准许可全文，依据和限制见
[easy-us 许可来源记录](third_party/easy-us-1.0.15/PROVENANCE.md)。

以上处理针对本次 fork 和示例构建的软件许可要求，不构成对商标、课程内容、外部题库或
第三方服务授权的授予。OCS 名称和作者标识用于注明来源。
