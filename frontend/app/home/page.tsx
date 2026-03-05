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

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (public_token: string) => void;
        onExit?: () => void;
      }) => { open: () => void };
    };
  }
}

export default function HomePage() {
  const searchParams = useSearchParams();
  const userId = useMemo(() => searchParams.get("userId") || "", [searchParams]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);

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

  async function connectPlaid() {
    if (!userId) {
      setError("Missing user. Please log in again.");
      return;
    }
    if (!window.Plaid) {
      setError("Plaid is not ready yet. Please try again.");
      return;
    }
    setError(null);
    setPlaidLoading(true);
    try {
      const tokenRes = await fetch(`${API_BASE}/plaid/create_link_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.link_token) {
        throw new Error("Failed to create link token");
      }

      const handler = window.Plaid.create({
        token: tokenData.link_token,
        onSuccess: async (public_token: string) => {
          const exchangeRes = await fetch(`${API_BASE}/plaid/exchange_public_token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, public_token })
          });
          if (!exchangeRes.ok) {
            setError("Failed to connect account.");
            setPlaidLoading(false);
            return;
          }
          // Sync Plaid then load persisted transactions
          await fetch(`${API_BASE}/plaid/transactions?userId=${userId}`);
          const res = await fetch(`${API_BASE}/transactions?userId=${userId}`);
          const data = await res.json();
          if (res.ok) {
            setTransactions(data.items || []);
          }
          setPlaidLoading(false);
        },
        onExit: () => {
          setPlaidLoading(false);
        }
      });

      handler.open();
    } catch (err) {
      setError("Unable to connect to Plaid.");
      setPlaidLoading(false);
    }
  }

  return (
    <ScreenShell title="Transactions" crumb="Home">
      <button
        className="button"
        style={{ marginBottom: 12, width: "100%" }}
        onClick={connectPlaid}
        disabled={plaidLoading}
      >
        {plaidLoading ? "Connecting..." : "Connect Bank (Plaid)"}
      </button>
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
