import { Injectable } from "@nestjs/common";
import { TechnologyUpdate } from "../../domain/value-objects/technology-update.vo";
import { Result } from "../../shared/result";

@Injectable()
export class CheckTechUpdatesUseCase {
  async execute(): Promise<Result<TechnologyUpdate[]>> {
    try {
      const updates: TechnologyUpdate[] = [];
      return Result.success(updates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.failure(`Technology update check failed: ${message}`);
    }
  }
}
