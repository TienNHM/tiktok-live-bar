const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const gifsDir = path.join(__dirname, '..', 'assets', 'gifs');
const charactersDir = path.join(
    __dirname,
    '..',
    '..',
    'UnityProject',
    'Assets',
    'Resources',
    'Characters'
);
const assetsConfigPath = path.join(__dirname, '..', 'config', 'assets.json');
const rosterConfigPath = path.join(__dirname, '..', 'config', 'roster.json');

const MAX_EDGE = 256;
const MAX_FRAMES = 48;
const FORCE = process.argv.includes('--force');

const BAR_DANCE_IDS = [
    'mina', 'jin', 'yuna', 'kai', 'rina', 'jay',
    'sora', 'leo', 'momo', 'koko', 'vivi', 'nova'
];
const BAR_DANCE_RARITIES = ['common', 'rare', 'epic', 'legendary'];
const BAR_DANCE_FOLDER_RE = new RegExp(
    `^(?:bar_dance_)?(${BAR_DANCE_IDS.join('|')})_(${BAR_DANCE_RARITIES.join('|')})$`
);

/** Mỗi prefix = một character set (pack) trong assets.json */
const SET_RULES = [
    {
        test: name => BAR_DANCE_FOLDER_RE.test(name),
        id: 'bar-dance',
        label: 'Bar Dance roster',
        rosterRef: 'config/roster.json',
        normalize: name => {
            const match = name.match(BAR_DANCE_FOLDER_RE);
            return match ? `${match[1]}_${match[2]}` : name;
        }
    },
    { test: /^mushroom_dance_/, id: 'mushroom-dance', label: 'Mushroom dance set' },
    { test: /^mushroom_magic_/, id: 'mushroom-magic', label: 'Mushroom magic set' },
    { test: /^hanhan/, id: 'hanhan', label: 'Hanhan set' },
    { test: /^free_dance_/, id: 'free-dance', label: 'Free dance set' }
];

function matchSetRule(folderName) {
    for (const rule of SET_RULES) {
        if (typeof rule.test === 'function') {
            if (rule.test(folderName)) return rule;
            continue;
        }
        if (rule.test.test(folderName)) return rule;
    }
    return null;
}
function newGuid() {
    return crypto.randomBytes(16).toString('hex');
}

