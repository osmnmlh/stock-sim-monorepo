import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { RedisService } from './redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    HttpModule,
  ],
  controllers: [HealthController, MarketController],
  providers: [MarketService, RedisService],
})
export class AppModule {}
