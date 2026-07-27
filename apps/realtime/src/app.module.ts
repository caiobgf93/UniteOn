import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { PresenceGateway } from './presence/presence.gateway';
import { PresenceStore } from './presence/presence.store';
import { MediaService } from './media/media.service';

@Module({
  imports: [
    // Lê o .env da raiz do monorepo (o app roda a partir de apps/realtime).
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '..', '..', '.env'), '.env'],
    }),
    RedisModule,
  ],
  providers: [PresenceGateway, PresenceStore, MediaService],
})
export class AppModule {}
