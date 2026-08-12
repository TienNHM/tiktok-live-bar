const fs = require('fs');
const path = require('path');

const bridgeRoot = path.join(__dirname, '..');
const repoRoot = path.join(__dirname, '..', '..');

const roster = JSON.parse(
    fs.readFileSync(path.join(bridgeRoot, 'config', 'roster.json'), 'utf8')
);
const mvp = roster.characters.filter(c => c.mvp);

const negative = `# Negative prompt — Bar Dance baseline

photorealistic, 3d render, extra limbs, missing limbs, cropped, waist-up only,
busy background, floor, ground shadow, drop shadow, bloom, glow halo, lens flare,
particles, stage props, microphone stand, crowd, text, watermark, logo, signature,
inconsistent proportions, different art style from sheet, chibi too extreme,
realistic skin pores, uncanny valley
`;

function promptFor(c) {
    return `# Prompt — ${c.displayName} (${c.id})

## Style lock (always include)

Bar Dance official character, same art direction as master sheet,
K-pop × Y2K × Gen-Z streetwear, cel-shaded glossy anime,
Hot Pink Magenta Black White Electric Purple Neon Cyan palette,
full body, stylized proportions, slightly large head, long legs, clear silhouette

## Character

${c.displayName}: ${c.identity}
Line: ${c.line}
Base outfit: ${c.baseOutfit}
Vibe: ${c.vibe}

## Shot

clean isolated full-body character, transparent background,
no shadow, no floor, no glow, no environmental lighting, no props,
neutral standing pose, arms relaxed, facing forward / slight 3/4,
chunky sneakers visible, fashion readable at small size

## After master sheet

Use master character sheet as style + proportion reference.
Do not invent a new art style.
`;
}

function metadata(c) {
    return {
        id: c.id,
        displayName: c.displayName,
        phase: c.phase,
        mvp: c.mvp,
        line: c.line,
        identity: c.identity,
        vibe: c.vibe,
        baseOutfit: c.baseOutfit,
        pipeline: {
            masterSheet: false,
            reference: false,
            masterNeutral: false,
            poses: { idle: false, happy: false, dance: false, victory: false },
            layers: false,
            spine: false
        },
        generation: {
            tool: '',
            model: '',
            seed: null,
            version: 1,
            date: null,
            notes: 'Fill after each successful gen. Keep seeds to regenerate outfits later.'
        }
    };
}

const root = path.join(repoRoot, 'game-assets', 'characters');
fs.mkdirSync(root, { recursive: true });

for (const c of mvp) {
    const dir = path.join(root, c.id);
    const layers = path.join(dir, 'layers');
    fs.mkdirSync(layers, { recursive: true });
    fs.writeFileSync(path.join(dir, 'prompt.md'), promptFor(c));
    fs.writeFileSync(path.join(dir, 'negative-prompt.md'), negative);
    fs.writeFileSync(path.join(dir, 'metadata.json'), `${JSON.stringify(metadata(c), null, 2)}\n`);
    fs.writeFileSync(path.join(layers, '.gitkeep'), '');
    console.log('scaffolded', path.relative(repoRoot, dir));
}

fs.writeFileSync(
    path.join(root, 'README.md'),
    `# Bar Dance characters (source art)

Per-character prompts, masters, and metadata. Runtime Unity sprites still come from GIF import into \`Resources/Characters/{id}_{rarity}/\`.

See:
- \`TikTokBridge/assets/roster/CHARACTER_BIBLE.md\`
- \`TikTokBridge/assets/roster/ART_BRIEF.md\`

MVP Phase 1: mina, yuna, jin, kai, vivi, koko
`
);

console.log('done');
