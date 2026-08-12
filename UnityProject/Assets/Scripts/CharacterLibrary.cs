using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace TikTokLiveGame
{
    public static class CharacterLibrary
    {
        private static readonly string[] DefaultFolders =
        {
            "a", "b", "c", "d", "e", "g", "h", "j", "k",
            "mushroom_dance_01", "mushroom_dance_15", "mushroom_magic_02",
            "hanhan_video_dance"
        };

        private static readonly string[] RarityOrder = { "common", "rare", "epic", "legendary" };

        private static string[] enabledFolders = DefaultFolders;
        private static readonly Dictionary<string, Sprite[]> Cache = new();
        private static CharacterRosterEntry[] rosterEntries = Array.Empty<CharacterRosterEntry>();
        private static RarityThreshold[] rarityThresholds =
        {
            new RarityThreshold { rarity = "common", minimum = 0 },
            new RarityThreshold { rarity = "rare", minimum = 10 },
            new RarityThreshold { rarity = "epic", minimum = 200 },
            new RarityThreshold { rarity = "legendary", minimum = 1000 }
        };

        public static void ApplyEnabledFolders(string[] folders)
        {
            string[] next = (folders ?? Array.Empty<string>())
                .Where(folder => !string.IsNullOrWhiteSpace(folder))
                .Select(folder => folder.Trim())
                .Distinct(StringComparer.Ordinal)
                .Where(folder => Load(folder).Length > 0)
                .ToArray();
            enabledFolders = next.Length > 0
                ? next
                : DefaultFolders.Where(folder => Load(folder).Length > 0).DefaultIfEmpty("a").ToArray();
        }

        public static void ApplyRoster(CharacterRosterEntry[] entries, RarityThreshold[] thresholds)
        {
            rosterEntries = (entries ?? Array.Empty<CharacterRosterEntry>())
                .Where(entry => entry != null && !string.IsNullOrWhiteSpace(entry.folder))
                .ToArray();

            if (thresholds != null && thresholds.Length > 0)
            {
                rarityThresholds = thresholds
                    .Where(tier => tier != null && !string.IsNullOrWhiteSpace(tier.rarity))
                    .Select(tier => new RarityThreshold
                    {
                        rarity = tier.rarity.Trim().ToLowerInvariant(),
                        minimum = Mathf.Max(0, tier.minimum)
                    })
                    .ToArray();
            }
        }

        public static int MaxRarityRankForGiftPower(int giftPower)
        {
            int power = Mathf.Max(0, giftPower);
            int rank = 0;
            foreach (RarityThreshold tier in rarityThresholds.OrderBy(item => item.minimum))
            {
                if (power < tier.minimum) continue;
                rank = Mathf.Max(rank, RarityRank(tier.rarity));
            }
            return rank;
        }

        public static int RarityRank(string rarity)
        {
            if (string.IsNullOrWhiteSpace(rarity)) return 0;
            int index = Array.IndexOf(RarityOrder, rarity.Trim().ToLowerInvariant());
            return index >= 0 ? index : 0;
        }

        public static (string name, Sprite[] frames) RandomCharacter(string except = null)
        {
            return PickCharacter(except, RarityOrder.Length - 1);
        }

        public static (string name, Sprite[] frames) PickCharacter(string except, int maxRarityRank)
        {
            int cappedRank = Mathf.Clamp(maxRarityRank, 0, RarityOrder.Length - 1);
            HashSet<string> rosterFolders = new(
                rosterEntries.Select(entry => entry.folder),
                StringComparer.Ordinal);

            string[] rosterChoices = rosterEntries
                .Where(entry =>
                {
                    int rank = entry.rarityRank > 0 ? entry.rarityRank : RarityRank(entry.rarity);
                    if (rank > cappedRank) return false;
                    if (entry.folder == except) return false;
                    return Load(entry.folder).Length > 0 && enabledFolders.Contains(entry.folder);
                })
                .Select(entry => entry.folder)
                .Distinct(StringComparer.Ordinal)
                .ToArray();

            string[] legacyChoices = enabledFolders
                .Where(name => name != except && !rosterFolders.Contains(name))
                .ToArray();

            string[] choices = rosterChoices.Length > 0
                ? rosterChoices
                : legacyChoices.Length > 0
                    ? legacyChoices
                    : enabledFolders.Where(name => name != except).ToArray();

            if (choices.Length == 0) choices = enabledFolders;
            if (choices.Length == 0) return ("a", Load("a"));

            string name = choices[UnityEngine.Random.Range(0, choices.Length)];
            return (name, Load(name));
        }

        private static Sprite[] Load(string name)
        {
            if (Cache.TryGetValue(name, out Sprite[] cached)) return cached;
            Sprite[] frames = Resources.LoadAll<Sprite>($"Characters/{name}")
                .OrderBy(sprite => sprite.name, StringComparer.Ordinal)
                .ToArray();
            Cache[name] = frames;
            return frames;
        }
    }
}
