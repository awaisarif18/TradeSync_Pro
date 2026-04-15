import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { TradeModule } from './trade/trade.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [DatabaseModule, TradeModule, AuthModule],
})
export class AppModule {}
