"use client";

import ScreenShell from "../_components/ScreenShell";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Transaction = {
  txnId: string;
  name: string;
  amount: number;
  date: string;
  category?: string;
  currency?: string;
};

export default function HomePage() {
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
        if (!res.ok) {
          throw new Error(data.detail || "Failed to load transactions");
        }
        if (active) setTransactions(data.items || []);
      } catch (err) {
        if (active) setError("Unable to load recent expenses.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <ScreenShell title="Transactions" crumb="Home">
      <a className="button" style={{ marginBottom: 12, width: "100%" }} href="/dashboard">
        Add Expense
      </a>
      <div className="months">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
        <span>Sep</span>
        <span>Oct</span>
        <span>Nov</span>
        <span>Dec</span>
      </div>
      <div className="year">2026</div>
      {loading && <p style={{ color: "#7b7b85" }}>Loading...</p>}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <div className="txn-list">
        {transactions.map((t) => (
          <div key={t.txnId} className="txn-item">
            <div>
              <div className="name">{t.name}</div>
              <div className="date">
                {t.date}
                {t.category ? ` • ${t.category}` : ""}
              </div>
            </div>
            <div className="amount">
              {(t.currency || "USD") + " "}
              {t.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}
