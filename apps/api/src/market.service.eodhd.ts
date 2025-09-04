import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { RedisService } from './redis.service';

const BASE = 'https://eodhd.com/api';
const TOKEN = (process.env.EODHD_API_KEY || '').trim();

@Injectable()
export class MarketServiceEODHD {
  constructor(private http: HttpService, private cache: RedisService) {}

  private ensureToken() {
    if (!TOKEN) throw new Error('EODHD_API_KEY missing');
  }

  async getQuote(symbol: string) {
    this.ensureToken();
    const key = `eodhd:q:${symbol}`;
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached);

    const url = `${BASE}/real-time/${encodeURIComponent(symbol)}.BIST?fmt=json&api_token=${TOKEN}`;
    const { data } = await firstValueFrom(this.http.get(url, { timeout: 10_000 }));
    const out = {
      symbol,
      last: data.close ?? data.price ?? null,
      change: data.change ?? null,
      change_pct: data.change_p ?? data.change_percentage ?? null,
      ts: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
    };
    await this.cache.setex(key, 5, JSON.stringify(out));
    return out;
  }

  async getOHLC(symbol: string, tf = '1d', from?: string, to?: string) {
    this.ensureToken();
    const isIntraday = tf.endsWith('m');
    const key = `eodhd:ohlc:${symbol}:${tf}:${from ?? 'na'}:${to ?? 'na'}`;
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached);

    let url = '';
    if (isIntraday) {
      const interval = tf.replace('m', '');
      url = `${BASE}/intraday/${encodeURIComponent(symbol)}.BIST?api_token=${TOKEN}&interval=${interval}m&fmt=json`;
      if (from) url += `&from=${encodeURIComponent(from)}`;
      if (to) url += `&to=${encodeURIComponent(to)}`;
    } else {
      url = `${BASE}/eod/${encodeURIComponent(symbol)}.BIST?api_token=${TOKEN}&fmt=json`;
      if (from) url += `&from=${encodeURIComponent(from)}`;
      if (to) url += `&to=${encodeURIComponent(to)}`;
    }

    const { data } = await firstValueFrom(this.http.get(url, { timeout: 15_000 }));
    const rows = (Array.isArray(data) ? data : []).map((r: any) => {
      if (r.t && (r.c !== undefined)) {
        const ts = new Date(r.t * 1000).toISOString();
        return { ts, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v ?? null };
      }
      if (r.date && (r.close !== undefined)) {
        const ts = new Date(r.date).toISOString();
        return { ts, o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume ?? null };
      }
      return null;
    }).filter(Boolean);

    await this.cache.setex(key, isIntraday ? 30 : 3600, JSON.stringify({ symbol, tf, rows }));
    return { symbol, tf, rows };
  }
}
