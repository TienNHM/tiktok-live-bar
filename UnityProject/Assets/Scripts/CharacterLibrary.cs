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

        private static string[] enabledFolders = DefaultFolders;
        private static readonly Dictionary<string, Sprite[]> Cache = new();

        public static void ApplyEnabledFolders(string[] folders)
        {
            string[] next = (folders ?? Array.Empty<string>())
                .Where(folder => !string.IsNullOrWhiteSpace(folder))
                .Select(folder => folder.Trim())
                .Distinct(StringComparer.Ordinal)
                .Where(folder => Load(folder).Length > 0)
                .ToArray();
            enabledFolders = next.Length > 0 ? next : DefaultFolders.Where(folder => Load(folder).Length > 0).DefaultIfEmpty("a").ToArray();
        }

        public static (string name, Sprite[] frames) RandomCharacter(string except = null)
        {
            string[] choices = enabledFolders.Where(name => name != except).ToArray();
            if (choices.Length == 0) choices = enabledFolders;
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
