const fs = require('fs');
const path = require('path');

const bridgeRoot = path.join(__dirname, '..', '..');
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const DEFAULT_THRESHOLDS = [
    { rarity: 'common', minimum: 0 },
    { rarity: 'rare', minimum: 10 },
    { rarity: 'epic', minimum: 200 },
    { rarity: 'legendary', minimum: 1000 }
];

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function cleanString(value) {
    return String(value || '').trim();
}

function rarityRank(rarity) {
    const index = RARITY_ORDER.indexOf(cleanString(rarity).toLowerCase());
    return index >= 0 ? index : 0;
}

function sanitizeVariant(folder, input = {}) {
    const status = cleanString(input.status).toLowerCase();
    const allowed = status === 'art_ready' || status === 'imported' ? status : 'planned';
    return {
        folder: cleanString(folder) || cleanString(input.folder),
        outfit: cleanString(input.outfit),
        hair: cleanString(input.hair),
        shoes: cleanString(input.shoes),
        accessory: cleanString(input.accessory),
        dance: cleanString(input.dance),
        entranceVfx: cleanString(input.entranceVfx),
        victoryVfx: cleanString(input.victoryVfx),
        status: allowed
    };
}

function sanitizeRosterCharacter(character) {
    const id = cleanString(character?.id).toLowerCase();
    if (!id) return null;
    const variantsIn = character?.variants && typeof character.variants === 'object'
        ? character.variants
        : {};
    const variants = {};
    for (const rarity of RARITY_ORDER) {
        const raw = variantsIn[rarity] || {};
        const folder = cleanString(raw.folder) || `${id}_${rarity}`;
        variants[rarity] = sanitizeVariant(folder, raw);
    }
    return {
        id,
        displayName: cleanString(character?.displayName) || id,
        line: cleanString(character?.line) || 'kpop',
        vibe: cleanString(character?.vibe),
        baseOutfit: cleanString(character?.baseOutfit),
        identity: cleanString(character?.identity) || cleanString(character?.vibe),
        phase: Number(character?.phase) === 2 ? 2 : 1,
        mvp: character?.mvp === true || character?.mvp === 'true',
        artDir: cleanString(character?.artDir) || `game-assets/characters/${id}`,
        variants
    };
}

function sanitizeRoster(input) {
    if (!input || typeof input !== 'object') return null;
    const characters = asArray(input.characters)
        .map(sanitizeRosterCharacter)
        .filter(Boolean);
    if (characters.length === 0) return null;

    const thresholdsRaw = asArray(input.rarityThresholds);
    const rarityThresholds = DEFAULT_THRESHOLDS.map(fallback => {
        const found = thresholdsRaw.find(item => cleanString(item?.rarity).toLowerCase() === fallback.rarity);
        const minimum = Number(found?.minimum);
        return {
            rarity: fallback.rarity,
            minimum: Number.isFinite(minimum) ? Math.max(0, Math.floor(minimum)) : fallback.minimum
        };
    });

    return {
        id: cleanString(input.id) || 'bar-dance',
        label: cleanString(input.label) || 'Bar Dance roster',
        version: Number(input.version) || 1,
        rarities: [...RARITY_ORDER],
        rarityThresholds,
        pipeline: input.pipeline && typeof input.pipeline === 'object' ? input.pipeline : null,
        characters
    };
}

function resolveRosterPath(rosterRef) {
    const ref = cleanString(rosterRef);
    if (!ref) return null;
    if (path.isAbsolute(ref)) return ref;
    return path.join(bridgeRoot, ref);
}

function loadRosterFile(rosterRef) {
    const fullPath = resolveRosterPath(rosterRef);
    if (!fullPath) return null;
    try {
        const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        return sanitizeRoster(raw);
    } catch {
        return null;
    }
}

function flattenRosterFolders(roster) {
    if (!roster) return [];
    const folders = [];
    for (const character of roster.characters) {
        for (const rarity of RARITY_ORDER) {
            const folder = character.variants[rarity]?.folder;
            if (folder) folders.push(folder);
        }
    }
    return folders;
}

function flattenRosterEntries(roster) {
    if (!roster) return [];
    const entries = [];
    for (const character of roster.characters) {
        for (const rarity of RARITY_ORDER) {
            const variant = character.variants[rarity];
            if (!variant?.folder) continue;
            entries.push({
                id: character.id,
                displayName: character.displayName,
                line: character.line,
                vibe: character.vibe,
                identity: character.identity,
                phase: character.phase,
                mvp: character.mvp,
                artDir: character.artDir,
                rarity,
                rarityRank: rarityRank(rarity),
                folder: variant.folder,
                status: variant.status,
                outfit: variant.outfit,
                hair: variant.hair,
                shoes: variant.shoes,
                accessory: variant.accessory,
                dance: variant.dance,
                entranceVfx: variant.entranceVfx,
                victoryVfx: variant.victoryVfx
            });
        }
    }
    return entries;
}

