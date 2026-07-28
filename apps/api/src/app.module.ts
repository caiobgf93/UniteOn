import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './database/prisma.module';
import { MeModule } from './me/me.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '..', '..', '.env'), '.env'],
    }),
    PrismaModule,
    MeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
