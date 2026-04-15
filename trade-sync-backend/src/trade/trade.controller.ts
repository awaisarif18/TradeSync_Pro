import { Controller, Get, Param } from '@nestjs/common';
import { TradeService } from './trade.service';

@Controller('trades')
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Get('history')
  async getTradeHistory() {
    // Fetches the last 50 logs from your SQL Server TradeLog table
    return await this.tradeService.getLatestLogs(50);
  }

  @Get('master/:masterId/history')
  async getMasterHistory(@Param('masterId') masterId: string) {
    return await this.tradeService.getMasterHistory(masterId);
  }

  @Get('stats')
  async getStats() {
    // This will eventually return win/loss ratios and active slave counts
    return { activeSlaves: 1, totalSignals: 100, status: 'Healthy' };
  }
}
