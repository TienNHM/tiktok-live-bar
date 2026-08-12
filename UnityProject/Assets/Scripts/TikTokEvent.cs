using System;

namespace TikTokLiveGame
{
    [Serializable]
    public class TikTokEvent
    {
        public string type;
        public string state;
        public string message;
        public string userId;
        public string uniqueId;
        public string nickname;
        public string avatar;
        public string comment;
        public string giftId;
        public string giftName;
        public string action;
        public string masterRuleId;
        public string label;
        public string variant;
        public string titleLabel;
        public string titleVariant;
        public int repeatCount;
        public int diamondCount;
        public int likeCount;
        public int score;
        public int giftPower;
        public int durationMs;
        public int fireworkBursts;
        public bool spectatorOnly;
        public bool joinedNow;
        public long titleExpiresAt;
        public TikTokPlayerData[] players;
        public TikTokPlayerData[] vipScores;
        public string[] characterFolders;
        public string[] bannerVariants;
        public string fallbackBannerVariant;
        public CharacterRosterEntry[] roster;
        public RarityThreshold[] rarityThresholds;
    }

    [Serializable]
    public class CharacterRosterEntry
    {
        public string id;
        public string displayName;
        public string line;
        public string vibe;
        public string rarity;
        public int rarityRank;
        public string folder;
        public string status;
        public string outfit;
        public string hair;
        public string shoes;
        public string accessory;
        public string dance;
        public string entranceVfx;
        public string victoryVfx;
    }

    [Serializable]
    public class RarityThreshold
    {
        public string rarity;
        public int minimum;
    }

    [Serializable]
    public class TikTokPlayerData
    {
        public string userId;
        public string uniqueId;
        public string nickname;
        public string avatar;
        public string titleLabel;
        public string titleVariant;
        public int score;
        public int giftPower;
        public long titleExpiresAt;
    }

    [Serializable]
    internal class ClientMessage
    {
        public string type;
        public string role;
        public string username;
        public string action;
        public string giftName;
        public int count;
        public int userIndex;
        public int value;
    }
}
