function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function cleanString(value) {
    return String(value || '').trim();
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
    return {
        ...base,
        folders: asArray(pack?.folders).map(cleanString).filter(Boolean)
    };
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

    for (const pack of safe.packs) {
        if (!pack.enabled) continue;
        if (pack.kind === 'characters') {
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
        fallbackBannerVariant
    };
}

module.exports = {
    sanitizeAssetsConfig,
    resolveRuntimeAssets
};
