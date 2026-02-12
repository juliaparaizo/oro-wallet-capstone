"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ScreenShell from "../_components/ScreenShell";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const CATEGORIES = [
  "Housing",
  "Utilities",
  "Transportation",
  "Groceries",
  "Dining Out",
  "Healthcare",
  "Personal Care",
  "Clothing",
  "Entertainment",
  "Travel",
  "Education",
  "Childcare & Family",
  "Debt Payments",
  "Savings & Investments",
  "Miscellaneous"
];

const CURRENCIES = ["USD", "EUR", "BRL", "GBP", "CAD"];

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryUserId = useMemo(
    () => searchParams.get("userId") || "",
    [searchParams]
  );
  const name = useMemo(() => searchParams.get("name") || "", [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState(queryUserId || "user_001");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState(CATEGORIES[0]);

  useEffect(() => {
    if (queryUserId) {
      setUserId(queryUserId);
    }
  }, [queryUserId]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) {
      setError("Please enter an amount.");
      return;
    }
    if (!userId) {
      setError("Missing user. Please log in again.");
      return;
    }
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    const now = new Date();
    const isoDate = now.toISOString().slice(0, 10);
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: label.trim() || "Manual Entry",
          amount: numericAmount,
          date: isoDate,
          category,
          currency
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to save expense.");
        return;
      }
      setError(null);
      setSuccess("Expense added.");
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (name) params.set("name", name);
      setTimeout(() => {
        router.push(`/home?${params.toString()}`);
      }, 800);
    } catch (err) {
      setError("Unable to reach the server.");
    }
  }

  return (
    <ScreenShell title="Transactions" crumb="Home" showTitle={false} showNav={false}>
      <div className="entry-card">
        <div className="entry-title">Add Expense</div>
        <form className="entry-form" onSubmit={addExpense}>
          <label className="entry-field">
            <span>Amount</span>
            <div className="entry-row">
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select
                className="input entry-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="entry-field">
            <span>Label (optional)</span>
            <input
              className="input"
              placeholder="Coffee, Uber, Rent..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="entry-field">
            <span>Category</span>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button className="button entry-button" type="submit">
            Add Expense
          </button>
        </form>
      </div>
      {error && <p style={{ color: "#b00020", marginTop: 10 }}>{error}</p>}
      {success && <p style={{ color: "#2e7d32", marginTop: 10 }}>{success}</p>}
    </ScreenShell>
  );
}
