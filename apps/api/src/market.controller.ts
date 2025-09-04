import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller()
export class MarketController {
  constructor(private svc: MarketService) {}

  @Get('quote/:symbol')
  async quote(@Param('symbol') symbol: string) {
    return this.svc.getQuote(symbol.toUpperCase());
  }

  @Get('ohlc/:symbol')
  async ohlc(
    @Param('symbol') symbol: string,
    @Query('tf') tf = '1m',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getOHLC(symbol.toUpperCase(), tf, from, to);
  }
}
