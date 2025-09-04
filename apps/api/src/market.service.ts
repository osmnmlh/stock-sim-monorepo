import { HttpService } from '@nestjs/axios';
import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisService } from './redis.service';

const BASE = 'https://eodhd.com/api';
const SUFFIXES = ['.IS', '.BIST', '.US', '']; // sırayla dene

function buildTriedMsg(ctx: string, tried: string[]) {
  return new HttpException(
    {
      message: `${ctx}: ticker not found on EODHD`,
      tried,
      hint: 'Sembol doğru mu? (örn: AKBNK, THYAO, GARAN, AAPL)',
    },
    404,
  );
}

@Injectable()
export class MarketService {
  constructor(
    private http: HttpService,
    private cache: RedisService,
    private config: ConfigService,
  ) {}

  private getToken(): string {
    const t = (this.config.get<string>('EODHD_API_KEY') || '').trim();
    if (!t) throw new Error('EODHD_API_KEY missing');
    return t;
  }

  private async tryGet(urls: string[], timeout = 12000): Promise<any> {
    let lastErr: any;
    for (const u of urls) {
      try {
        const { data } = await firstValueFrom(this.http.get(u, { timeout }));
        return data;
      } catch (e: any) {
        lastErr = e;
        // 404/“Ticker Not Found” ise diğer suffix'e geç
        const txt = (e?.response?.data && typeof e.response.data === 'string')
          ? e.response.data.toLowerCase() : '';
        const status = e?.response?.status;
        const notFound = status === 404 || txt.includes('ticker not found');
        if (!notFound) throw e; // 403/429 gibi durumlarda direkt fırlat
      }
    }
    throw lastErr ?? new Error('All variants failed');
  }

  async getQuote(symbol: string) {
    const token = this.getToken();
    const key = `q:${symbol}`;
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached);

    const realUrls = SUFFIXES.map(sfx => `${BASE}/real-time/${encodeURIComponent(symbol + sfx)}?fmt=json&api_token=${token}`);

    // 1) Real-time dene
    try {
      const data = await this.tryGet(realUrls, 10000);
      const out = {
        symbol,
        last: data.close ?? data.price ?? null,
        change: data.change ?? null,
        change_pct: data.change_p ?? data.change_percentage ?? null,
        ts: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
      };
      await this.cache.setex(key, 5, JSON.stringify(out));
      return out;
    } catch (e: any) {
      // 2) Fallback: EOD son kapanış (free planda çalışır)
      try {
        const eodUrls = SUFFIXES.map(sfx => `${BASE}/eod/${encodeURIComponent(symbol + sfx)}?api_token=${token}&fmt=json`);
        const data = await this.tryGet(eodUrls, 10000);
        const lastRow = Array.isArray(data) && data.length ? data[data.length - 1] : null;
        if (!lastRow) throw buildTriedMsg('quote', realUrls.concat(eodUrls));
        const out = {
          symbol,
          last: lastRow.close ?? null,
          change: null,
          change_pct: null,
          ts: lastRow.date ? new Date(lastRow.date).toISOString() : new Date().toISOString(),
        };
        await this.cache.setex(key, 30, JSON.stringify(out));
        return out;
      } catch (e2: any) {
        throw buildTriedMsg('quote', realUrls);
      }
    }
  }

  /**
   * tf: 1m|5m|1d|1w|1mo
   */
  async getOHLC(symbol: string, tf = '1m', from?: string, to?: string) {
    const token = this.getToken();
    const isIntraday = tf.endsWith('m');
    const key = `ohlc:${symbol}:${tf}:${from ?? 'na'}:${to ?? 'na'}`;
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached);

    const makeUrl = (sfx: string, intraday: boolean) => {
      const sym = encodeURIComponent(symbol + sfx);
      if (intraday) {
        const interval = tf.replace('m', '');
        let u = `${BASE}/intraday/${sym}?api_token=${token}&interval=${interval}m&fmt=json`;
        if (from) u += `&from=${encodeURIComponent(from)}`;
        if (to) u += `&to=${encodeURIComponent(to)}`;
        return u;
      } else {
        let u = `${BASE}/eod/${sym}?api_token=${token}&fmt=json`;
        if (from) u += `&from=${encodeURIComponent(from)}`;
        if (to) u += `&to=${encodeURIComponent(to)}`;
        return u;
      }
    };

    // 1) Önce talep edilen tf'yi dene
    const urls = SUFFIXES.map(sfx => makeUrl(sfx, isIntraday));
    try {
      const data = await this.tryGet(urls, isIntraday ? 12000 : 15000);
      const rows = (Array.isArray(data) ? data : []).map((r: any) => {
        if (r?.t != null && r?.c != null) {
          const ts = new Date(r.t * 1000).toISOString();
          return { ts, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v ?? null };
        }
        if (r?.date && r?.close != null) {
          const ts = new Date(r.date).toISOString();
          return { ts, o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume ?? null };
        }
        return null;
      }).filter(Boolean);
      await this.cache.setex(key, isIntraday ? 30 : 3600, JSON.stringify({ symbol, tf, rows }));
      return { symbol, tf, rows };
    } catch (e: any) {
      // 2) Intraday başarısızsa günlük fallback
      if (isIntraday) {
        const eodUrls = SUFFIXES.map(sfx => makeUrl(sfx, false));
        try {
          const data = await this.tryGet(eodUrls, 15000);
          const rows = (Array.isArray(data) ? data : []).map((r: any) => {
            if (r?.date && r?.close != null) {
              const ts = new Date(r.date).toISOString();
              return { ts, o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume ?? null };
            }
            return null;
          }).filter(Boolean);
          await this.cache.setex(key, 3600, JSON.stringify({ symbol, tf: '1d', rows }));
          return { symbol, tf: '1d', rows };
        } catch {
          throw buildTriedMsg('ohlc', urls);
        }
      }
      throw buildTriedMsg('ohlc', urls);
    }
  }
}
