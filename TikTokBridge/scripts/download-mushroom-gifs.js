const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const outputDir = path.join(__dirname, '..', 'assets', 'gifs');
const assetsConfigPath = path.join(__dirname, '..', 'config', 'assets.json');
const maxGifBytes = 1_500_000;

const excludedAssetUrls = new Set([
    'https://wx4.sinaimg.cn/large/ceeb653ely1fmnq7xvsh6g206o06oahu.gif',
    'https://wx1.sinaimg.cn/large/a6d0124fly1ff2i021t0wg20e607vn8n.gif',
    'https://5b0988e595225.cdn.sohucs.com/images/20180523/13fd8cdc1d31482caa2d24d0d76c8cde.gif',
    'https://img.230558.xyz/biaoqing/201807/7d606893c6c54a406953c4ae4a2bdc23.gif',
    'https://i.ecywang.com/upload/1/img2.baidu.com/it/u%3D4117748196%2C225280191%26fm%3D253%26fmt%3Dauto%26app%3D138%26f%3DGIF?h=300&w=300',
    'https://wx2.sinaimg.cn/large/006BkP2Hly1fds70lm93hg308c08c0ve.gif',
    'https://wx1.sinaimg.cn/large/814268e3ly1fmonhho9mwg20b40b4di5.gif',
    'https://wx3.sinaimg.cn/large/62528dc5gy1fitgj8ollrg206o06omy8.gif',
    'https://wx1.sinaimg.cn/large/62528dc5gy1ffoigkh2dxg206o06omyd.gif',
    'https://wx2.sinaimg.cn/large/006BkP2Hly1fds70ewa01g304x06bq39.gif',
    'https://wx1.sinaimg.cn/large/62528dc5gy1fdufbcll3ug207v07vdgg.gif',
    'https://wx1.sinaimg.cn/large/62528dc5gy1fduf8botaag207v07r3zc.gif',
    'https://wx3.sinaimg.cn/large/006BkP2Hly1fds70h3ue3g304x04xjtz.gif',
    'https://media.giphy.com/media/GR1rLRFEaxnR9sfR3z/giphy.gif'
]);

function isGif(buffer) {
    const signature = buffer.subarray(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a';
}

function skipGifSubBlocks(buffer, start) {
    let offset = start;
    while (offset < buffer.length) {
        const size = buffer[offset];
        offset += 1;
        if (size === 0) return offset;
        offset += size;
    }
    return buffer.length;
}

function countGifFrames(buffer) {
    if (!isGif(buffer) || buffer.length < 13) return 0;

    const globalColorTable = (buffer[10] & 0x80) !== 0;
    const globalColorTableSize = 3 * (2 ** ((buffer[10] & 0x07) + 1));
    let offset = 13 + (globalColorTable ? globalColorTableSize : 0);
    let frames = 0;

    while (offset < buffer.length) {
        const marker = buffer[offset];
        offset += 1;

        if (marker === 0x3b) break;
        if (marker === 0x21) {
            offset += 1;
            offset = skipGifSubBlocks(buffer, offset);
            continue;
        }
        if (marker !== 0x2c || offset + 9 > buffer.length) break;

        const localColorTable = (buffer[offset + 8] & 0x80) !== 0;
        const localColorTableSize = 3 * (2 ** ((buffer[offset + 8] & 0x07) + 1));
        offset += 9 + (localColorTable ? localColorTableSize : 0);
        if (offset >= buffer.length) break;

        offset += 1;
        offset = skipGifSubBlocks(buffer, offset);
        frames += 1;
    }

    return frames;
}

function hasTransparentFrame(buffer) {
    for (let index = 0; index < buffer.length - 4; index += 1) {
        if (
            buffer[index] === 0x21 &&
            buffer[index + 1] === 0xf9 &&
            buffer[index + 2] === 0x04 &&
            (buffer[index + 3] & 0x01) === 0x01
        ) {
            return true;
        }
    }
    return false;
}

async function download(url, referer) {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
            Referer: referer
        },
        signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!isGif(buffer)) throw new Error('Nội dung tải về không phải GIF');
    if (buffer.length > maxGifBytes) throw new Error('GIF quá nặng để dùng cho sàn đông người');
    if (countGifFrames(buffer) < 2) throw new Error('GIF chỉ có một frame tĩnh');
    if (!hasTransparentFrame(buffer)) throw new Error('GIF không có nền trong suốt');
    return buffer;
}

