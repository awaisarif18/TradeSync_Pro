import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeGateway } from './trade.gateway';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { User } from '../database/user.entity';
import { TradeLog } from '../database/tradelog.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  // NEW: Add TypeOrmModule imports here
  imports: [TypeOrmModule.forFeature([User, TradeLog]), forwardRef(() => AuthModule)],
  controllers: [TradeController],
  providers: [TradeGateway, TradeService],
  exports: [TradeService, TradeGateway],
})
export class TradeModule {}
