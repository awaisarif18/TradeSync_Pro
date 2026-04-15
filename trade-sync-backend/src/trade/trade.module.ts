import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeGateway } from './trade.gateway';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { User } from '../database/user.entity';
import { TradeLog } from '../database/tradelog.entity';

@Module({
  // NEW: Add TypeOrmModule imports here
  imports: [TypeOrmModule.forFeature([User, TradeLog])],
  controllers: [TradeController],
  providers: [TradeGateway, TradeService],
  exports: [TradeService],
})
export class TradeModule {}
