'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, ReferenceArea, ReferenceLine,
} from 'recharts';

const RANGE_OPTIONS = [
  { key: '1y', label: '1 Tahun', days: 365 },
  { key: '5y', label: '5 Tahun', days: 365 * 5 },
  { key: '10y', label: '10 Tahun', days: 365 * 10 },
  { key: 'all', label: 'Semua', days: Infinity },
];

const REGIME_COLOR = { BULL: '#c9a961', BEAR: '#a8582f' };

function formatRupiah(value) {
  if (value == null) return '-';
  return `Rp${Number(value).toLocaleString('id-ID')}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2">
      <p className="label-mono mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm" style={{ color: p.color }}>
          {p.name}: {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
}

function IngotMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 8L7 5H17L20 8V16L17 19H7L4 16V8Z" stroke="#c9a961" strokeWidth="1.4" />
      <path d="M4 8H20M7 5V19M17 5V19" stroke="#c9a961" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export default function GoldPriceDashboard() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState('5y');
  const [showForecast, setShowForecast] = useState(true);
  const [showRegimes, setShowRegimes] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/gold_dashboard_data.json')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    const opt = RANGE_OPTIONS.find((r) => r.key === range);
    const cutoff = new Date(data.summary.current_date);
    cutoff.setDate(cutoff.getDate() - opt.days);

    const priceRows = data.prices
      .filter((p) => opt.days === Infinity || new Date(p.date) >= cutoff)
      .map((p) => ({ date: p.date, price: p.price }));

    const forecastRows = showForecast
      ? data.forecast.map((f) => ({ date: f.date, forecast: f.yhat }))
      : [];

    return [...priceRows, ...forecastRows];
  }, [data, range, showForecast]);

  const visibleRegimes = useMemo(() => {
    if (!data || !showRegimes) return [];
    const opt = RANGE_OPTIONS.find((r) => r.key === range);
    const cutoff = new Date(data.summary.current_date);
    cutoff.setDate(cutoff.getDate() - opt.days);
    return data.regimes.filter((r) => opt.days === Infinity || new Date(r.end) >= cutoff);
  }, [data, range, showRegimes]);

  const visibleEvents = useMemo(() => {
    if (!data || !showEvents) return [];
    const opt = RANGE_OPTIONS.find((r) => r.key === range);
    const cutoff = new Date(data.summary.current_date);
    cutoff.setDate(cutoff.getDate() - opt.days);
    return data.events.filter((e) => opt.days === Infinity || new Date(e.date) >= cutoff);
  }, [data, range, showEvents]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-bg">
        <p className="label-mono animate-pulse">Memuat data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-bg">
        <p className="text-sm text-ink-muted">Data tidak dapat dimuat.</p>
      </div>
    );
  }

  const { summary } = data;
  const isPositiveYtd = summary.ytd_change_pct >= 0;

  return (
    <div className="flex min-h-screen bg-ink-bg">
      {/* SIDEBAR */}
      <aside className="w-64 shrink-0 border-r border-ink-border p-5 flex flex-col gap-8">
        <div className="flex items-center gap-2.5">
          <IngotMark />
          <span className="font-display font-semibold text-sm tracking-tight">Gold Analysis</span>
        </div>

        <div>
          <p className="label-mono mb-3">Rentang Waktu</p>
          <div className="flex flex-col gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200 ease-smooth ${
                  range === opt.key
                    ? 'bg-gold/10 text-gold border border-gold/30'
                    : 'text-ink-muted hover:text-ink-text border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-mono mb-3">Lapisan Data</p>
          <div className="flex flex-col gap-1">
            {[
              { key: 'forecast', label: 'Forecast', state: showForecast, setter: setShowForecast },
              { key: 'regimes', label: 'Fase Bull / Bear', state: showRegimes, setter: setShowRegimes },
              { key: 'events', label: 'Peristiwa Global', state: showEvents, setter: setShowEvents },
            ].map((toggle) => (
              <button
                key={toggle.key}
                onClick={() => toggle.setter((v) => !v)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-ink-text hover:bg-white/[0.03] transition-colors duration-200"
              >
                {toggle.label}
                <span
                  className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${
                    toggle.state ? 'bg-gold/40' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-ink-text transition-transform duration-200 ${
                      toggle.state ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <p className="label-mono mb-2">Sumber Data</p>
          <p className="text-xs text-ink-muted leading-relaxed">
            {data.meta.source}, {data.prices.length.toLocaleString('id-ID')} observasi harian sejak 2010.
          </p>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-ink-border flex items-center justify-between px-6">
          <div>
            <h1 className="font-display font-semibold text-base">Harga Emas Antam</h1>
            <p className="label-mono">Diperbarui {summary.current_date}</p>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
              summary.current_regime === 'BULL'
                ? 'border-gold/30 text-gold'
                : 'border-bronze/40 text-bronze'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Fase {summary.current_regime}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Harga Terkini', value: formatRupiah(summary.current_price) },
              { label: 'All-Time High', value: formatRupiah(summary.all_time_high) },
              {
                label: 'Perubahan YTD',
                value: `${isPositiveYtd ? '+' : ''}${summary.ytd_change_pct}%`,
                accent: isPositiveYtd,
              },
              { label: 'Volatilitas 30H', value: `${summary.current_volatility}%` },
            ].map((card) => (
              <div key={card.label} className="panel p-4">
                <p className="label-mono mb-1.5">{card.label}</p>
                <p className={`text-xl font-display font-semibold ${card.accent ? 'text-gold' : ''}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="panel p-4 md:p-6">
            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a961" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#c9a961" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8a8378' }} minTickGap={40} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
                  tick={{ fontSize: 11, fill: '#8a8378' }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />

                {visibleRegimes.map((r) => (
                  <ReferenceArea
                    key={`${r.start}-${r.end}`}
                    x1={r.start}
                    x2={r.end}
                    fill={REGIME_COLOR[r.regime]}
                    fillOpacity={0.05}
                    strokeOpacity={0}
                  />
                ))}

                {visibleEvents.map((e) => (
                  <ReferenceLine
                    key={e.date}
                    x={e.date}
                    stroke="#8a8378"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    label={{ value: e.label, angle: -90, position: 'insideTopRight', fontSize: 9, fill: '#8a8378' }}
                  />
                ))}

                <Area
                  type="monotone"
                  dataKey="price"
                  name="Harga"
                  stroke="#c9a961"
                  strokeWidth={1.8}
                  fill="url(#priceGradient)"
                  dot={false}
                  connectNulls
                />

                {showForecast && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Prediksi"
                    stroke="#e8dcc4"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                  />
                )}

                <Brush dataKey="date" height={22} stroke="#c9a961" fill="transparent" travellerWidth={8} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </main>
      </div>
    </div>
  );
}