function folderMeta(guid) {
    return `fileFormatVersion: 2
guid: ${guid}
folderAsset: yes
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

function textureMeta(guid, spriteId) {
    return `fileFormatVersion: 2
guid: ${guid}
TextureImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 13
  mipmaps:
    mipMapMode: 0
    enableMipMap: 0
    sRGBTexture: 1
    linearTexture: 0
    fadeOut: 0
    borderMipMap: 0
    mipMapsPreserveCoverage: 0
    alphaTestReferenceValue: 0.5
    mipMapFadeDistanceStart: 1
    mipMapFadeDistanceEnd: 3
  bumpmap:
    convertToNormalMap: 0
    externalNormalMap: 0
    heightScale: 0.25
    normalMapFilter: 0
    flipGreenChannel: 0
  isReadable: 0
  streamingMipmaps: 0
  streamingMipmapsPriority: 0
  vTOnly: 0
  ignoreMipmapLimit: 0
  grayScaleToAlpha: 0
  generateCubemap: 6
  cubemapConvolution: 0
  seamlessCubemap: 0
  textureFormat: 1
  maxTextureSize: 2048
  textureSettings:
    serializedVersion: 2
    filterMode: 1
    aniso: 1
    mipBias: 0
    wrapU: 1
    wrapV: 1
    wrapW: 1
  nPOTScale: 0
  lightmap: 0
  compressionQuality: 50
  spriteMode: 1
  spriteExtrude: 1
  spriteMeshType: 1
  alignment: 0
  spritePivot: {x: 0.5, y: 0.5}
  spritePixelsToUnits: 100
  spriteBorder: {x: 0, y: 0, z: 0, w: 0}
  spriteGenerateFallbackPhysicsShape: 1
  alphaUsage: 1
  alphaIsTransparency: 1
  spriteTessellationDetail: -1
  textureType: 8
  textureShape: 1
  singleChannelComponent: 0
  flipbookRows: 1
  flipbookColumns: 1
  maxTextureSizeSet: 0
  compressionQualitySet: 0
  textureFormatSet: 0
  ignorePngGamma: 0
  applyGammaDecoding: 0
  swizzle: 50462976
  cookieLightType: 0
  platformSettings:
  - serializedVersion: 4
    buildTarget: DefaultTexturePlatform
    maxTextureSize: 512
    resizeAlgorithm: 0
    textureFormat: -1
    textureCompression: 1
    compressionQuality: 50
    crunchedCompression: 0
    allowsAlphaSplitting: 0
    overridden: 0
    ignorePlatformSupport: 0
    androidETC2FallbackOverride: 0
    forceMaximumCompressionQuality_BC6H_BC7: 0
  - serializedVersion: 4
    buildTarget: Standalone
    maxTextureSize: 2048
    resizeAlgorithm: 0
    textureFormat: -1
    textureCompression: 1
    compressionQuality: 50
    crunchedCompression: 0
    allowsAlphaSplitting: 0
    overridden: 0
    ignorePlatformSupport: 0
    androidETC2FallbackOverride: 0
    forceMaximumCompressionQuality_BC6H_BC7: 0
  spriteSheet:
    serializedVersion: 2
    sprites: []
    outline: []
    customData: 
    physicsShape: []
    bones: []
    spriteID: ${spriteId}
    internalID: 0
    vertices: []
    indices: 
    edges: []
    weights: []
    secondaryTextures: []
    spriteCustomMetadata:
      entries: []
    nameFileIdTable: {}
  mipmapLimitGroupName: 
  pSDRemoveMatte: 0
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

function pickFrameIndexes(total) {
    if (total <= MAX_FRAMES) {
        return Array.from({ length: total }, (_, i) => i);
    }
    const indexes = [];
    for (let i = 0; i < MAX_FRAMES; i += 1) {
        indexes.push(Math.round((i * (total - 1)) / (MAX_FRAMES - 1)));
    }
    return [...new Set(indexes)];
}

async function listGifFiles() {
    const files = await fs.readdir(gifsDir);
    return files
        .filter(name => /\.gif$/i.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function folderHasFrames(folderPath) {
    try {
        const files = await fs.readdir(folderPath);
        return files.some(name => /^\d{3}\.png$/i.test(name));
    } catch {
        return false;
    }
}

async function clearPngs(folderPath) {
    const files = await fs.readdir(folderPath);
    await Promise.all(
        files
            .filter(name => /\.png(\.meta)?$/i.test(name))
            .map(name => fs.rm(path.join(folderPath, name), { force: true }))
    );
}

async function importGif(gifName) {
    const rawFolderName = path.basename(gifName, path.extname(gifName));
    const rule = matchSetRule(rawFolderName);
    const folderName = rule?.normalize ? rule.normalize(rawFolderName) : rawFolderName;
    const gifPath = path.join(gifsDir, gifName);
    const outDir = path.join(charactersDir, folderName);

    if (!FORCE && (await folderHasFrames(outDir))) {
        console.warn(`= ${folderName}: đã có frames, bỏ qua (dùng --force để ghi đè)`);
        return { folderName, skipped: true, frames: 0 };
    }

    const meta = await sharp(gifPath, { animated: true, pages: -1 }).metadata();
    const totalPages = Number(meta.pages) || 1;
    if (totalPages < 2) {
        throw new Error('GIF chỉ có một frame');
    }

    const pageIndexes = pickFrameIndexes(totalPages);
    await fs.mkdir(outDir, { recursive: true });
    if (FORCE) await clearPngs(outDir);

    const folderMetaPath = `${outDir}.meta`;
    try {
        await fs.access(folderMetaPath);
    } catch {
        await fs.writeFile(folderMetaPath, folderMeta(newGuid()), 'utf8');
    }

    let written = 0;
    for (const page of pageIndexes) {
        const frameName = `${String(written).padStart(3, '0')}.png`;
        const framePath = path.join(outDir, frameName);
        await sharp(gifPath, { animated: true, page })
            .resize({
                width: MAX_EDGE,
                height: MAX_EDGE,
                fit: 'inside',
                withoutEnlargement: true
            })
            .ensureAlpha()
            .png()
            .toFile(framePath);
        await fs.writeFile(
            `${framePath}.meta`,
            textureMeta(newGuid(), `${newGuid()}0000000000000000`.slice(0, 32)),
            'utf8'
        );
        written += 1;
    }

    console.log(`✓ ${folderName}: ${written}/${totalPages} frames → ${path.relative(path.join(__dirname, '..', '..'), outDir)}`);
    return { folderName, skipped: false, frames: written };
}

async function markRosterImported(importedFolders) {
    const folders = new Set(importedFolders);
    if (folders.size === 0) return;

    let roster;
    try {
        roster = JSON.parse(await fs.readFile(rosterConfigPath, 'utf8'));
    } catch (error) {
        console.warn(`Không cập nhật roster.json: ${error.message}`);
        return;
    }

    let changed = 0;
    for (const character of Array.isArray(roster.characters) ? roster.characters : []) {
        const variants = character?.variants && typeof character.variants === 'object'
            ? character.variants
            : {};
        for (const rarity of BAR_DANCE_RARITIES) {
            const variant = variants[rarity];
            if (!variant) continue;
            const folder = String(variant.folder || `${character.id}_${rarity}`);
            if (!folders.has(folder)) continue;
            if (variant.status !== 'imported') {
                variant.status = 'imported';
                changed += 1;
            }
            variant.folder = folder;
        }
    }

    if (changed === 0) return;
    await fs.writeFile(rosterConfigPath, `${JSON.stringify(roster, null, 2)}\n`, 'utf8');
    console.log(`Đã đánh dấu ${changed} variant status=imported trong roster.json`);
}

async function updateAssetsConfig(importedFolders) {
    const folders = [...new Set(importedFolders)].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
    );
    if (folders.length === 0) return;

    let config;
    try {
        config = JSON.parse(await fs.readFile(assetsConfigPath, 'utf8'));
    } catch (error) {
        throw new Error(`Không đọc được assets.json: ${error.message}`);
    }

    const packs = Array.isArray(config.packs) ? config.packs : [];
    const reservedClassic = new Set(['a', 'b', 'c', 'd', 'e', 'g', 'h', 'j', 'k']);
    let changed = false;

    for (const rule of SET_RULES) {
        const matched = folders
            .filter(name => !reservedClassic.has(name))
            .filter(name => (typeof rule.test === 'function' ? rule.test(name) : rule.test.test(name)))
            .map(name => (rule.normalize ? rule.normalize(name) : name));
        if (matched.length === 0) continue;

        let pack = packs.find(item => item.id === rule.id);
        if (!pack) {
            pack = {
                id: rule.id,
                label: rule.label,
                kind: 'characters',
                enabled: true,
                folders: []
            };
            if (rule.rosterRef) pack.rosterRef = rule.rosterRef;
            const bannersIndex = packs.findIndex(item => item.kind === 'banners');
            if (bannersIndex >= 0) packs.splice(bannersIndex, 0, pack);
            else packs.push(pack);
        }

        const merged = [...new Set([...(pack.folders || []), ...matched])]
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        pack.folders = merged;
        pack.label = rule.label;
        pack.kind = 'characters';
        if (rule.rosterRef) pack.rosterRef = rule.rosterRef;
        changed = true;
        console.log(`Pack "${rule.id}": ${merged.length} characters`);
    }

    // bỏ pack dump cũ nếu còn
    const withoutDump = packs.filter(pack => pack.id !== 'imported-gifs');
    if (withoutDump.length !== packs.length) changed = true;

    if (!changed) {
        console.log('Không có character set nào cần cập nhật.');
        return;
    }

    config.packs = withoutDump;
    await fs.writeFile(assetsConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    console.log('Đã cập nhật character sets trong config/assets.json');
}

async function main() {
    await fs.mkdir(charactersDir, { recursive: true });
    const gifs = await listGifFiles();
    if (gifs.length === 0) {
        console.warn(`Không có file GIF trong ${gifsDir}`);
        console.warn('Chạy npm run download:gifs trước.');
        process.exitCode = 1;
        return;
    }

    console.log(`Import ${gifs.length} GIF → Unity Resources/Characters (max ${MAX_EDGE}px, ≤${MAX_FRAMES} frames)`);
    const imported = [];
    for (const gif of gifs) {
        try {
            const result = await importGif(gif);
            if (result.folderName && (result.frames > 0 || result.skipped)) {
                imported.push(result.folderName);
            }
        } catch (error) {
            console.warn(`✗ ${gif}: ${error.message}`);
        }
    }

    await updateAssetsConfig(imported);
    await markRosterImported(imported);
    console.log(`Xong. Mở Unity để import meta, rồi Assets → bật pack Bar Dance → Lưu & áp dụng.`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
