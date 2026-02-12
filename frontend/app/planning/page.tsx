import ScreenShell from "../_components/ScreenShell";

export default function PlanningPage() {
  return (
    <ScreenShell title="Planning">
      <div className="planning-grid">
        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Budget</div>
              <div className="planning-subtitle">Monthly limits by category</div>
            </div>
            <span className="planning-chip">Feb</span>
          </div>
          <div className="plan-row">
            <span>Housing</span>
            <span>$1,200 / $1,500</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "80%" }} />
          </div>
          <div className="plan-row">
            <span>Dining Out</span>
            <span>$180 / $250</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "72%" }} />
          </div>
          <div className="plan-row">
            <span>Groceries</span>
            <span>$260 / $350</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "74%" }} />
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Savings Goals</div>
              <div className="planning-subtitle">Track targets</div>
            </div>
            <span className="planning-chip">3 goals</span>
          </div>
          <div className="plan-row">
            <span>Emergency Fund</span>
            <span>$2,400 / $6,000</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "40%" }} />
          </div>
          <div className="plan-row">
            <span>Vacation</span>
            <span>$900 / $2,000</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "45%" }} />
          </div>
          <div className="plan-row">
            <span>Down Payment</span>
            <span>$6,800 / $20,000</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "34%" }} />
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Debt Payoff</div>
              <div className="planning-subtitle">Payoff timeline</div>
            </div>
            <span className="planning-chip">18 mo</span>
          </div>
          <div className="plan-row">
            <span>Student Loan</span>
            <span>$9,200 left</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "54%" }} />
          </div>
          <div className="plan-row">
            <span>Credit Card</span>
            <span>$1,450 left</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "68%" }} />
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Retirement</div>
              <div className="planning-subtitle">Contribution tracker</div>
            </div>
            <span className="planning-chip">401(k)</span>
          </div>
          <div className="plan-row">
            <span>Monthly Contribution</span>
            <span>$420</span>
          </div>
          <div className="plan-row">
            <span>Year-to-date</span>
            <span>$1,680</span>
          </div>
          <div className="plan-row">
            <span>Employer Match</span>
            <span>$120</span>
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Bill Schedule</div>
              <div className="planning-subtitle">Upcoming payments</div>
            </div>
            <span className="planning-chip">Next 7 days</span>
          </div>
          <div className="bill-list">
            <div className="bill-item">
              <span>Rent</span>
              <span>Feb 15 • $1,500</span>
            </div>
            <div className="bill-item">
              <span>Electricity</span>
              <span>Feb 18 • $84</span>
            </div>
            <div className="bill-item">
              <span>Internet</span>
              <span>Feb 21 • $55</span>
            </div>
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Net Worth</div>
              <div className="planning-subtitle">Assets minus liabilities</div>
            </div>
            <span className="planning-chip">+4.2%</span>
          </div>
          <div className="plan-row">
            <span>Assets</span>
            <span>$38,400</span>
          </div>
          <div className="plan-row">
            <span>Liabilities</span>
            <span>$12,300</span>
          </div>
          <div className="plan-row">
            <span>Total</span>
            <span>$26,100</span>
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Investment Plan</div>
              <div className="planning-subtitle">Allocation</div>
            </div>
            <span className="planning-chip">Balanced</span>
          </div>
          <div className="plan-row">
            <span>Stocks</span>
            <span>60%</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "60%" }} />
          </div>
          <div className="plan-row">
            <span>Bonds</span>
            <span>30%</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "30%" }} />
          </div>
          <div className="plan-row">
            <span>Cash</span>
            <span>10%</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "10%" }} />
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Tax Planning</div>
              <div className="planning-subtitle">Optimize deductions</div>
            </div>
            <span className="planning-chip">Q1</span>
          </div>
          <div className="plan-row">
            <span>Tax-Advantaged</span>
            <span>$3,200 / $6,500</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: "49%" }} />
          </div>
          <div className="plan-row">
            <span>Withholding</span>
            <span>On track</span>
          </div>
        </div>

        <div className="planning-card">
          <div className="planning-header">
            <div>
              <div className="planning-title">Financial Milestones</div>
              <div className="planning-subtitle">Major goals</div>
            </div>
            <span className="planning-chip">3 active</span>
          </div>
          <div className="milestone">
            <span>Home Purchase</span>
            <span>2028</span>
          </div>
          <div className="milestone">
            <span>Master’s Degree</span>
            <span>2027</span>
          </div>
          <div className="milestone">
            <span>Business Launch</span>
            <span>2029</span>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
