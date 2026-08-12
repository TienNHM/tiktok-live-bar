# Bar Dance — Art Brief (export + import)

Full creative rules live in [`CHARACTER_BIBLE.md`](CHARACTER_BIBLE.md). This file is the **operational** checklist for generating and importing assets.

## Order of work

1. Lock bible (style + palette + MVP 6)
2. Generate **master character sheet** (same camera/scale/render)
3. Generate each MVP character **neutral stand** PNG (clean isolation)
4. Only then: poses → layers → Spine dances
5. For current Unity floor: export dance GIF loop → `npm run import:gifs`

## MVP first (Phase 1)

`mina` · `yuna` · `jin` · `kai` · `vivi` · `koko`

Do not start Phase 2 (Rina, Sora, Jay, Leo, Momo, Nova) until MVP is validated in-game.

## Clean isolation prompt (use every time)

```text
clean isolated full-body character, transparent background,
no shadow, no floor, no glow, no environmental lighting, no props,
neutral standing pose, clear silhouette, cel-shaded / glossy anime style
```

## Negative (baseline)

```text
photorealistic, 3d render, extra limbs, cropped, waist-up only,
busy background, floor shadow, bloom glow, particles, stage props,
inconsistent proportions, different art style, text, watermark, logo
```

## GIF → Unity naming (runtime today)

```text
TikTokBridge/assets/gifs/{id}_{rarity}.gif
# also ok: bar_dance_{id}_{rarity}.gif

npm run import:gifs
→ UnityProject/Assets/Resources/Characters/{id}_{rarity}/
→ roster variant status = imported
```

Prefer **common** rarity first for all 6 MVP before rare/epic/legendary looks.

## Source folders

```text
game-assets/characters/<id>/   # prompts, masters, metadata (keep forever)
TikTokBridge/assets/gifs/      # dance loops for flipbook import
```
