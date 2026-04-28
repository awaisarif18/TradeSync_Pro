import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { DatabaseModule } from './database/database.module';
import { TradeModule } from './trade/trade.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // cwd may be repo root or backend; also resolve .env next to compiled output (../.env from dist/)
      envFilePath: [join(process.cwd(), '.env'), join(__dirname, '..', '.env')],
    }),
    DatabaseModule,
    TradeModule,
    AuthModule,
  ],
})
export class AppModule {}
