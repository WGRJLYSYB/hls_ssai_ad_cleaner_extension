/*
HLS SSAI Ad Cleaner — Browser extension for cleaning SSAI ads in HLS video streams
Copyright (C) 2026 WGRJLYSYB

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License v3.0.
See LICENSE file in repository root for full license text.
*/

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// 源文件和输出目录配置
const PROJECT_ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(PROJECT_ROOT, 'src');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

// 需要混淆的文件列表（相对于 src/ 目录）
const filesToObfuscate = [
    'content.js',
    'loader.js'
];

// Terser 混淆配置
const terserOptions = {
    compress: {
        // 启用所有压缩优化
        dead_code: true,          // 删除死代码
        unused: true,             // 删除未使用的变量和函数
        drop_console: false,      // 保留 console（调试用，生产可改为 true）
        pure_funcs: [],           // 指定纯函数
        passes: 2,                // 多次压缩以获得更好效果
    },
    mangle: {
        // 变量名混淆
        toplevel: true,           // 混淆顶层作用域的变量名
        properties: {
            // 混淆属性名（谨慎使用，可能破坏 API）
            regex: /^_/           // 只混淆以下划线开头的私有属性
        }
    },
    output: {
        // 输出格式
        comments: false,          // 删除所有注释
        beautify: false,          // 不美化输出
    }
};

/**
 * 确保输出目录存在
 */
function ensureDistDir() {
    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
        console.log(`📁 创建输出目录: ${DIST_DIR}`);
    }
}

/**
 * 复制文件到 dist 目录
 */
function copyFile(srcPath, distPath) {
    const content = fs.readFileSync(srcPath);
    fs.writeFileSync(distPath, content);
}

/**
 * 复制并处理 manifest.json（自动注入 exclude_matches）
 */
function copyManifestJson() {
    const srcPath = path.join(PROJECT_ROOT, 'manifest.json');
    const distPath = path.join(DIST_DIR, 'manifest.json');
    const excludedSitesPath = path.join(PROJECT_ROOT, 'excluded_sites.json');
    
    if (!fs.existsSync(srcPath)) {
        console.warn(`⚠️  警告: manifest.json 不存在，跳过`);
        return;
    }
    
    // 读取排除列表
    let excludedSites = [];
    if (fs.existsSync(excludedSitesPath)) {
        try {
            excludedSites = JSON.parse(fs.readFileSync(excludedSitesPath, 'utf8'));
            console.log(`📋 已加载 ${excludedSites.length} 个排除站点`);
        } catch (error) {
            console.error(` 读取 excluded_sites.json 失败:`, error.message);
        }
    }
    
    // 读取 manifest.json
    let content = fs.readFileSync(srcPath, 'utf8');
    const manifest = JSON.parse(content);
    
    // 更新所有 content_scripts 的 exclude_matches
    if (manifest.content_scripts && Array.isArray(manifest.content_scripts)) {
        manifest.content_scripts.forEach((script, index) => {
            script.exclude_matches = excludedSites;
        });
        console.log(`✅ 已更新 ${manifest.content_scripts.length} 个 content_scripts 的 exclude_matches`);
    }
    
    // 写回 dist/manifest.json
    fs.writeFileSync(distPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`📄 复制并更新: manifest.json`);
}

/**
 * 递归复制目录
 */
function copyDirectory(srcDir, distDir) {
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    const items = fs.readdirSync(srcDir);
    
    for (const item of items) {
        const srcPath = path.join(srcDir, item);
        const distPath = path.join(distDir, item);
        
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
            copyDirectory(srcPath, distPath);
        } else {
            copyFile(srcPath, distPath);
        }
    }
}

/**
 * 混淆单个文件并输出到 dist/src 目录
 */
