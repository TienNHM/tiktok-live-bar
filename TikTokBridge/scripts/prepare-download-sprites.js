/**
 * Chuẩn hóa pack nhảy/múa trong /download → TikTokBridge/assets/spritesheets/sets
 * rồi ghi sets.json để npm run import:sprites.
 *
 * Chỉ nhận pack phù hợp TikTok dance bar (dance loops), không import monster/RPG/combat.
 */
const fs = require('fs/promises');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');
const downloadDir = path.join(repoRoot, 'download');
const setsRoot = path.join(__dirname, '..', 'assets', 'spritesheets');
const outSets = path.join(setsRoot, 'sets');
const setsJsonPath = path.join(setsRoot, 'sets.json');

async function rmrf(dir) {
    await fs.rm(dir, { recursive: true, force: true });
}

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

async function copyFilteredPngs(srcDir, destDir, predicate) {
    await ensureDir(destDir);
    const files = (await fs.readdir(srcDir))
        .filter(name => /\.png$/i.test(name) && predicate(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (files.length < 2) throw new Error(`Cần ≥2 PNG trong ${srcDir} (lọc còn ${files.length})`);
    let i = 0;
    for (const name of files) {
        const dest = path.join(destDir, `${String(i).padStart(3, '0')}.png`);
        await fs.copyFile(path.join(srcDir, name), dest);
        i += 1;
    }
    return i;
}

async function preparePixelDance() {
    const srcRoot = path.join(downloadDir, 'dancing_girl_files', 'Dancing Girl Files', 'sprites');
    try {
        await fs.access(srcRoot);
    } catch {
        throw new Error(
            `Thiếu pack dance: đặt "dancing_girl_files" vào /download rồi chạy lại.\n` +
                `Expected: ${srcRoot}`
        );
    }
    const map = [
        ['Balancing', 'pixel_dance_balancing'],
        ['hips', 'pixel_dance_hips'],
        ['Skip', 'pixel_dance_skip'],
        ['slide', 'pixel_dance_slide'],
        ['snap', 'pixel_dance_snap']
    ];
    const characters = [];
    for (const [folder, id] of map) {
        const dest = path.join(outSets, 'pixel_dance', id);
        await rmrf(dest);
        const n = await copyFilteredPngs(path.join(srcRoot, folder), dest, () => true);
        console.log(`pixel_dance/${id}: ${n} frames`);
        characters.push({ id, type: 'frames', dir: `sets/pixel_dance/${id}` });
    }
    return {
        packId: 'pixel-dance',
        packLabel: 'Pixel dance set (CC0)',
        license: 'CC0 — opengameart.org/content/dancing-girl-sprites',
        characters
    };
}

async function main() {
    await ensureDir(downloadDir);
    await ensureDir(outSets);
    // Dọn set không hợp dance bar nếu còn sót
    await rmrf(path.join(outSets, 'fantasy_monsters'));
    await rmrf(path.join(outSets, 'vector_chars'));

    const packs = [await preparePixelDance()];

    const manifest = {
        note: 'Chỉ pack nhảy/múa phù hợp TikTok dance bar. Chạy: npm run import:sprites',
        packs
    };
    await fs.writeFile(setsJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(
        `Đã ghi ${setsJsonPath} (${packs.length} sets, ${packs.reduce((n, p) => n + p.characters.length, 0)} characters)`
    );
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