function sanitizePack(pack) {
    const kind = cleanString(pack?.kind) === 'banners' ? 'banners' : 'characters';
    const base = {
        id: cleanString(pack?.id) || `pack-${Date.now()}`,
        label: cleanString(pack?.label) || cleanString(pack?.id) || 'Pack',
        kind,
        enabled: pack?.enabled !== false
    };
    if (kind === 'banners') {
        const variants = asArray(pack?.variants).map(cleanString).filter(Boolean);
        const fallbackVariant = cleanString(pack?.fallbackVariant) || variants[0] || 'ice';
        return {
            ...base,
            variants: variants.length ? variants : ['ice'],
            fallbackVariant
        };
    }

    const rosterRef = cleanString(pack?.rosterRef);
    let folders = asArray(pack?.folders).map(cleanString).filter(Boolean);
    if (rosterRef) {
        const roster = loadRosterFile(rosterRef);
        if (roster) {
            folders = [...new Set([...folders, ...flattenRosterFolders(roster)])]
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        }
    }

    const result = {
        ...base,
        folders
    };
    if (rosterRef) result.rosterRef = rosterRef;
    return result;
}

function sanitizeSource(source) {
    const type = cleanString(source?.type) || 'local';
    return {
        id: cleanString(source?.id) || `source-${Date.now()}`,
        label: cleanString(source?.label) || cleanString(source?.id) || 'Source',
        type,
        enabled: source?.enabled === true || (type === 'local' && source?.enabled !== false),
        path: cleanString(source?.path),
        manifest: cleanString(source?.manifest),
        notes: cleanString(source?.notes)
    };
}

function sanitizeAssetsConfig(input) {
    const packs = asArray(input?.packs).map(sanitizePack);
    const sources = asArray(input?.sources).map(sanitizeSource);
    return { packs, sources };
}

function resolveRuntimeAssets(config) {
    const safe = sanitizeAssetsConfig(config);
    const characterFolders = [];
    const seenFolders = new Set();
    let bannerVariants = [];
    let fallbackBannerVariant = 'ice';
    let roster = null;
    let rarityThresholds = DEFAULT_THRESHOLDS.map(item => ({ ...item }));

    for (const pack of safe.packs) {
        if (!pack.enabled) continue;
        if (pack.kind === 'characters') {
            if (pack.rosterRef) {
                const loaded = loadRosterFile(pack.rosterRef);
                if (loaded) {
                    roster = loaded;
                    rarityThresholds = loaded.rarityThresholds.map(item => ({ ...item }));
                }
            }
            for (const folder of pack.folders) {
                if (seenFolders.has(folder)) continue;
                seenFolders.add(folder);
                characterFolders.push(folder);
            }
        }
        if (pack.kind === 'banners') {
            bannerVariants = [...pack.variants];
            fallbackBannerVariant = pack.fallbackVariant || bannerVariants[0] || 'ice';
        }
    }

    // Fallback: if only empty planned roster folders would be active, older enabled packs
    // already contributed their folders above. Guarantees at least classic "a".
    if (characterFolders.length === 0) {
        characterFolders.push('a');
    }
    if (bannerVariants.length === 0) {
        bannerVariants = ['ice'];
        fallbackBannerVariant = 'ice';
    }
    if (!bannerVariants.includes(fallbackBannerVariant)) {
        fallbackBannerVariant = bannerVariants[0];
    }

    return {
        type: 'assets_config',
        assets: safe,
        characterFolders,
        bannerVariants,
        fallbackBannerVariant,
        roster: flattenRosterEntries(roster),
        rosterMeta: roster
            ? {
                id: roster.id,
                label: roster.label,
                version: roster.version,
                pipeline: roster.pipeline,
                characters: roster.characters
            }
            : null,
        rarityThresholds
    };
}

function maxRarityForGiftPower(giftPower, thresholds = DEFAULT_THRESHOLDS) {
    const power = Math.max(0, Number(giftPower) || 0);
    let current = 'common';
    const ordered = [...thresholds].sort((a, b) => a.minimum - b.minimum);
    for (const tier of ordered) {
        if (power >= tier.minimum) current = tier.rarity;
    }
    return current;
}

module.exports = {
    sanitizeAssetsConfig,
    resolveRuntimeAssets,
    sanitizeRoster,
    loadRosterFile,
    flattenRosterFolders,
    flattenRosterEntries,
    maxRarityForGiftPower,
    RARITY_ORDER,
    DEFAULT_THRESHOLDS,
    rarityRank
};
