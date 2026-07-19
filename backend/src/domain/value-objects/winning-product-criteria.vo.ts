export class WinningProductCriteria {
  static readonly description = "Score those products against 7 criteria";
  public readonly overallScore: number;

  private constructor(
    // 1. WOW FACTOR (25% weight) - Something unique people haven't seen before
    // The product has surprise/shock value, feels unexpected, novel, or "I didn't know this existed."
    public readonly wowFactor: number,

    // 2. SOLVES PROBLEM (20% weight) - Product solves a real problem for customers
    // Does it address a pain point or real need that people have?
    public readonly solvesProblem: number,

    // 3. MAKES BETTER/EASIER (15% weight) - Adds value to people's lives
    // Does it make life easier, better, or more convenient?
    public readonly makesBetterEasier: number,

    // 4. HIGH PERCEIVED VALUE (15% weight) - People see it as worth a lot of money
    // Do customers perceive this product as expensive/valuable even if it's cheap?
    public readonly highPerceivedValue: number,

    // 5. MASS MARKET APPEAL (10% weight) - Big market, many people will buy it
    // Does it have broad appeal? Will a large audience be interested?
    public readonly massMarketAppeal: number,

    // 6. SPECIFIC NICHE (8% weight) - Product for a specific audience
    // Can be targeted to a specific niche/community of people?
    public readonly specificNiche: number,

    // 7. LIGHTWEIGHT SHIPPING (7% weight) - Small weight, ships easily & cheaply
    // Is it lightweight? Can be shipped easily without high logistics costs?
    public readonly lightweightShipping: number,
  ) {
    this.overallScore = WinningProductCriteria.calculateOverallScore(
      wowFactor,
      solvesProblem,
      makesBetterEasier,
      highPerceivedValue,
      massMarketAppeal,
      specificNiche,
      lightweightShipping,
    );
  }

  static create(values: {
    wowFactor: number;
    solvesProblem: number;
    makesBetterEasier: number;
    highPerceivedValue: number;
    massMarketAppeal: number;
    specificNiche: number;
    lightweightShipping: number;
  }): WinningProductCriteria {
    const keys = [
      "wowFactor",
      "solvesProblem",
      "makesBetterEasier",
      "highPerceivedValue",
      "massMarketAppeal",
      "specificNiche",
      "lightweightShipping",
    ] as const;

    for (const key of keys) {
      const value = values[key];
      if (typeof value !== "number" || value < 0 || value > 100) {
        throw new Error(`${key} must be a number between 0 and 100`);
      }
    }

    return new WinningProductCriteria(
      values.wowFactor,
      values.solvesProblem,
      values.makesBetterEasier,
      values.highPerceivedValue,
      values.massMarketAppeal,
      values.specificNiche,
      values.lightweightShipping,
    );
  }

  static calculateOverallScore(
    wowFactor: number,
    solvesProblem: number,
    makesBetterEasier: number,
    highPerceivedValue: number,
    massMarketAppeal: number,
    specificNiche: number,
    lightweightShipping: number,
  ): number {
    const score =
      wowFactor * 0.25 +
      solvesProblem * 0.2 +
      makesBetterEasier * 0.15 +
      highPerceivedValue * 0.15 +
      massMarketAppeal * 0.1 +
      specificNiche * 0.08 +
      lightweightShipping * 0.07;
    return Math.round(score * 100) / 100;
  }

  isWinner(threshold = 70): boolean {
    return this.overallScore >= threshold;
  }

  getBreakdown(): string {
    return `wowFactor: ${this.wowFactor} (25%), solvesProblem: ${this.solvesProblem} (20%), makesBetterEasier: ${this.makesBetterEasier} (15%), highPerceivedValue: ${this.highPerceivedValue} (15%), massMarketAppeal: ${this.massMarketAppeal} (10%), specificNiche: ${this.specificNiche} (8%), lightweightShipping: ${this.lightweightShipping} (7%), overallScore: ${this.overallScore}`;
  }

  getHtmlBreakdown(): string {
    return `
    <ul>
      <li><strong>WOW Factor:</strong> ${this.wowFactor}%</li>
      <li><strong>Solves Problem:</strong> ${this.solvesProblem}%</li>
      <li><strong>Makes Better/Easier:</strong> ${this.makesBetterEasier}%</li>
      <li><strong>High Perceived Value:</strong> ${this.highPerceivedValue}%</li>
      <li><strong>Mass Market Appeal:</strong> ${this.massMarketAppeal}%</li>
      <li><strong>Specific Niche:</strong> ${this.specificNiche}%</li>
      <li><strong>Lightweight Shipping:</strong> ${this.lightweightShipping}%</li>
      <li><strong>🏆 OVERALL SCORE:</strong> ${this.overallScore}%</li>
    </ul>
  `;
  }

  getProgressBar(score: number, width: number = 30): string {
    const filled = Math.round((score / 100) * width);
    const empty = width - filled;
    return "█".repeat(filled) + "▒".repeat(empty);
  }

  toJSON() {
    return {
      wowFactor: this.wowFactor,
      solvesProblem: this.solvesProblem,
      makesBetterEasier: this.makesBetterEasier,
      highPerceivedValue: this.highPerceivedValue,
      massMarketAppeal: this.massMarketAppeal,
      specificNiche: this.specificNiche,
      lightweightShipping: this.lightweightShipping,
      overallScore: this.overallScore,
    };
  }
}
