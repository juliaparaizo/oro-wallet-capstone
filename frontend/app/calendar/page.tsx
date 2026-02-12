import ScreenShell from "../_components/ScreenShell";

export default function CalendarPage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day?: number; isToday?: boolean }> = [];

  const events: Record<
    number,
    Array<{ label: string; type: string }>
  > = {
    1: [
      { label: "Budget Reset", type: "budget" },
      { label: "Rent Due", type: "bill" }
    ],
    3: [{ label: "Payday", type: "payday" }],
    5: [{ label: "Streaming Renewal", type: "subscription" }],
    7: [{ label: "Savings Transfer", type: "savings" }],
    9: [{ label: "Credit Card Due", type: "debt" }],
    12: [{ label: "Gym Membership", type: "recurring" }],
    15: [{ label: "Spending Alert", type: "alert" }],
    18: [{ label: "Low Balance", type: "warning" }],
    20: [{ label: "Tax Deadline", type: "tax" }],
    22: [{ label: "Goal Milestone", type: "goal" }],
    25: [{ label: "Financial Review", type: "review" }],
    27: [{ label: "Payment Confirmed", type: "paid" }],
    28: [{ label: "Custom Reminder", type: "custom" }]
  };

  for (let i = 0; i < startDay; i += 1) {
    cells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    cells.push({ day, isToday });
  }
  while (cells.length % 7 !== 0) {
    cells.push({});
  }

  const monthLabel = today.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <ScreenShell title="Calendar">
      <div className="calendar">
        <div className="calendar-header">{monthLabel}</div>
        <div className="calendar-legend">
          <span className="tag budget">Budget Reset</span>
          <span className="tag bill">Bills</span>
          <span className="tag payday">Payday</span>
          <span className="tag recurring">Recurring</span>
          <span className="tag savings">Savings</span>
          <span className="tag debt">Debt</span>
          <span className="tag goal">Goals</span>
          <span className="tag tax">Tax</span>
          <span className="tag alert">Alerts</span>
          <span className="tag warning">Low Balance</span>
        </div>
        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="calendar-dayname">
              {day}
            </div>
          ))}
          {cells.map((cell, idx) => (
            <div
              key={`${cell.day ?? "empty"}-${idx}`}
              className={`calendar-day${cell.day ? "" : " is-muted"}${
                cell.isToday ? " is-today" : ""
              }`}
            >
              {cell.day ?? ""}
              {cell.day && events[cell.day] && (
                <div className="calendar-dots">
                  {events[cell.day].slice(0, 3).map((event, eidx) => (
                    <span
                      key={`${event.type}-${eidx}`}
                      className={`dot ${event.type}`}
                      title={event.label}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="calendar-notes">
          <div className="note-row">
            <span className="note-label">Upcoming Bills</span>
            <span>Rent • Utilities • Loans</span>
          </div>
          <div className="note-row">
            <span className="note-label">Cash Flow</span>
            <span>High spend vs income days</span>
          </div>
          <div className="note-row">
            <span className="note-label">Payment Status</span>
            <span>Paid / Pending markers</span>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
