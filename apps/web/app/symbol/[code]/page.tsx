"use client";

import { useEffect, useMemo, useState } from "react";
import PriceChart from "@/components/PriceChart";

type Quote = { symbol: string; last: number | null; change: number | null; change_pct: number | null; ts: string };
type OHLCRow = { ts: string; o: number; h: number; l: number; c: number; v?: number | null };
type OHLCResp = { symbol: string; tf: string; rows: OHLCRow[] };

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export default function SymbolPage({ params }: { params: { code: string } }) {
  const symbol = params.code.toUpperCase();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [ohlc, setOhlc] = useState<OHLCResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const tf = "1d";

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [qRes, oRes] = await Promise.all([
        fetch(`${API}/quote/${symbol}`, { cache: "no-store" }),
        fetch(`${API}/ohlc/${symbol}?tf=${tf}`, { cache: "no-store" }),
      ]);
      if (!qRes.ok) throw new Error(`quote: ${qRes.status}`);
      if (!oRes.ok) throw new Error(`ohlc: ${oRes.status}`);
      const q = (await qRes.json()) as Quote;
      const o = (await oRes.json()) as OHLCResp;
      setQuote(q);
      setOhlc(o);
    } catch (e: any) {
      setErr(e?.message || "yükleme hatası");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [symbol, tf]);

  const lastRow = useMemo(() => (ohlc?.rows?.length ? ohlc.rows[ohlc.rows.length - 1] : null), [ohlc]);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{symbol}</h1>
          <p className="text-sm text-gray-500">{quote ? new Date(quote.ts).toLocaleString() : "—"}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{quote?.last ?? (lastRow ? lastRow.c : "—")}</div>
          <div className={Number(quote?.change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
            {quote?.change_pct != null ? `${quote.change_pct}%` : ""}
          </div>
        </div>
      </header>

      {loading && <div>Yükleniyor…</div>}
      {err && <div className="text-red-600">Hata: {err}</div>}

      {ohlc?.rows?.length ? (
        <>
          <section className="rounded-2xl border p-3">
            <PriceChart rows={ohlc.rows} />
          </section>

          <section className="rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Tarih</th>
                    <th className="px-3 py-2 text-right">Açılış</th>
                    <th className="px-3 py-2 text-right">Yüksek</th>
                    <th className="px-3 py-2 text-right">Düşük</th>
                    <th className="px-3 py-2 text-right">Kapanış</th>
                    <th className="px-3 py-2 text-right">Hacim</th>
                  </tr>
                </thead>
                <tbody>
                  {ohlc.rows.slice(-200).reverse().map((r) => (
                    <tr key={r.ts} className="border-t">
                      <td className="px-3 py-2">{new Date(r.ts).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right">{r.o}</td>
                      <td className="px-3 py-2 text-right">{r.h}</td>
                      <td className="px-3 py-2 text-right">{r.l}</td>
                      <td className="px-3 py-2 text-right">{r.c}</td>
                      <td className="px-3 py-2 text-right">{r.v ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        !loading && <div className="rounded-2xl border p-4">Veri yok.</div>
      )}
    </div>
  );
}
