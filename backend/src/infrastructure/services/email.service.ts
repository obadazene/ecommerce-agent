import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { DailyReportDto } from "../../application/dto/daily-report.dto";
import { EmailPort } from "../../application/ports/email.port";
import {
  ProductAnalysis,
  ScoringService,
} from "../../domain/services/scoring.service";
import { WinningProductCriteria } from "../../domain/value-objects/winning-product-criteria.vo";

@Injectable()
export class EmailService implements EmailPort {
  private readonly logger = new Logger(EmailService.name);
  private readonly transport;

  private getConfigWithFallback(...keys: string[]): string | undefined {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value) return value;
    }
    return undefined;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly scoringService: ScoringService,
  ) {
    const smtpUser = this.getConfigWithFallback("SMTP_USER", "EMAIL_USER");
    const smtpPass = this.getConfigWithFallback("SMTP_PASS", "EMAIL_PASSWORD");

    // Warn if using default/placeholder SMTP credentials
    if (
      !smtpUser ||
      smtpUser === "user@example.com" ||
      !smtpPass ||
      smtpPass === "password"
    ) {
      this.logger.warn(
        "⚠️  SMTP credentials not properly configured. Email functionality will not work. " +
          "Please set SMTP_USER, SMTP_PASS, SMTP_FROM, and SMTP_TO in your .env file.",
      );
    }

    this.transport = nodemailer.createTransport({
      host:
        this.getConfigWithFallback("SMTP_HOST", "EMAIL_HOST") ||
        "smtp.gmail.com",
      port: Number(
        this.getConfigWithFallback("SMTP_PORT", "EMAIL_PORT") || 587,
      ),
      secure: false,
      auth: {
        user: smtpUser || "user@example.com",
        pass: smtpPass || "password",
      },
    });
  }

  async sendReport(report: DailyReportDto): Promise<void> {
    this.logger.debug(
      `Sending daily report email for ${report.date.toDateString()}`,
    );

    try {
      const html = this.buildReportHtml(report);
      await this.transport.sendMail({
        from:
          this.getConfigWithFallback("SMTP_FROM", "EMAIL_FROM", "SMTP_USER") ||
          "no-reply@example.com",
        to:
          this.getConfigWithFallback("SMTP_TO", "EMAIL_TO", "SMTP_USER") ||
          "user@example.com",
        subject: `Daily Product Report - ${report.date.toDateString()}`,
        html,
      });

      this.logger.log("Daily report email sent successfully.");
    } catch (error) {
      this.logger.error(
        `Failed to send daily report email: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async sendAlert(subject: string, body: string): Promise<void> {
    this.logger.debug(`Sending alert email with subject: ${subject}`);

    try {
      const html = this.buildAlertHtml(subject, body);
      await this.transport.sendMail({
        from:
          this.getConfigWithFallback("SMTP_FROM", "EMAIL_FROM", "SMTP_USER") ||
          "no-reply@example.com",
        to:
          this.getConfigWithFallback("SMTP_TO", "EMAIL_TO", "SMTP_USER") ||
          "user@example.com",
        subject,
        html,
      });

      this.logger.log("Alert email sent successfully.");
    } catch (error) {
      this.logger.error(
        `Failed to send alert email: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private buildReportHtml(report: DailyReportDto): string {
    const rows = report.products
      .map(
        (product) => `
          <tr>
            <td>${product.name}</td>
            <td>${product.platform}</td>
            <td>${product.price} ${product.currency}</td>
            <td><a href="${product.url}" target="_blank" rel="noopener noreferrer">Open product</a></td>
            <td>${product.sellerRating}</td>
            <td>${product.criteriaScore}</td>
            <td>${product.isNew ? "Yes" : "No"}</td>
          </tr>
        `,
      )
      .join("");

    const scoreBreakdownRows = report.products
      .map((product) => {
        const analysis = this.toProductAnalysis(product);
        const criteria = this.scoringService.evaluateAll(analysis);

        return `
          <tr>
            <td>${product.name}</td>
            <td>
              ${this.getScoreFormula(criteria)}
              ${this.getCriteriaWhyHtml(analysis, criteria)}
            </td>
            <td>${criteria.overallScore}</td>
            <td>${product.criteriaScore ?? 0}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <h1>Daily Product Report</h1>
      <p>Date: ${report.date.toDateString()}</p>
      <p>Total products: ${report.totalProducts}</p>
      <p>Matching products: ${report.matchingProducts}</p>
      <p>New products: ${report.newProducts}</p>
      <p>Average score: ${report.averageScore}</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>Name</th>
            <th>Platform</th>
            <th>Price</th>
            <th>URL</th>
            <th>Seller Rating</th>
            <th>Score</th>
            <th>New</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <h2 style="margin-top: 24px;">How Each Product Score Was Calculated</h2>
      <p>
        Overall score formula:
        <strong>
          wowFactor*0.25 + solvesProblem*0.20 + makesBetterEasier*0.15 + highPerceivedValue*0.15 + massMarketAppeal*0.10 + specificNiche*0.08 + lightweightShipping*0.07
        </strong>
      </p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>Name</th>
            <th>Criteria Breakdown</th>
            <th>Computed Score</th>
            <th>Saved Score</th>
          </tr>
        </thead>
        <tbody>
          ${scoreBreakdownRows}
        </tbody>
      </table>
    `;
  }

  private toProductAnalysis(
    product: DailyReportDto["products"][number],
  ): ProductAnalysis {
    return {
      name: product.name,
      description: product.name,
      price: product.price,
      sellerRating: product.sellerRating,
      weight: null,
      dimensions: null,
      images: product.imageUrl ? [product.imageUrl] : [],
      socialMedia: {
        TikTok: { exists: false, firstPost: null, engagement: 0 },
        Instagram: { exists: false, firstPost: null, engagement: 0 },
        Twitter: { exists: false, firstPost: null, engagement: 0 },
        Facebook: { exists: false, firstPost: null, engagement: 0 },
      },
      crossPlatform: {
        Amazon: { exists: false, price: null },
        Shopify: { exists: false, price: null },
        WooCommerce: { exists: false, price: null },
        eBay: { exists: false, price: null },
      },
    };
  }

  private getScoreFormula(criteria: WinningProductCriteria): string {
    return `WOW ${criteria.wowFactor}, Solves ${criteria.solvesProblem}, Better/Easier ${criteria.makesBetterEasier}, Value ${criteria.highPerceivedValue}, Mass ${criteria.massMarketAppeal}, Niche ${criteria.specificNiche}, Shipping ${criteria.lightweightShipping}`;
  }

  private getCriteriaWhyHtml(
    analysis: ProductAnalysis,
    criteria: WinningProductCriteria,
  ): string {
    const text = `${analysis.name} ${analysis.description}`.toLowerCase();
    const wowSignals = this.matchedKeywords(text, [
      "innovative",
      "unique",
      "new",
      "wireless",
      "portable",
      "exclusive",
      "magic",
      "game-changer",
    ]);
    const solvesSignals = this.matchedKeywords(text, [
      "solve",
      "fix",
      "help",
      "charge",
      "charging",
      "battery",
      "power",
      "outdoor",
      "travel",
      "wireless",
    ]);
    const betterSignals = this.matchedKeywords(text, [
      "easier",
      "better",
      "faster",
      "wireless",
      "portable",
      "quick",
      "simple",
      "convenient",
    ]);
    const valueSignals = this.matchedKeywords(text, [
      "premium",
      "durable",
      "quality",
      "professional",
      "worth",
      "high-end",
      "luxury",
    ]);
    const massSignals = this.matchedKeywords(text, [
      "home",
      "office",
      "daily",
      "everyone",
      "phone",
      "charger",
      "wireless",
      "travel",
    ]);
    const nicheSignals = this.matchedKeywords(text, [
      "gaming",
      "pet",
      "baby",
      "photography",
      "yoga",
      "fishing",
      "diy",
      "studio",
    ]);

    const priceTag = `${Math.round(analysis.price * 100) / 100}`;
    const weightedWow = criteria.wowFactor * 0.25;
    const weightedSolves = criteria.solvesProblem * 0.2;
    const weightedBetter = criteria.makesBetterEasier * 0.15;
    const weightedValue = criteria.highPerceivedValue * 0.15;
    const weightedMass = criteria.massMarketAppeal * 0.1;
    const weightedNiche = criteria.specificNiche * 0.08;
    const weightedShipping = criteria.lightweightShipping * 0.07;
    const total = Math.max(criteria.overallScore, 0.01);

    const wowReason =
      wowSignals.length > 0
        ? `WOW potential is high because novelty cues were detected: ${wowSignals.join(", ")}.`
        : "WOW potential is limited because strong novelty cues were not detected in the product text.";
    const solvesReason =
      solvesSignals.length > 0
        ? `Problem-solving potential is strong because practical signals were detected: ${solvesSignals.join(", ")}.`
        : "Problem-solving evidence is weak because clear problem keywords were not found.";
    const betterReason =
      betterSignals.length > 0
        ? `Ease-of-use impact is strong due to convenience signals: ${betterSignals.join(", ")}.`
        : "Ease-of-use impact is moderate because convenience signals are limited.";
    const valueReason =
      valueSignals.length > 0
        ? `Perceived value is supported by quality signals (${valueSignals.join(", ")}) and current price (${priceTag}).`
        : `Perceived value comes mostly from price (${priceTag}) and seller/image signals, not strong premium wording.`;
    const massReason =
      massSignals.length > 0
        ? `Market size appears broad because mass-use signals were found: ${massSignals.join(", ")}.`
        : "Market size may be narrower because broad-use signals are weak.";
    const nicheReason =
      nicheSignals.length > 0
        ? `Niche targeting exists because niche signals were found: ${nicheSignals.join(", ")}.`
        : "This appears less niche-specific because few dedicated niche signals were found.";
    const shippingReason =
      analysis.weight === null || analysis.weight <= 0
        ? "Shipping ease was estimated from text hints because exact weight is missing."
        : `Shipping ease was estimated using weight ${analysis.weight}kg.`;

    return `
      <div style="margin-top:8px; font-size:12px; line-height:1.4; color:#333;">
        <div><strong>Reasoning for this product:</strong></div>
        <ul style="margin:6px 0 0 16px; padding:0;">
          <li><strong>WOW (${criteria.wowFactor})</strong>: ${wowReason} Contribution=${weightedWow.toFixed(2)} (${((weightedWow / total) * 100).toFixed(1)}% of final score).</li>
          <li><strong>Solves Problem (${criteria.solvesProblem})</strong>: ${solvesReason} Contribution=${weightedSolves.toFixed(2)} (${((weightedSolves / total) * 100).toFixed(1)}% of final score).</li>
          <li><strong>Makes Better/Easier (${criteria.makesBetterEasier})</strong>: ${betterReason} Contribution=${weightedBetter.toFixed(2)} (${((weightedBetter / total) * 100).toFixed(1)}% of final score).</li>
          <li><strong>High Value (${criteria.highPerceivedValue})</strong>: ${valueReason} Contribution=${weightedValue.toFixed(2)} (${((weightedValue / total) * 100).toFixed(1)}% of final score).</li>
          <li><strong>Mass Market (${criteria.massMarketAppeal})</strong>: ${massReason} Contribution=${weightedMass.toFixed(2)} (${((weightedMass / total) * 100).toFixed(1)}% of final score).</li>
          <li><strong>Specific Niche (${criteria.specificNiche})</strong>: ${nicheReason} Contribution=${weightedNiche.toFixed(2)} (${((weightedNiche / total) * 100).toFixed(1)}% of final score).</li>
          <li><strong>Lightweight Shipping (${criteria.lightweightShipping})</strong>: ${shippingReason} Contribution=${weightedShipping.toFixed(2)} (${((weightedShipping / total) * 100).toFixed(1)}% of final score).</li>
        </ul>
      </div>
    `;
  }

  private matchedKeywords(text: string, tokens: string[]): string[] {
    return tokens.filter((token) => text.includes(token));
  }

  private buildAlertHtml(subject: string, body: string): string {
    return `
      <h1>${subject}</h1>
      <p>${body}</p>
    `;
  }
}
