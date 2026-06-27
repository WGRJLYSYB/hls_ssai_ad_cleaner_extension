# 🍇 葡萄广告拦截器 (HLS SSAI Ad Cleaner)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://developer.chrome.com/docs/extensions)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

专门针对 HLS (m3u8) 视频流的 **SSAI 广告拦截工具**。利用递归 Blob 代理技术和动态帧率指纹算法，深度净化主索引与变体索引，无损过滤隐藏广告。

## ✨ 功能特性

- 🎯 **精准拦截**: 专门针对 HLS 流媒体中的服务器端广告插入 (SSAI)
- 🔍 **深度净化**: 递归处理 m3u8 索引文件和所有子资源
- 🚀 **高性能**: 基于帧率指纹识别算法，快速定位广告片段
- 🔒 **隐私保护**: 纯本地运行，无需后端服务，不收集用户数据
- 🌐 **广泛兼容**: 支持所有使用 HLS 协议的流媒体网站
- ⚙️ **灵活配置**: 支持自定义排除站点列表

## 🛠️ 技术架构

### 核心技术
- **Manifest V3**: 采用最新的 Chrome 扩展规范
- **Blob URL 代理**: 通过递归 Blob 转换绕过浏览器原生请求限制
- **帧率指纹算法**: 智能识别广告片段的特征模式
- **双世界注入**: 结合 ISOLATED 和 MAIN world 实现完整 API 劫持

### 项目结构

```
hls_ssai_ad_cleaner_extension/
├── src/
│   ├── content.js          # 核心广告过滤逻辑（MAIN world）
│   └── loader.js           # 加载器脚本（ISOLATED world）
├── lib/
│   └── hls.min.js          # HLS.js 播放器库
├── assets/
│   └── icons/              # 扩展图标资源
├── manifest.json           # 扩展清单文件
├── rules.json              # CORS 规则配置（自动处理跨域请求）
├── excluded_sites.json     # 排除站点列表
├── build/                  # 构建脚本
├── dist/                   # 构建输出目录
└── package.json            # 项目配置
```

## 📦 安装方法

### 方式一：从源码安装（推荐开发者）

1. **克隆仓库**
   ```bash
   git clone https://github.com/WGRJLYSYB/hls_ssai_ad_cleaner_extension.git
   cd hls_ssai_ad_cleaner_extension
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建扩展**
   ```bash
   # 开发模式（代码不混淆）
   npm run dev
   
   # 生产构建（包含代码混淆和压缩）
   npm run package
   ```

4. **加载到浏览器**
   - 打开 Chrome/Edge 浏览器
   - 访问 `chrome://extensions/` 或 `edge://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录（开发模式）或 `dist/` 目录（生产模式）

### 方式二：直接使用构建产物

1. 下载最新发布的 `.zip` 包
2. 解压到本地目录
3. 按照上述第 4 步加载到浏览器

## 🚀 使用说明

### 基本使用

安装完成后，扩展会自动运行：

1. 访问任何使用 HLS 流媒体的网站
2. 扩展会自动检测并拦截广告片段
3. 无需额外配置，开箱即用

### 高级配置

#### 排除特定网站

如果你希望某些网站不使用广告拦截功能，可以编辑 [`excluded_sites.json`](excluded_sites.json) 文件添加排除规则：

```json
[
  "*://*.example.com/*",
  "*://trusted-site.org/*"
]
```

该文件使用标准的 Chrome Extension 匹配模式语法，支持通配符 `*`。

## 🔧 开发指南

### 可用脚本

```bash
# 开发模式 - 直接加载项目根目录
npm run dev

# 代码混淆
npm run obfuscate

# 构建扩展
npm run build

# 打包发布（混淆 + 构建）
npm run package

# 清理构建产物
npm run clean
```

### 开发流程

1. **修改源代码**
   - 主要逻辑在 [`src/content.js`](src/content.js)
   - 加载器在 [`src/loader.js`](src/loader.js)

2. **测试更改**
   ```bash
   npm run dev
   ```
   在浏览器中重新加载扩展

3. **生产构建**
   ```bash
   npm run package
   ```
   生成的文件位于 `dist/` 目录

### 调试技巧

- 打开浏览器开发者工具查看控制台日志
- 搜索 `[葡萄AdCleaner]` 前缀的日志信息
- 检查 Network 面板观察 m3u8 请求

## 📋 权限说明

本扩展需要以下权限：

- **`declarativeNetRequest`**: 用于声明式网络请求规则，处理 CORS 问题
- **`<all_urls>`**: 需要在所有网站上运行以检测和拦截 HLS 广告
- **Web Accessible Resources**: 允许页面访问内部的 hls.js 库

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 贡献步骤

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循现有的代码风格
- 添加必要的注释
- 确保构建成功

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## ⚠️ 免责声明

- 本工具仅供学习和研究使用
- 请遵守相关法律法规和网站使用条款
- 作者不对使用本工具产生的任何后果负责
- 建议在合法合规的前提下使用

## 🙏 致谢

- [hls.js](https://github.com/video-dev/hls.js) - HLS 播放器库
- [Terser](https://github.com/terser/terser) - JavaScript 压缩工具
- [Archiver](https://github.com/archiverjs/node-archiver) - ZIP 打包工具

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
