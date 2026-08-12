using System;
using System.Linq;
using UnityEngine;

namespace TikTokLiveGame
{
    public static class BannerCatalog
    {
        private static readonly string[] DefaultVariants = { "ice", "neon", "fire", "royal" };
        private static string[] enabledVariants = DefaultVariants;
        private static string fallbackVariant = "ice";

        public static void ApplyConfig(string[] variants, string fallback)
        {
            string[] next = (variants ?? Array.Empty<string>())
                .Where(variant => !string.IsNullOrWhiteSpace(variant))
                .Select(variant => variant.Trim().ToLowerInvariant())
                .Distinct(StringComparer.Ordinal)
                .ToArray();
            enabledVariants = next.Length > 0 ? next : DefaultVariants;
            fallbackVariant = string.IsNullOrWhiteSpace(fallback)
                ? enabledVariants[0]
                : fallback.Trim().ToLowerInvariant();
            if (!enabledVariants.Contains(fallbackVariant))
                fallbackVariant = enabledVariants[0];
        }

        public static string ResolveVariant(string preferred)
        {
            string value = string.IsNullOrWhiteSpace(preferred)
                ? fallbackVariant
                : preferred.Trim().ToLowerInvariant();
            if (enabledVariants.Contains(value)) return value;
            return fallbackVariant;
        }

        public static string WingsResourcePath(string variant, bool giftFocused)
        {
            if (giftFocused) return "Banners/energy-wings-v2";
            string resolved = ResolveVariant(variant);
            return $"Banners/wings-{resolved}";
        }

        public static string TitleResourcePath(string variant)
        {
            return $"Banners/title-{ResolveVariant(variant)}";
        }
    }
}
