import { WinningProductCriteria } from "../value-objects/winning-product-criteria.vo";

export interface SocialMediaChannelAnalysis {
  exists: boolean;
  firstPost: Date | null;
  engagement: number;
}

export interface CrossPlatformChannelAnalysis {
  exists: boolean;
  price: number | null;
}

export interface ProductAnalysis {
  name: string;
  description: string;
  price: number;
  sellerRating: number | null;
  weight: number | null;
  dimensions: string | null;
  images: string[];
  socialMedia: {
    TikTok: SocialMediaChannelAnalysis;
    Instagram: SocialMediaChannelAnalysis;
    Twitter: SocialMediaChannelAnalysis;
    Facebook: SocialMediaChannelAnalysis;
  };
  crossPlatform: {
    Amazon: CrossPlatformChannelAnalysis;
    Shopify: CrossPlatformChannelAnalysis;
    WooCommerce: CrossPlatformChannelAnalysis;
    eBay: CrossPlatformChannelAnalysis;
  };
}

export class ScoringService {
  evaluateWowFactor(analysis: ProductAnalysis): number {
    const text = `${analysis.name} ${analysis.description}`.toLowerCase();
    const noveltyKeywords = [
      "innovative",
      "unique",
      "new",
      "revolutionary",
      "unexpected",
      "wow",
      "magic",
      "game-changer",
      "exclusive",
      "never seen",
      "first",
      "portable",
      "wireless",
    ];
    const noveltyMatches = noveltyKeywords.reduce(
      (score, keyword) => (text.includes(keyword) ? score + 1 : score),
      0,
    );
    const noveltyScore = Math.min(noveltyMatches * 22, 88);
    const imageScore = analysis.images.length > 0 ? 8 : 0;
    const socialSignal = Object.values(analysis.socialMedia).some(
      (channel) => channel.exists || channel.engagement > 1000,
    )
      ? 8
      : 0;

    return this.clampScore(noveltyScore + imageScore + socialSignal);
  }

  evaluateSolvesProblem(analysis: ProductAnalysis): number {
    const text = `${analysis.name} ${analysis.description}`.toLowerCase();
    const problemIndicators = [
      "solve",
      "fix",
      "help",
      "prevent",
      "reduce",
      "avoid",
      "protect",
      "repair",
      "keep",
      "stop",
      "eliminate",
      "charge",
      "charging",
      "battery",
      "power",
      "portable",
      "outside",
      "outdoor",
      "travel",
      "wireless",
    ];
    const strongSignals = [
      "problem",
      "pain",
      "frustration",
      "need",
      "issue",
      "challenge",
      "dead battery",
      "no power",
    ];
    const count = problemIndicators.reduce(
      (sum, token) => (text.includes(token) ? sum + 1 : sum),
      0,
    );
    const strongCount = strongSignals.reduce(
      (sum, token) => (text.includes(token) ? sum + 1 : sum),
      0,
    );
    const sellerBonus = analysis.sellerRating ? analysis.sellerRating * 3 : 0;

    return this.clampScore(
      Math.min(100, count * 10 + strongCount * 14 + sellerBonus),
    );
  }

  evaluateMakesBetterEasier(analysis: ProductAnalysis): number {
    const text = `${analysis.name} ${analysis.description}`.toLowerCase();
    const improvementKeywords = [
      "faster",
      "easier",
      "more efficient",
      "simplify",
      "convenient",
      "automatic",
      "streamline",
      "time-saving",
      "stress-free",
      "better",
      "upgrade",
      "wireless",
      "portable",
      "hands-free",
      "quick",
      "easy",
      "simple",
    ];
    const scoreFromKeywords = improvementKeywords.reduce(
      (score, keyword) => (text.includes(keyword) ? score + 10 : score),
      0,
    );
    const imageBonus = analysis.images.length >= 2 ? 8 : 0;
    const socialMediaSignalBonus = Object.values(analysis.socialMedia).some(
      (channel) => channel.engagement > 1000,
    )
      ? 12
      : 0;
    const sellerBonus = analysis.sellerRating ? analysis.sellerRating * 2 : 0;

    return this.clampScore(
      scoreFromKeywords + imageBonus + socialMediaSignalBonus + sellerBonus,
    );
  }

