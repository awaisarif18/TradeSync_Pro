import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../database/user.entity';
import { TradeLog } from '../database/tradelog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, TradeLog])],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