async function loadEnabledCatalogs() {
    const raw = JSON.parse(await fs.readFile(assetsConfigPath, 'utf8'));
    const sources = Array.isArray(raw.sources) ? raw.sources : [];
    const enabled = sources.filter(source => source?.type === 'url-manifest' && source?.enabled === true);
    if (enabled.length === 0) {
        console.warn('Không có source url-manifest nào đang bật trong config/assets.json.');
        console.warn('Bật source "gif-catalog" trên tab Assets (Control Panel) rồi lưu, hoặc sửa assets.json.');
        return [];
    }

    const catalogs = [];
    for (const source of enabled) {
        const manifestRel = String(source.manifest || '').trim();
        if (!manifestRel) {
            console.warn(`− ${source.id}: thiếu manifest`);
            continue;
        }
        const manifestPath = path.isAbsolute(manifestRel)
            ? manifestRel
            : path.join(__dirname, '..', manifestRel);
        try {
            const catalog = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
            const entries = Array.isArray(catalog.sources) ? catalog.sources : Array.isArray(catalog) ? catalog : [];
            catalogs.push({ id: source.id, entries });
            console.log(`Nguồn ${source.id}: ${entries.length} nhóm URL từ ${manifestRel}`);
        } catch (error) {
            console.warn(`− ${source.id}: không đọc được manifest (${error.message})`);
        }
    }
    return catalogs;
}

async function main() {
    const catalogs = await loadEnabledCatalogs();
    if (catalogs.length === 0) {
        process.exitCode = 1;
        return;
    }

    await fs.mkdir(outputDir, { recursive: true });
    const manifest = [];
    const contentHashes = new Set();
    let index = 0;

    for (const catalog of catalogs) {
        for (const source of catalog.entries) {
            const urls = Array.isArray(source.urls) ? source.urls : [];
            for (const url of urls) {
                index += 1;
                const filename = `mushroom_dance_${String(index).padStart(2, '0')}.gif`;
                const target = path.join(outputDir, filename);
                if (source.staticOnly) {
                    console.warn(`− ${filename}: bỏ qua nguồn chỉ có ảnh GIF một frame`);
                    continue;
                }
                if (excludedAssetUrls.has(url)) {
                    console.warn(`− ${filename}: bỏ qua asset không phù hợp làm nhân vật`);
                    continue;
                }
                try {
                    const buffer = await download(url, source.page || '');
                    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
                    if (contentHashes.has(hash)) {
                        console.warn(`= ${filename}: bỏ qua nội dung trùng`);
                        continue;
                    }
                    contentHashes.add(hash);
                    await fs.writeFile(target, buffer);
                    manifest.push({
                        filename,
                        bytes: buffer.length,
                        sha256: hash,
                        sourcePage: source.page || '',
                        assetUrl: url,
                        sourceId: catalog.id
                    });
                    console.log(`✓ ${filename} (${Math.round(buffer.length / 1024)} KB)`);
                } catch (error) {
                    try {
                        const previous = await fs.readFile(target);
                        if (
                            !isGif(previous) ||
                            previous.length > maxGifBytes ||
                            countGifFrames(previous) < 2 ||
                            !hasTransparentFrame(previous)
                        ) {
                            throw new Error();
                        }
                        const hash = crypto.createHash('sha256').update(previous).digest('hex');
                        if (contentHashes.has(hash)) throw new Error();
                        contentHashes.add(hash);
                        manifest.push({
                            filename,
                            bytes: previous.length,
                            sha256: hash,
                            sourcePage: source.page || '',
                            assetUrl: url,
                            sourceId: catalog.id
                        });
                        console.warn(`≈ ${filename}: giữ bản hợp lệ đã tải trước đó`);
                    } catch {
                        console.warn(`✗ ${filename}: ${error.message}`);
                    }
                }
            }
        }
    }

    await fs.writeFile(
        path.join(outputDir, 'sources.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
        'utf8'
    );

    const acceptedFiles = new Set(manifest.map(item => item.filename));
    const outputFiles = await fs.readdir(outputDir);
    for (const filename of outputFiles) {
        if (/^mushroom_dance_\d+\.gif$/.test(filename) && !acceptedFiles.has(filename)) {
            await fs.rm(path.join(outputDir, filename));
        }
    }

    console.log(`Đã tải ${manifest.length}/${index} GIF vào ${outputDir}`);
    if (manifest.length === 0) process.exitCode = 1;
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
