import { Injectable } from "@nestjs/common";
import { readFile } from "fs/promises";
import * as path from "path";
import { TechnologyUpdate } from "../../domain/value-objects/technology-update.vo";
import { Result } from "../../shared/result";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

@Injectable()
export class CheckTechUpdatesUseCase {
  private readonly trackedPackages = [
    "@nestjs/common",
    "@nestjs/core",
    "@nestjs/config",
    "@nestjs/platform-express",
    "@nestjs/schedule",
    "@nestjs/swagger",
    "@nestjs/throttler",
    "@prisma/client",
    "prisma",
    "typescript",
    "class-validator",
    "class-transformer",
    "helmet",
    "nodemailer",
  ];

  private cleanVersion(rawVersion: string | undefined): string {
    return (rawVersion ?? "").replace(/^[\^~><=\s]*/, "").trim();
  }

  private parseVersion(
    version: string,
  ): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return null;
    }

    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    };
  }

  private isNewerVersion(
    currentVersion: string,
    latestVersion: string,
  ): boolean {
    const current = this.parseVersion(currentVersion);
    const latest = this.parseVersion(latestVersion);

    if (!current || !latest) {
      return latestVersion !== currentVersion;
    }

    if (latest.major !== current.major) {
      return latest.major > current.major;
    }

    if (latest.minor !== current.minor) {
      return latest.minor > current.minor;
    }

    return latest.patch > current.patch;
  }

  private buildRecommendation(
    currentVersion: string,
    latestVersion: string,
  ): "upgrade" | "review" | "skip" {
    if (!currentVersion || !latestVersion) {
      return "review";
    }

    const current = this.parseVersion(currentVersion);
    const latest = this.parseVersion(latestVersion);

    if (!current || !latest) {
      return currentVersion === latestVersion ? "skip" : "review";
    }

    if (latest.major > current.major) {
      return "upgrade";
    }

    if (latest.major === current.major && latest.minor > current.minor) {
      return "review";
    }

    return "skip";
  }

  private async loadPackageJson(): Promise<PackageJson> {
    const packagePath = path.resolve(process.cwd(), "package.json");
    const raw = await readFile(packagePath, "utf8");
    return JSON.parse(raw) as PackageJson;
  }

  private getCurrentVersion(
    packageJson: PackageJson,
    packageName: string,
  ): string {
    return this.cleanVersion(
      packageJson.dependencies?.[packageName] ??
        packageJson.devDependencies?.[packageName],
    );
  }

  private async fetchLatestMetadata(packageName: string): Promise<{
    latestVersion: string;
    releaseDate: Date;
    releaseNotes: string;
    homepage?: string;
  } | null> {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      {
        headers: {
          Accept: "application/vnd.npm.install-v1+json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      "dist-tags"?: { latest?: string };
      time?: Record<string, string>;
      description?: string;
      homepage?: string;
    };

    const latestVersion = payload["dist-tags"]?.latest;
    if (!latestVersion) {
      return null;
    }

    const releaseDate = payload.time?.[latestVersion]
      ? new Date(payload.time[latestVersion])
      : new Date();

    return {
      latestVersion,
      releaseDate,
      releaseNotes:
        payload.description || `Latest npm release for ${packageName}`,
      homepage: payload.homepage,
    };
  }

  async execute(): Promise<Result<TechnologyUpdate[]>> {
    try {
      const packageJson = await this.loadPackageJson();
      const updates: TechnologyUpdate[] = [];

      for (const packageName of this.trackedPackages) {
        const currentVersion = this.getCurrentVersion(packageJson, packageName);
        if (!currentVersion) {
          continue;
        }

        const metadata = await this.fetchLatestMetadata(packageName);
        if (!metadata) {
          continue;
        }

        if (!this.isNewerVersion(currentVersion, metadata.latestVersion)) {
          continue;
        }

        updates.push({
          packageName,
          currentVersion,
          latestVersion: metadata.latestVersion,
          releaseDate: metadata.releaseDate,
          releaseNotes: metadata.releaseNotes,
          migrationGuide: metadata.homepage,
          recommendation: this.buildRecommendation(
            currentVersion,
            metadata.latestVersion,
          ),
        });
      }

      updates.sort(
        (left, right) =>
          right.releaseDate.getTime() - left.releaseDate.getTime(),
      );
      return Result.success(updates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Technology update check failed: ${message}`);
    }
  }
}