async function obfuscateFile(relativePath) {
    const srcPath = path.join(SOURCE_DIR, relativePath);
    // 保持 src/ 目录结构：dist/src/content.js
    const distPath = path.join(DIST_DIR, 'src', relativePath);
    
    if (!fs.existsSync(srcPath)) {
        console.error(`❌ 源文件不存在: ${srcPath}`);
        return false;
    }

    console.log(`📝 正在处理: ${relativePath}`);
    const code = fs.readFileSync(srcPath, 'utf8');

    try {
        // 目标目录已在 prepareDistDirectory 中创建

        // 使用 Terser 进行压缩和混淆
        const result = await minify(code, terserOptions);

        if (result.error) {
            throw result.error;
        }

        // 写入混淆后的代码到 dist 目录
        fs.writeFileSync(distPath, result.code, 'utf8');
        
        // 计算压缩率
        const originalSize = Buffer.byteLength(code, 'utf8');
        const compressedSize = Buffer.byteLength(result.code, 'utf8');
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
        
        console.log(`✅ 完成: ${relativePath} (${ratio}% 压缩率)`);
        console.log(`   输出至: ${distPath}`);
        return true;
    } catch (error) {
        console.error(`❌ 混淆失败: ${relativePath}`);
        console.error(error.message);
        return false;
    }
}

/**
 * 准备 dist 目录：复制不需要混淆的文件
 */
function prepareDistDirectory() {
    console.log('\n📦 准备 dist 目录...\n');
    
    // 需要直接复制的文件（从项目根目录）
    const staticFiles = [
        'rules.json',
        'popup.html',
        'popup.js',
        'background.js',
        'content-bootstrap.js'
    ];
    
    // 需要直接复制的目录
    const staticDirs = [
        'lib',
        'assets',
        '_locales'
    ];
    
    // 创建 src/ 目录结构（用于存放混淆后的 JS 文件）
    const srcDir = path.join(DIST_DIR, 'src');
    if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
    }
    
    // 特殊处理 manifest.json（保持原样，因为 dist/ 中也会保留 src/ 结构）
    copyManifestJson();
    
    // 复制其他静态文件
    for (const file of staticFiles) {
        const srcPath = path.join(PROJECT_ROOT, file);
        const distPath = path.join(DIST_DIR, file);
        
        if (fs.existsSync(srcPath)) {
            copyFile(srcPath, distPath);
            console.log(`📄 复制: ${file}`);
        } else {
            console.warn(`⚠️  警告: ${file} 不存在，跳过`);
        }
    }
    
    // 复制静态目录
    for (const dir of staticDirs) {
        const srcPath = path.join(PROJECT_ROOT, dir);
        const distPath = path.join(DIST_DIR, dir);
        
        if (fs.existsSync(srcPath)) {
            copyDirectory(srcPath, distPath);
            console.log(`📁 复制目录: ${dir}/`);
        } else {
            console.warn(`⚠️  警告: ${dir}/ 不存在，跳过`);
        }
    }
}

/**
 * 清空目录内容，但保留目录本身
 */
function emptyDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return; // 目录不存在，无需清空
    }
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // 递归删除子目录
            fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
            // 删除文件
            fs.unlinkSync(fullPath);
        }
    }
}

/**
 * 确保输出目录存在
 */
function ensureDistDir() {
    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
        console.log(`📁 创建输出目录: ${DIST_DIR}`);
    } else {
        // 清空现有内容
        emptyDirectory(DIST_DIR);
        console.log(`🧹 已清空 dist/ 目录内容`);
    }
}

async function main() {
    console.log('🚀 开始代码混淆和构建...\n');
    
    // 步骤1: 清理并创建 dist 目录（保留目录结构，只清空内容）
    ensureDistDir();
    
    // 步骤2: 复制静态资源
    prepareDistDirectory();
    
    console.log('\n🔧 开始混淆 JavaScript 文件...\n');
    
    // 步骤3: 混淆 JS 文件
    let successCount = 0;
    for (const file of filesToObfuscate) {
        const success = await obfuscateFile(file);
        if (success) successCount++;
    }
    
    console.log(`\n✨ 构建完成！`);
    console.log(`📊 成功处理 ${successCount}/${filesToObfuscate.length} 个文件`);
    console.log(`📁 输出目录: ${DIST_DIR}`);
    console.log('\n💡 提示：');
    console.log('   - 原始代码未被修改，可继续开发');
    console.log('   - 混淆后的代码位于 dist/ 目录');
    console.log('   - 可直接加载 dist/ 目录测试插件');
    console.log('   - 上传商店前请打包 dist/ 目录为 ZIP\n');
}

main().catch(err => {
    console.error('💥 发生错误:', err);
    process.exit(1);
});
