import { DailyReportDto } from "../dto/daily-report.dto";

export interface EmailPort {
  sendReport(report: DailyReportDto): Promise<void>;
  sendAlert(subject: string, body: string): Promise<void>;
}
