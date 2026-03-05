 "use client";

import ScreenShell from "../_components/ScreenShell";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Transaction = {
  txnId: string;
  name: string;
  amount: number;
  date: string;
  category?: string;
  currency?: string;
  source?: string;
  plaidPrimary?: string | null;
  plaidDetailed?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "short" });
}

function parseTxnDate(value: string) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function mapCategory(raw?: string, primary?: string | null, detailed?: string | null) {
  const candidate = (detailed || raw || primary || "").toString();
  if (!candidate) return "Miscellaneous";
  const c = candidate.toLowerCase();

  // Plaid PFC primary categories (enums)
  if (primary) {
    const p = primary.toLowerCase();
    if (p.includes("food_and_drink")) return "Dining Out";
    if (p.includes("groceries")) return "Groceries";
    if (p.includes("transportation")) return "Transportation";
    if (p.includes("travel")) return "Travel";
    if (p.includes("rent_and_utilities")) return "Housing";
    if (p.includes("utilities")) return "Utilities";
    if (p.includes("healthcare")) return "Healthcare";
    if (p.includes("entertainment")) return "Entertainment";
    if (p.includes("education")) return "Education";
    if (p.includes("general_merchandise") || p.includes("shops")) return "Clothing";
    if (p.includes("personal_care")) return "Personal Care";
    if (p.includes("income") || p.includes("payroll")) return "Income";
    if (p.includes("loan") || p.includes("credit") || p.includes("debt") || p.includes("payments")) return "Debt Payments";
    if (p.includes("transfer") || p.includes("investments") || p.includes("savings")) return "Savings & Investments";
  }

  // Legacy category strings & detailed hints
  if (c.includes("rent") || c.includes("mortgage") || c.includes("housing")) return "Housing";
  if (c.includes("utilities") || c.includes("electric") || c.includes("water") || c.includes("gas")) return "Utilities";
  if (c.includes("transport") || c.includes("rideshare") || c.includes("uber") || c.includes("lyft") || c.includes("taxi") || c.includes("gas") || c.includes("fuel") || c.includes("parking")) return "Transportation";
  if (c.includes("grocery") || c.includes("supermarket")) return "Groceries";
  if (c.includes("restaurant") || c.includes("dining") || c.includes("fast food") || c.includes("coffee") || c.includes("caf") || c.includes("food")) return "Dining Out";
  if (c.includes("medical") || c.includes("health") || c.includes("pharmacy") || c.includes("doctor")) return "Healthcare";
  if (c.includes("personal") || c.includes("beauty") || c.includes("spa") || c.includes("salon")) return "Personal Care";
  if (c.includes("clothing") || c.includes("apparel") || c.includes("shoes") || c.includes("shops")) return "Clothing";
  if (c.includes("entertainment") || c.includes("movie") || c.includes("music") || c.includes("gaming") || c.includes("sport")) return "Entertainment";
  if (c.includes("travel") || c.includes("air") || c.includes("hotel") || c.includes("lodging")) return "Travel";
  if (c.includes("education") || c.includes("tuition") || c.includes("school")) return "Education";
  if (c.includes("child") || c.includes("family") || c.includes("daycare")) return "Childcare & Family";
  if (c.includes("loan") || c.includes("debt") || c.includes("credit") || c.includes("payment") || c.includes("interest")) return "Debt Payments";
  if (c.includes("savings") || c.includes("investment") || c.includes("invest") || c.includes("transfer")) return "Savings & Investments";
  if (c.includes("income") || c.includes("salary") || c.includes("payroll")) return "Income";
  return "Miscellaneous";
}

