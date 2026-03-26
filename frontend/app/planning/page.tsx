"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import ScreenShell from "../_components/ScreenShell";

type PlanningGoal = {
  id: string;
  name: string;
  current: number;
  target: number;
  deadline: string;
};

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

const DEFAULT_GOALS: PlanningGoal[] = [
  { id: "emergency-fund", name: "Emergency Fund", current: 2400, target: 6000, deadline: "Dec 2026" },
  { id: "vacation", name: "Vacation", current: 900, target: 2000, deadline: "Aug 2025" },
  { id: "down-payment", name: "Down Payment", current: 6800, target: 20000, deadline: "2028" }
];

function parseTxnDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

function progressWidth(current: number, target: number) {
  if (target <= 0) return "0%";
  return `${Math.min(100, Math.round((current / target) * 100))}%`;
}

function mapCategory(raw?: string, primary?: string | null, detailed?: string | null) {
  const candidate = (detailed || raw || primary || "").toString();
  if (!candidate) return "Miscellaneous";
  const c = candidate.toLowerCase();

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

  if (c.includes("rent") || c.includes("mortgage") || c.includes("housing")) return "Housing";
  if (c.includes("utilities") || c.includes("electric") || c.includes("water") || c.includes("internet")) return "Utilities";
  if (c.includes("transport") || c.includes("uber") || c.includes("lyft") || c.includes("fuel") || c.includes("parking")) return "Transportation";
  if (c.includes("grocery") || c.includes("supermarket")) return "Groceries";
  if (c.includes("restaurant") || c.includes("dining") || c.includes("coffee") || c.includes("food")) return "Dining Out";
  if (c.includes("medical") || c.includes("health") || c.includes("pharmacy")) return "Healthcare";
  if (c.includes("personal") || c.includes("beauty") || c.includes("salon")) return "Personal Care";
  if (c.includes("clothing") || c.includes("apparel") || c.includes("shoes") || c.includes("shop")) return "Clothing";
  if (c.includes("entertainment") || c.includes("movie") || c.includes("music") || c.includes("gaming")) return "Entertainment";
  if (c.includes("travel") || c.includes("hotel") || c.includes("air")) return "Travel";
  if (c.includes("education") || c.includes("tuition") || c.includes("school")) return "Education";
  if (c.includes("loan") || c.includes("debt") || c.includes("credit") || c.includes("interest")) return "Debt Payments";
  if (c.includes("savings") || c.includes("investment") || c.includes("invest") || c.includes("transfer")) return "Savings & Investments";
  if (c.includes("income") || c.includes("salary") || c.includes("payroll")) return "Income";
  if (c.includes("tax") || c.includes("irs")) return "Tax";
  return "Miscellaneous";
}

