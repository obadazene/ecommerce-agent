import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Genkit } from "genkit";

@Injectable()
export class GenkitService implements OnModuleInit {
  private readonly logger = new Logger(GenkitService.name);
  private client: any;

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    this.client = new Genkit({
      apiKey: process.env.GENKIT_API_KEY || "",
      defaultProvider: "gemini",
      providers: [
        { name: "gemini", type: "Gemini" },
        { name: "groq", type: "Groq" },
        { name: "mistral", type: "Mistral" },
      ],
    } as any);

    this.registerMiddleware();
    this.createTools();
    this.createFlows();

    this.logger.log("Genkit initialized with Gemini, Groq, and Mistral");
  }

  private registerMiddleware(): void {
    if (!this.client || typeof this.client.use !== "function") {
      return;
    }

    const retryMiddleware = async (context: any, next: any) => {
      let attempts = 0;
      while (attempts < 3) {
        try {
          return await next();
        } catch (error) {
          attempts += 1;
          this.logger.warn(`Genkit retry attempt ${attempts}`);
          if (attempts >= 3) {
            throw error;
          }
        }
      }
    };

    const errorMiddleware = async (context: any, next: any) => {
      try {
        return await next();
      } catch (error) {
        this.logger.error("Genkit request failed", error as Error);
        throw error;
      }
    };

    const loggingMiddleware = async (context: any, next: any) => {
      this.logger.debug(`Genkit request: ${JSON.stringify(context)}`);
      const response = await next();
      this.logger.debug(`Genkit response: ${JSON.stringify(response)}`);
      return response;
    };

    this.client.use(retryMiddleware);
    this.client.use(errorMiddleware);
    this.client.use(loggingMiddleware);
  }

  private createTools(): void {
    if (!this.client || typeof this.client.registerTool !== "function") {
      return;
    }

    this.client.registerTool({
      name: "searchProducts",
      description: "Search products across supported e-commerce platforms.",
      execute: async (input: any) => {
        return { data: input };
      },
    });

    this.client.registerTool({
      name: "analyzeProduct",
      description: "Analyze and score a product using AI criteria.",
      execute: async (input: any) => {
        return { data: input };
      },
    });
  }

  private createFlows(): void {
    if (!this.client || typeof this.client.registerFlow !== "function") {
      return;
    }

    this.client.registerFlow({
      name: "productDiscoveryFlow",
      description: "Flow for discovering and scoring new products.",
      run: async (input: any) => {
        return { result: input };
      },
    });
  }
}