export default function GraphsPage() {
  const searchParams = useSearchParams();
  const userId = useMemo(() => searchParams.get("userId") || "", [searchParams]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/transactions?userId=${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to load");
        if (active) setTransactions(data.items || []);
      } catch (err) {
        if (active) setError("Unable to load transactions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const now = new Date();
  const lastSixMonths = useMemo(() => {
    const list: Date[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(d);
    }
    return list;
  }, [now]);

  const normalized = useMemo(() => {
    return transactions
      .map((t) => {
        const d = parseTxnDate(t.date);
        return {
          ...t,
          dateObj: d,
          month: d ? monthKey(d) : "",
          category: mapCategory(t.category, t.plaidPrimary, t.plaidDetailed),
          spend: t.amount > 0 ? t.amount : 0,
        };
      })
      .filter((t) => t.dateObj);
  }, [transactions]);

  const inferredMonthKey = useMemo(() => {
    if (normalized.length === 0) return monthKey(now);
    const latest = normalized
      .map((t) => t.dateObj as Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return monthKey(latest);
  }, [normalized, now]);
  const currentMonthKey = inferredMonthKey;

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of normalized) {
      if (t.month !== currentMonthKey) continue;
      totals.set(t.category, (totals.get(t.category) || 0) + t.spend);
    }
    return Array.from(totals.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }, [normalized, currentMonthKey]);

  const topCategories = categoryTotals.slice(0, 5);
  const categorySum = topCategories.reduce((acc, cur) => acc + cur.total, 0);

  const monthlyTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of normalized) {
      if (!t.month) continue;
      totals.set(t.month, (totals.get(t.month) || 0) + t.spend);
    }
    return lastSixMonths.map((d) => {
      const key = monthKey(d);
      return { key, label: monthLabel(d), total: totals.get(key) || 0 };
    });
  }, [normalized, lastSixMonths]);

  const monthlyMax = Math.max(1, ...monthlyTotals.map((m) => m.total));

  const avgLastThree = useMemo(() => {
    const slice = monthlyTotals.slice(-3);
    const total = slice.reduce((acc, cur) => acc + cur.total, 0);
    return slice.length ? total / slice.length : 0;
  }, [monthlyTotals]);

  const currentMonthTotal = useMemo(() => {
    const entry = monthlyTotals.find((m) => m.key === currentMonthKey);
    return entry ? entry.total : 0;
  }, [monthlyTotals, currentMonthKey]);

  return (
    <ScreenShell title="Graphs">
      {loading && <p style={{ color: "#7b7b85" }}>Loading...</p>}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <div className="graphs-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Spending by Category</div>
              <div className="chart-subtitle">Current month</div>
            </div>
            <span className="chart-chip">{monthLabel(now)}</span>
          </div>
          <div className="chart-body">
            <svg viewBox="0 0 120 120" className="pie">
              <circle r="46" cx="60" cy="60" className="pie-base" />
              {(() => {
                const r = 46;
                const c = 2 * Math.PI * r;
                let offset = 0;
                return topCategories.map((citem, idx) => {
                  const pct = categorySum ? citem.total / categorySum : 0;
                  const dash = pct * c;
                  const el = (
                    <circle
                      key={citem.label}
                      r={r}
                      cx="60"
                      cy="60"
                      className={`pie-slice slice-${(idx % 4) + 1}`}
                      strokeDasharray={`${dash} ${c - dash}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += dash;
                  return el;
                });
              })()}
            </svg>
            <div className="legend">
              {topCategories.length === 0 && <div>No spending yet.</div>}
              {topCategories.map((citem, idx) => (
                <div key={citem.label}>
                  <span className={`swatch s${(idx % 4) + 1}`} />
                  {citem.label} • {formatCurrency(citem.total)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Monthly Spend</div>
              <div className="chart-subtitle">Stacked bar trend</div>
            </div>
            <span className="chart-chip">6 mo</span>
          </div>
          <div className="chart-body">
            <div className="stacked-bars">
              {monthlyTotals.map((m) => (
                <div key={m.key} className="stacked-col">
                  <div
                    className="stack seg s1"
                    style={{ height: `${(m.total / monthlyMax) * 80 + 10}%` }}
                  />
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Category Trends</div>
              <div className="chart-subtitle">Top 3 categories</div>
            </div>
            <span className="chart-chip">Weekly</span>
          </div>
          <div className="chart-body">
            <svg viewBox="0 0 240 120" className="line-chart">
              {(() => {
                const top3 = categoryTotals.slice(0, 3).map((c) => c.label);
                const weeks = Array.from({ length: 6 }).map((_, i) => {
                  const d = new Date(now);
                  d.setDate(d.getDate() - (5 - i) * 7);
                  return d;
                });
                const totalsByCat = top3.map((label) => {
                  return weeks.map((d) => {
                    const weekStart = new Date(d);
                    weekStart.setDate(d.getDate() - d.getDay());
                    const weekKey = weekStart.toISOString().slice(0, 10);
                    const sum = normalized.reduce((acc, t) => {
                      if (t.category !== label || !t.dateObj) return acc;
                      const td = t.dateObj;
                      const wk = new Date(td);
                      wk.setDate(td.getDate() - td.getDay());
                      const key = wk.toISOString().slice(0, 10);
                      return key === weekKey ? acc + t.spend : acc;
                    }, 0);
                    return sum;
                  });
                });
                const maxVal = Math.max(1, ...totalsByCat.flat());
                return totalsByCat.map((series, idx) => {
                  const points = series
                    .map((val, i) => {
                      const x = 10 + i * 40;
                      const y = 110 - (val / maxVal) * 80;
                      return `${x},${y}`;
                    })
                    .join(" ");
                  return <polyline key={idx} className={`line l${idx + 1}`} points={points} />;
                });
              })()}
            </svg>
            <div className="legend">
              {categoryTotals.slice(0, 3).map((citem, idx) => (
                <div key={citem.label}>
                  <span className={`swatch s${(idx % 4) + 1}`} />
                  {citem.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Top Categories</div>
              <div className="chart-subtitle">Horizontal bars</div>
            </div>
            <span className="chart-chip">Ranked</span>
          </div>
          <div className="chart-body">
            <div className="hbars">
              {topCategories.map((citem) => (
                <div key={citem.label} className="hbar-row">
                  <span>{citem.label}</span>
                  <div className="hbar-track">
                    <div
                      className="hbar-fill s1"
                      style={{
                        width: `${categorySum ? (citem.total / categorySum) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Category Mix</div>
              <div className="chart-subtitle">Stacked area</div>
            </div>
            <span className="chart-chip">Quarter</span>
          </div>
          <div className="chart-body">
            <svg viewBox="0 0 240 120" className="area-chart">
              {(() => {
                const top2 = categoryTotals.slice(0, 2);
                const quarterMonths = lastSixMonths.slice(-3);
                const totals = top2.map((citem) =>
                  quarterMonths.map((d) => {
                    const key = monthKey(d);
                    return normalized
                      .filter((t) => t.month === key && t.category === citem.label)
                      .reduce((acc, t) => acc + t.spend, 0);
                  })
                );
                const maxVal = Math.max(1, ...totals.flat());
                return totals.map((series, idx) => {
                  const points = series
                    .map((val, i) => {
                      const x = 10 + i * 100;
                      const y = 110 - (val / maxVal) * 70;
                      return `${x} ${y}`;
                    })
                    .join(" L");
                  return (
                    <path
                      key={idx}
                      className={`area a${idx + 1}`}
                      d={`M${points} L210 110 L10 110 Z`}
                    />
                  );
                });
              })()}
            </svg>
            <div className="legend">
              {categoryTotals.slice(0, 2).map((citem, idx) => (
                <div key={citem.label}>
                  <span className={`swatch s${(idx % 4) + 2}`} />
                  {citem.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Treemap</div>
              <div className="chart-subtitle">Spend size</div>
            </div>
            <span className="chart-chip">Visual</span>
          </div>
          <div className="chart-body">
            <div className="treemap">
              {topCategories.map((citem, idx) => (
                <div
                  key={citem.label}
                  className={`tile t${(idx % 5) + 1}`}
                  style={{
                    flexGrow: Math.max(1, citem.total),
                    minWidth: "28%"
                  }}
                >
                  {citem.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">This Month vs 3-mo Avg</div>
              <div className="chart-subtitle">Actual vs baseline</div>
            </div>
            <span className="chart-chip">{monthLabel(now)}</span>
          </div>
          <div className="chart-body">
            <div className="grouped-bars">
              {topCategories.slice(0, 4).map((citem, i) => (
                <div key={citem.label} className="group">
                  <div
                    className="gcol g1"
                    style={{
                      height: `${avgLastThree ? (citem.total / avgLastThree) * 60 + 10 : 10}%`
                    }}
                  />
                  <div
                    className="gcol g2"
                    style={{
                      height: `${categorySum ? (citem.total / categorySum) * 60 + 10 : 10}%`
                    }}
                  />
                  <span>{citem.label}</span>
                </div>
              ))}
            </div>
            <div className="legend">
              <div><span className="swatch s1" />3-mo avg</div>
              <div><span className="swatch s3" />This month</div>
            </div>
            <div style={{ marginTop: 10, color: "#7b7b85", fontSize: 12 }}>
              This month: {formatCurrency(currentMonthTotal)} • 3-mo avg: {formatCurrency(avgLastThree)}
            </div>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