export default function PlanningPage() {
  const searchParams = useSearchParams();
  const userId = useMemo(() => searchParams.get("userId") || "", [searchParams]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goals, setGoals] = useState<PlanningGoal[]>(DEFAULT_GOALS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = `oro_planning_goals_${userId || "guest"}`;
    const saved = localStorage.getItem(key);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setGoals(parsed);
    } catch {
      setGoals(DEFAULT_GOALS);
    }
  }, [userId]);

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
      } catch {
        if (active) setError("Unable to load planning data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  function handleAddGoal() {
    const name = goalName.trim();
    const current = Number(goalCurrent);
    const target = Number(goalTarget);
    const deadline = goalDeadline.trim();

    if (!name || Number.isNaN(current) || Number.isNaN(target) || target <= 0) return;

    const nextGoal: PlanningGoal = {
      id: `${Date.now()}`,
      name,
      current: Math.max(0, current),
      target,
      deadline: deadline || "No date"
    };

    const nextGoals = [...goals, nextGoal];
    setGoals(nextGoals);
    localStorage.setItem(`oro_planning_goals_${userId || "guest"}`, JSON.stringify(nextGoals));
    setGoalName("");
    setGoalCurrent("");
    setGoalTarget("");
    setGoalDeadline("");
    setShowGoalForm(false);
  }

  const normalized = useMemo(() => {
    return transactions
      .map((transaction) => {
        const dateObj = parseTxnDate(transaction.date);
        const category = mapCategory(
          transaction.category,
          transaction.plaidPrimary,
          transaction.plaidDetailed
        );
        return {
          ...transaction,
          dateObj,
          category,
          month: dateObj ? monthKey(dateObj) : "",
          spend: transaction.amount > 0 ? transaction.amount : 0,
          inflow: transaction.amount < 0 || category === "Income" ? Math.abs(transaction.amount) : 0
        };
      })
      .filter((transaction) => transaction.dateObj);
  }, [transactions]);

  const activeMonth = useMemo(() => {
    if (normalized.length === 0) return new Date();
    return normalized
      .map((transaction) => transaction.dateObj as Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
  }, [normalized]);

  const currentMonthKey = monthKey(activeMonth);
  const monthLabel = activeMonth.toLocaleString("en-US", {
    month: "short",
    year: "numeric"
  });

  const currentMonthTransactions = useMemo(
    () => normalized.filter((transaction) => transaction.month === currentMonthKey),
    [normalized, currentMonthKey]
  );

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of currentMonthTransactions) {
      if (transaction.category === "Income") continue;
      totals.set(
        transaction.category,
        (totals.get(transaction.category) || 0) + transaction.spend
      );
    }
    return Array.from(totals.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }, [currentMonthTransactions]);

  const topSpendCategories = categoryTotals.slice(0, 3).map((entry) => ({
    ...entry,
    target: Math.max(entry.total, Math.ceil(entry.total * 1.2 / 25) * 25)
  }));

  const debtTransactions = currentMonthTransactions
    .filter((transaction) => transaction.category === "Debt Payments")
    .sort((a, b) => b.amount - a.amount);

  const savingsTransactions = currentMonthTransactions
    .filter((transaction) => transaction.category === "Savings & Investments")
    .sort((a, b) => b.amount - a.amount);

  const billTransactions = currentMonthTransactions
    .filter((transaction) =>
      transaction.category === "Housing" || transaction.category === "Utilities"
    )
    .sort(
      (a, b) =>
        (b.dateObj as Date).getTime() - (a.dateObj as Date).getTime()
    )
    .slice(0, 4);

  const taxTransactions = currentMonthTransactions.filter(
    (transaction) => transaction.category === "Tax"
  );

  const totalSpend = currentMonthTransactions.reduce(
    (sum, transaction) => sum + (transaction.category === "Income" ? 0 : transaction.spend),
    0
  );
  const totalIncome = currentMonthTransactions.reduce(
    (sum, transaction) => sum + transaction.inflow,
    0
  );
  const netFlow = totalIncome - totalSpend;
  const debtTotal = debtTransactions.reduce((sum, transaction) => sum + transaction.spend, 0);
  const savingsTotal = savingsTransactions.reduce((sum, transaction) => sum + transaction.spend, 0);
  const taxTotal = taxTransactions.reduce((sum, transaction) => sum + transaction.spend, 0);

  return (
    <ScreenShell title="Planning">
      <div className="planning-actions">
        <button className="button" onClick={() => setShowGoalForm((value) => !value)}>
          {showGoalForm ? "Close Planning Goal" : "Add Planning Goal"}
        </button>
      </div>

      {showGoalForm && (
        <div className="calendar-panel">
          <div className="planning-goal-form">
            <input
              className="input"
              type="text"
              placeholder="Goal name"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
            />
            <div className="planning-goal-row">
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                placeholder="Current saved"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
              />
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                placeholder="Target amount"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
              />
            </div>
            <div className="planning-goal-row">
              <input
                className="input"
                type="text"
                placeholder="Target date or year"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
              />
              <button className="button" onClick={handleAddGoal}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p style={{ color: "#7b7b85" }}>Loading planning data...</p>}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      <div className="planning-grid">
        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Monthly Spending</div>
              <div className="planning-subtitle">Live from linked transactions</div>
            </div>
            <span className="planning-chip">{monthLabel}</span>
          </div>
          {topSpendCategories.length === 0 && (
            <div className="plan-row">
              <span>No spend imported yet</span>
              <span>$0</span>
            </div>
          )}
          {topSpendCategories.map((category) => (
            <div key={category.label} className="planning-goal-block">
              <div className="plan-row">
                <span>{category.label}</span>
                <span>
                  {formatMoney(category.total)} / {formatMoney(category.target)}
                </span>
              </div>
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: progressWidth(category.total, category.target) }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Savings Goals</div>
              <div className="planning-subtitle">Your manual planning targets</div>
            </div>
            <span className="planning-chip">{goals.length} goals</span>
          </div>
          {goals.map((goal) => (
            <div key={goal.id} className="planning-goal-block">
              <div className="plan-row">
                <span>{goal.name}</span>
                <span>
                  {formatMoney(goal.current)} / {formatMoney(goal.target)}
                </span>
              </div>
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: progressWidth(goal.current, goal.target) }}
                />
              </div>
              <div className="planning-goal-meta">{goal.deadline}</div>
            </div>
          ))}
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Debt Payments</div>
              <div className="planning-subtitle">Detected from Plaid categories</div>
            </div>
            <span className="planning-chip">{formatMoney(debtTotal)}</span>
          </div>
          {debtTransactions.length === 0 && (
            <div className="plan-row">
              <span>No debt payments this month</span>
              <span>$0</span>
            </div>
          )}
          {debtTransactions.slice(0, 3).map((transaction) => (
            <div key={transaction.txnId} className="planning-goal-block">
              <div className="plan-row">
                <span>{transaction.name}</span>
                <span>{formatMoney(transaction.spend)}</span>
              </div>
              <div className="planning-goal-meta">{transaction.date}</div>
            </div>
          ))}
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Savings & Investments</div>
              <div className="planning-subtitle">Transfers and contributions</div>
            </div>
            <span className="planning-chip">{formatMoney(savingsTotal)}</span>
          </div>
          {savingsTransactions.length === 0 && (
            <div className="plan-row">
              <span>No savings transfers this month</span>
              <span>$0</span>
            </div>
          )}
          {savingsTransactions.slice(0, 3).map((transaction) => (
            <div key={transaction.txnId} className="planning-goal-block">
              <div className="plan-row">
                <span>{transaction.name}</span>
                <span>{formatMoney(transaction.spend)}</span>
              </div>
              <div className="planning-goal-meta">{transaction.date}</div>
            </div>
          ))}
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Bill Activity</div>
              <div className="planning-subtitle">Housing and utility transactions</div>
            </div>
            <span className="planning-chip">{billTransactions.length} bills</span>
          </div>
          <div className="bill-list">
            {billTransactions.length === 0 && (
              <div className="bill-item">
                <span>No bill activity this month</span>
                <span>$0</span>
              </div>
            )}
            {billTransactions.map((transaction) => (
              <div key={transaction.txnId} className="bill-item">
                <span>{transaction.name}</span>
                <span>
                  {transaction.date} • {formatMoney(transaction.spend)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Cash Flow Snapshot</div>
              <div className="planning-subtitle">Based on imported transactions</div>
            </div>
            <span className="planning-chip">{netFlow >= 0 ? "Positive" : "Negative"}</span>
          </div>
          <div className="plan-row">
            <span>Total Spend</span>
            <span>{formatMoney(totalSpend)}</span>
          </div>
          <div className="plan-row">
            <span>Total Income</span>
            <span>{formatMoney(totalIncome)}</span>
          </div>
          <div className="plan-row">
            <span>Net Flow</span>
            <span>{formatMoney(netFlow)}</span>
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Tax Planning</div>
              <div className="planning-subtitle">Tax-related transactions this month</div>
            </div>
            <span className="planning-chip">{formatMoney(taxTotal)}</span>
          </div>
          {taxTransactions.length === 0 && (
            <div className="plan-row">
              <span>No tax transactions detected</span>
              <span>$0</span>
            </div>
          )}
          {taxTransactions.slice(0, 3).map((transaction) => (
            <div key={transaction.txnId} className="planning-goal-block">
              <div className="plan-row">
                <span>{transaction.name}</span>
                <span>{formatMoney(transaction.spend)}</span>
              </div>
              <div className="planning-goal-meta">{transaction.date}</div>
            </div>
          ))}
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Goal Milestones</div>
              <div className="planning-subtitle">Planning targets you added</div>
            </div>
            <span className="planning-chip">{goals.length} active</span>
          </div>
          {goals.map((goal) => (
            <div key={`${goal.id}-milestone`} className="milestone">
              <span>{goal.name}</span>
              <span>{goal.deadline}</span>
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
