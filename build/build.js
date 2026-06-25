const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 配置：源目录（dist）和输出文件
const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const OUTPUT_ZIP = path.join(PROJECT_ROOT, 'extension-package.zip');

// 需要排除的文件/文件夹模式（在 dist 目录内）
const excludePatterns = [
    '.git',
    '.gitignore',
    '_metadata',
    '.vscode',
    'node_modules',
    '*.zip'
];

function shouldExclude(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(normalizedPath);
        }
        return normalizedPath.includes(pattern);
    });
}

function addFilesToArchive(archive, sourceDir, targetDir = '') {
    const items = fs.readdirSync(sourceDir);
    
    for (const item of items) {
        const fullPath = path.join(sourceDir, item);
        const relativePath = path.join(targetDir, item);
        
        // 检查是否应该排除
        if (shouldExclude(relativePath)) {
            console.log(`⏭️  跳过: ${relativePath}`);
            continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // 递归添加目录内容
            addFilesToArchive(archive, fullPath, relativePath);
        } else {
            // 添加文件
            archive.file(fullPath, { name: relativePath });
            console.log(`📦 添加: ${relativePath}`);
        }
    }
}

async function createZipPackage() {
    // 检查 dist 目录是否存在
    if (!fs.existsSync(DIST_DIR)) {
        console.error('❌ 错误: dist 目录不存在！');
        console.error('💡 请先运行: npm run obfuscate\n');
        process.exit(1);
    }
    
    // 删除旧的 ZIP 文件
    if (fs.existsSync(OUTPUT_ZIP)) {
        fs.unlinkSync(OUTPUT_ZIP);
        console.log('🗑️  已删除旧的 ZIP 包\n');
    }
    
    console.log('🚀 开始打包扩展...\n');
    console.log(`📁 源目录: ${DIST_DIR}`);
    console.log(`📦 输出文件: ${OUTPUT_ZIP}\n`);
    
    const output = fs.createWriteStream(OUTPUT_ZIP);
    const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
    });
    
    return new Promise((resolve, reject) => {
        output.on('close', () => {
            const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`\n✅ 打包完成！`);
            console.log(`📊 总大小: ${sizeInMB} MB`);
            console.log(`📁 输出文件: ${OUTPUT_ZIP}\n`);
            console.log('💡 下一步：');
            console.log('   1. 测试：加载 dist/ 目录到浏览器验证功能');
            console.log('   2. 上传：将 extension-package.zip 提交到应用商店\n');
            resolve();
        });
        
        archive.on('error', (err) => {
            console.error('❌ 打包失败:', err);
            reject(err);
        });
        
        archive.pipe(output);
        
        // 添加 dist 目录的所有内容
        addFilesToArchive(archive, DIST_DIR);
        
        archive.finalize();
    });
}

// 执行打包
createZipPackage().catch(err => {
    console.error('💥 发生错误:', err);
    process.exit(1);
});
