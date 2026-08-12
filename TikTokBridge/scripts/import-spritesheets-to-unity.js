const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const rootDir = path.join(__dirname, '..', 'assets', 'spritesheets');
const setsPath = path.join(rootDir, 'sets.json');
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

const MAX_EDGE = 256;
const FORCE = process.argv.includes('--force');

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

async function ensureFolderMeta(outDir) {
    const folderMetaPath = `${outDir}.meta`;
    try {
        await fs.access(folderMetaPath);
    } catch {
        await fs.writeFile(folderMetaPath, folderMeta(newGuid()), 'utf8');
    }
}

async function writeFrame(outDir, index, inputBufferOrPath) {
    const frameName = `${String(index).padStart(3, '0')}.png`;
    const framePath = path.join(outDir, frameName);
    await sharp(inputBufferOrPath)
        .resize({
            width: MAX_EDGE,
            height: MAX_EDGE,
            fit: 'inside',
            withoutEnlargement: false
        })
        .ensureAlpha()
        .png()
        .toFile(framePath);
    await fs.writeFile(
        `${framePath}.meta`,
        textureMeta(newGuid(), newGuid()),
        'utf8'
    );
}

function naturalSort(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function listPngs(dir) {
    const files = await fs.readdir(dir);
    return files.filter(name => /\.png$/i.test(name) && !name.startsWith('.')).sort(naturalSort);
}

async function importFramesFolder(characterId, sourceDir) {
    const outDir = path.join(charactersDir, characterId);
    if (!FORCE && (await folderHasFrames(outDir))) {
        console.warn(`= ${characterId}: đã có frames, bỏ qua (dùng --force để ghi đè)`);
        return { id: characterId, skipped: true, frames: 0 };
    }

    const pngs = await listPngs(sourceDir);
    if (pngs.length < 2) throw new Error(`Cần ≥2 PNG frame trong ${sourceDir}`);

    await fs.mkdir(outDir, { recursive: true });
    if (FORCE) await clearPngs(outDir);
    await ensureFolderMeta(outDir);

    let written = 0;
    for (const name of pngs) {
        await writeFrame(outDir, written, path.join(sourceDir, name));
        written += 1;
    }
    console.log(`✓ ${characterId}: ${written} frames (từ folder)`);
    return { id: characterId, skipped: false, frames: written };
}

async function importSpritesheet(characterId, sheetPath, frameWidth, frameHeight) {
    const outDir = path.join(charactersDir, characterId);
    if (!FORCE && (await folderHasFrames(outDir))) {
        console.warn(`= ${characterId}: đã có frames, bỏ qua (dùng --force để ghi đè)`);
        return { id: characterId, skipped: true, frames: 0 };
    }

    const image = sharp(sheetPath);
    const meta = await image.metadata();
    const fw = Number(frameWidth) || 0;
    const fh = Number(frameHeight) || meta.height || 0;
    if (!fw || !fh) throw new Error('sheet cần frameWidth/frameHeight');

    const cols = Math.floor((meta.width || 0) / fw);
    const rows = Math.floor((meta.height || 0) / fh);
    if (cols < 1 || rows < 1) throw new Error('spritesheet nhỏ hơn 1 frame');

    await fs.mkdir(outDir, { recursive: true });
    if (FORCE) await clearPngs(outDir);
    await ensureFolderMeta(outDir);

    let written = 0;
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const buffer = await sharp(sheetPath)
                .extract({ left: col * fw, top: row * fh, width: fw, height: fh })
                .png()
                .toBuffer();
            await writeFrame(outDir, written, buffer);
            written += 1;
        }
    }
    if (written < 2) throw new Error('spritesheet cho <2 frames');
    console.log(`✓ ${characterId}: ${written} frames (từ sheet ${cols}x${rows})`);
    return { id: characterId, skipped: false, frames: written };
}

async function updateAssetsPack(packId, packLabel, characterIds) {
    if (!packId || characterIds.length === 0) return;
    const config = JSON.parse(await fs.readFile(assetsConfigPath, 'utf8'));
    const packs = Array.isArray(config.packs) ? config.packs : [];
    let pack = packs.find(item => item.id === packId);
    if (!pack) {
        pack = { id: packId, label: packLabel || packId, kind: 'characters', enabled: true, folders: [] };
        const bannersIndex = packs.findIndex(item => item.kind === 'banners');
        if (bannersIndex >= 0) packs.splice(bannersIndex, 0, pack);
        else packs.push(pack);
    }
    pack.label = packLabel || pack.label || packId;
    pack.kind = 'characters';
    pack.enabled = pack.enabled !== false;
    pack.folders = [...new Set([...(pack.folders || []), ...characterIds])]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    config.packs = packs;
    await fs.writeFile(assetsConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    console.log(`Pack "${packId}": ${pack.folders.length} characters`);
}

function normalizePacks(raw) {
    if (Array.isArray(raw.packs)) return raw.packs;
    if (Array.isArray(raw.characters)) {
        return [{
            packId: raw.packId || 'sprite-set',
            packLabel: raw.packLabel || 'Sprite set',
            characters: raw.characters
        }];
    }
    return [];
}

async function main() {
    const raw = JSON.parse(await fs.readFile(setsPath, 'utf8'));
    const packs = normalizePacks(raw);
    if (packs.length === 0) {
        console.warn(`Không có pack/character trong ${setsPath}`);
        process.exitCode = 1;
        return;
    }

    await fs.mkdir(charactersDir, { recursive: true });

    for (const pack of packs) {
        const characters = Array.isArray(pack.characters) ? pack.characters : [];
        const imported = [];
        console.log(`--- ${pack.packId || pack.packLabel || 'pack'} ---`);
        for (const entry of characters) {
            const id = String(entry.id || '').trim();
            if (!id) continue;
            try {
                if (entry.type === 'sheet') {
                    const file = path.join(rootDir, entry.file);
                    const result = await importSpritesheet(id, file, entry.frameWidth, entry.frameHeight);
                    if (result.id) imported.push(result.id);
                } else {
                    const dir = path.join(rootDir, entry.dir || entry.folder);
                    const result = await importFramesFolder(id, dir);
                    if (result.id) imported.push(result.id);
                }
            } catch (error) {
                console.warn(`✗ ${id}: ${error.message}`);
            }
        }
        await updateAssetsPack(pack.packId || 'sprite-set', pack.packLabel || 'Sprite set', imported);
    }

    console.log('Xong. Mở Unity để import meta, rồi Assets → bật pack tương ứng → Lưu & áp dụng.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
