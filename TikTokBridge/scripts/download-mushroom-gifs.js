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
    'https://media.giphy.com/media/GR1rLRFEaxnR9sfR3z/giphy.gif',
    // User flagged: không phù hợp làm nhân vật sàn nhảy
    'https://media.giphy.com/media/1ynmJnZbDvTBJtho1K/giphy.gif',
    'https://media.giphy.com/media/dvCPWYNNaaQpjrpl0d/giphy.gif',
    'https://media.giphy.com/media/dvCPWYNNaaQpjrpl0d/200.gif',
    'https://media.giphy.com/media/1NRaZ4REktLkjUi5p7/giphy.gif'
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
    const candidates = [url];
    // Giphy full GIFs đôi khi >1.5MB — thử bản nhỏ hơn
    const giphyFull = url.match(/^(https:\/\/media\.giphy\.com\/media\/[^/]+)\/giphy\.gif$/i);
    if (giphyFull) {
        candidates.push(`${giphyFull[1]}/200.gif`, `${giphyFull[1]}/200w.gif`, `${giphyFull[1]}/giphy-preview.gif`);
    }

    let lastError = new Error('Không tải được GIF');
    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate, {
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
                    Referer: referer || 'https://giphy.com/'
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
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

async function loadEnabledCatalogs() {
    const raw = JSON.parse(await fs.readFile(assetsConfigPath, 'utf8'));
    const sources = Array.isArray(raw.sources) ? raw.sources : [];
    const enabled = sources.filter(source => source?.type === 'url-manifest' && source?.enabled === true);
    if (enabled.length === 0) {
        console.warn('Không có source url-manifest nào đang bật trong config/assets.json.');
        console.warn('Bật source trên tab Assets (Control Panel) rồi lưu, hoặc sửa assets.json.');
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

function filenamePrefix(sourceId) {
    const id = String(sourceId || 'gif').toLowerCase();
    if (id === 'gif-catalog') return 'mushroom_dance';
    if (id === 'gif-mushroom') return 'mushroom_dance';
    if (id === 'gif-free-popular') return 'free_dance';
    return id.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'gif';
}

async function loadExistingManifest() {
    try {
        const raw = JSON.parse(await fs.readFile(path.join(outputDir, 'sources.json'), 'utf8'));
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

async function nextAvailableFilename(prefix, startIndex) {
    let index = startIndex;
    while (true) {
        const filename = `${prefix}_${String(index).padStart(2, '0')}.gif`;
        const target = path.join(outputDir, filename);
        try {
            await fs.access(target);
            index += 1;
        } catch {
            return { filename, target, index };
        }
    }
}

async function main() {
    const force = process.argv.includes('--force');
    const prune = process.argv.includes('--prune');
    const catalogs = await loadEnabledCatalogs();
    if (catalogs.length === 0) {
        process.exitCode = 1;
        return;
    }

    await fs.mkdir(outputDir, { recursive: true });
    const previousManifest = await loadExistingManifest();
    const manifestByFile = new Map(previousManifest.map(item => [item.filename, item]));
    const contentHashes = new Set(
        previousManifest.map(item => item.sha256).filter(Boolean)
    );
    // hash các file đang có trên đĩa (kể cả chưa nằm trong sources.json)
    for (const name of await fs.readdir(outputDir)) {
        if (!/\.gif$/i.test(name)) continue;
        try {
            const buffer = await fs.readFile(path.join(outputDir, name));
            if (isGif(buffer)) contentHashes.add(crypto.createHash('sha256').update(buffer).digest('hex'));
        } catch {
            // ignore
        }
    }

    let attempted = 0;
    let written = 0;
    let skipped = 0;

    for (const catalog of catalogs) {
        const prefix = filenamePrefix(catalog.id);
        let sequence = 1;
        for (const source of catalog.entries) {
            const urls = Array.isArray(source.urls) ? source.urls : [];
            for (const url of urls) {
                attempted += 1;
                if (source.staticOnly) {
                    console.warn(`− bỏ qua nguồn chỉ có ảnh GIF một frame (${url})`);
                    skipped += 1;
                    continue;
                }
                if (excludedAssetUrls.has(url)) {
                    console.warn(`− bỏ qua (blacklist): ${url}`);
                    skipped += 1;
                    continue;
                }

                // đã tải URL này trước đó → giữ nguyên file cũ
                const known = [...manifestByFile.values()].find(item => item.assetUrl === url);
                if (known && !force) {
                    console.warn(`= ${known.filename}: đã có URL này, bỏ qua`);
                    skipped += 1;
                    continue;
                }

                const { filename, target, index } = await nextAvailableFilename(prefix, sequence);
                sequence = index + 1;

                try {
                    const buffer = await download(url, source.page || '');
                    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
                    if (contentHashes.has(hash) && !force) {
                        console.warn(`= bỏ qua nội dung trùng (${url})`);
                        skipped += 1;
                        continue;
                    }

                    if (!force) {
                        try {
                            await fs.access(target);
                            console.warn(`= ${filename}: đã tồn tại, không ghi đè (dùng --force nếu chắc chắn)`);
                            skipped += 1;
                            continue;
                        } catch {
                            // ok to write
                        }
                    }

                    contentHashes.add(hash);
                    await fs.writeFile(target, buffer);
                    const entry = {
                        filename,
                        bytes: buffer.length,
                        sha256: hash,
                        sourcePage: source.page || '',
                        assetUrl: url,
                        sourceId: catalog.id
                    };
                    manifestByFile.set(filename, entry);
                    written += 1;
                    console.log(`✓ ${filename} (${Math.round(buffer.length / 1024)} KB)`);
                } catch (error) {
                    console.warn(`✗ ${filename}: ${error.message}`);
                    skipped += 1;
                }
            }
        }
    }

    // chỉ prune khi user chủ động yêu cầu
    if (prune) {
        const keep = new Set(manifestByFile.keys());
        for (const filename of await fs.readdir(outputDir)) {
            if (!/^(mushroom_dance|free_dance)_\d+\.gif$/i.test(filename)) continue;
            if (keep.has(filename)) continue;
            await fs.rm(path.join(outputDir, filename), { force: true });
            console.warn(`⌫ đã xóa ${filename} (--prune)`);
        }
    }

    const manifest = [...manifestByFile.values()].sort((a, b) =>
        String(a.filename).localeCompare(String(b.filename), undefined, { numeric: true })
    );
    await fs.writeFile(
        path.join(outputDir, 'sources.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
        'utf8'
    );

    console.log(`Xong: +${written} mới, ${skipped} bỏ qua, ${manifest.length} tổng trong sources.json`);
    console.log('Mặc định không ghi đè / không xóa file cũ. Dùng --force hoặc --prune khi thật sự cần.');
    if (written === 0 && attempted > 0 && manifest.length === 0) process.exitCode = 1;
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