  evaluateMassMarketAppeal(analysis: ProductAnalysis): number {
    const text = `${analysis.name} ${analysis.description}`.toLowerCase();
    const massMarketKeywords = [
      "home",
      "office",
      "kitchen",
      "travel",
      "daily",
      "family",
      "outdoor",
      "everyday",
      "fitness",
      "beauty",
      "lifestyle",
      "mobile",
      "school",
      "phone",
      "charger",
      "wireless",
      "daily use",
      "everyone",
    ];
    const nicheKeywords = [
      "golf",
      "gaming",
      "pet",
      "baby",
      "photography",
      "yoga",
      "fishing",
      "car",
      "cosplay",
      "hobby",
    ];
    const massMatch = massMarketKeywords.reduce(
      (score, keyword) => (text.includes(keyword) ? score + 10 : score),
      0,
    );
    const nicheMatch = nicheKeywords.reduce(
      (score, keyword) => (text.includes(keyword) ? score + 15 : score),
      0,
    );
    const platformCount = Object.values(analysis.crossPlatform).filter(
      (channel) => channel.exists,
    ).length;
    const platformScore = Math.min(platformCount, 4) * 8;
    const sellerBoost = analysis.sellerRating ? analysis.sellerRating * 4 : 0;

    return this.clampScore(
      massMatch + platformScore + sellerBoost - nicheMatch * 0.5,
    );
  }

  evaluateSpecificNiche(analysis: ProductAnalysis): number {
    const text = `${analysis.name} ${analysis.description}`.toLowerCase();
    const nicheKeywords = [
      "pet",
      "golf",
      "gaming",
      "yoga",
      "fishing",
      "craft",
      "baby",
      "photography",
      "artisan",
      "outdoor",
      "motorcycle",
      "home brew",
      "diy",
      "studio",
    ];
    const nicheMatchCount = nicheKeywords.reduce(
      (count, keyword) => (text.includes(keyword) ? count + 1 : count),
      0,
    );
    const crossPlatformCount = Object.values(analysis.crossPlatform).filter(
      (channel) => channel.exists,
    ).length;
    const nicheBoost =
      nicheMatchCount > 0 ? Math.min(nicheMatchCount * 20, 60) : 0;
    const platformBonus = crossPlatformCount <= 1 ? 15 : 0;
    const massMarketPenalty =
      this.evaluateMassMarketAppeal(analysis) > 70 ? 0 : 10;

    return this.clampScore(nicheBoost + platformBonus + massMarketPenalty);
  }

  evaluateHighPerceivedValue(analysis: ProductAnalysis): number {
    const text = `${analysis.name} ${analysis.description}`.toLowerCase();
    const valueKeywords = [
      "premium",
      "luxury",
      "deluxe",
      "professional",
      "high-end",
      "crafted",
      "handmade",
      "designer",
      "professional",
      "durable",
      "quality",
      "worth",
    ];
    const keywordScore = valueKeywords.reduce(
      (score, token) => (text.includes(token) ? score + 10 : score),
      0,
    );
    const priceScore = Math.min(60, Math.round((analysis.price / 120) * 100));
    const sellerScore = analysis.sellerRating ? analysis.sellerRating * 8 : 0;
    const imageCountScore = Math.min(analysis.images.length, 4) * 7;

    return this.clampScore(
      keywordScore + priceScore + sellerScore * 0.35 + imageCountScore,
    );
  }

  evaluateLightweightShipping(analysis: ProductAnalysis): number {
    if (analysis.weight === null || analysis.weight <= 0) {
      const text = `${analysis.name} ${analysis.description}`.toLowerCase();
      const lightweightHints = [
        "mini",
        "portable",
        "wireless",
        "compact",
        "travel",
        "lightweight",
      ];
      const hintCount = lightweightHints.reduce(
        (count, token) => (text.includes(token) ? count + 1 : count),
        0,
      );

      if (hintCount >= 3) return 80;
      if (hintCount >= 1) return 65;
      return 50;
    }

    if (analysis.weight <= 0.5) {
      return 100;
    }
    if (analysis.weight <= 1.5) {
      return 85;
    }
    if (analysis.weight <= 3) {
      return 65;
    }
    if (analysis.weight <= 5) {
      return 40;
    }
    return 20;
  }

  evaluateAll(analysis: ProductAnalysis): WinningProductCriteria {
    return WinningProductCriteria.create({
      wowFactor: this.evaluateWowFactor(analysis),
      solvesProblem: this.evaluateSolvesProblem(analysis),
      makesBetterEasier: this.evaluateMakesBetterEasier(analysis),
      highPerceivedValue: this.evaluateHighPerceivedValue(analysis),
      massMarketAppeal: this.evaluateMassMarketAppeal(analysis),
      specificNiche: this.evaluateSpecificNiche(analysis),
      lightweightShipping: this.evaluateLightweightShipping(analysis),
    });
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
