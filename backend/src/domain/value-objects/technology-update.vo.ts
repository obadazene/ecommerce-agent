export interface TechnologyUpdate {
  packageName: string; // e.g., "@nestjs/core"
  currentVersion: string; // e.g., "10.4.0"
  latestVersion: string; // e.g., "11.0.0"
  releaseDate: Date; // When it was released
  releaseNotes: string; // Summary of changes
  migrationGuide?: string; // Link to migration guide
  recommendation: "upgrade" | "review" | "skip";
}
