import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: 'localhost',
      port: 1433,
      username: 'tsp_admin',
      password: 'StrongPassword123!',
      database: 'TradeSyncPro',
      entities: [], // Optional if autoLoadEntities is true
      autoLoadEntities: true, // <--- THIS IS THE MISSING KEY
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      synchronize: true,
    }),
  ],
})
export class DatabaseModule {}
