import ScreenShell from "../_components/ScreenShell";

export default function GraphsPage() {
  return (
    <ScreenShell title="Graphs">
      <div className="graphs-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Spending by Category</div>
              <div className="chart-subtitle">Pie chart overview</div>
            </div>
            <span className="chart-chip">Feb</span>
          </div>
          <div className="chart-body">
            <svg viewBox="0 0 120 120" className="pie">
              <circle r="46" cx="60" cy="60" className="pie-base" />
              <circle r="46" cx="60" cy="60" className="pie-slice slice-1" />
              <circle r="46" cx="60" cy="60" className="pie-slice slice-2" />
              <circle r="46" cx="60" cy="60" className="pie-slice slice-3" />
              <circle r="46" cx="60" cy="60" className="pie-slice slice-4" />
            </svg>
            <div className="legend">
              <div><span className="swatch s1" />Housing</div>
              <div><span className="swatch s2" />Groceries</div>
              <div><span className="swatch s3" />Dining Out</div>
              <div><span className="swatch s4" />Transport</div>
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
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => (
                <div key={m} className="stacked-col">
                  <div className="stack seg s1" style={{ height: `${30 + i * 2}%` }} />
                  <div className="stack seg s2" style={{ height: `${24 - i}%` }} />
                  <div className="stack seg s3" style={{ height: `${18 + i}%` }} />
                  <div className="stack seg s4" style={{ height: `${12}%` }} />
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Category Trends</div>
              <div className="chart-subtitle">Multi-line</div>
            </div>
            <span className="chart-chip">Weekly</span>
          </div>
          <div className="chart-body">
            <svg viewBox="0 0 240 120" className="line-chart">
              <polyline className="line l1" points="10,90 50,70 90,72 130,55 170,62 210,40" />
              <polyline className="line l2" points="10,60 50,62 90,50 130,48 170,38 210,30" />
              <polyline className="line l3" points="10,100 50,95 90,88 130,80 170,76 210,70" />
            </svg>
            <div className="legend">
              <div><span className="swatch s1" />Housing</div>
              <div><span className="swatch s2" />Groceries</div>
              <div><span className="swatch s3" />Dining Out</div>
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
              {[
                ["Housing", 90],
                ["Groceries", 65],
                ["Dining Out", 52],
                ["Transportation", 38],
                ["Entertainment", 28]
              ].map(([label, val]) => (
                <div key={label} className="hbar-row">
                  <span>{label}</span>
                  <div className="hbar-track">
                    <div className="hbar-fill s1" style={{ width: `${val}%` }} />
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
              <path className="area a1" d="M10 90 L50 70 L90 72 L130 55 L170 62 L210 40 L210 110 L10 110 Z" />
              <path className="area a2" d="M10 105 L50 95 L90 88 L130 80 L170 76 L210 70 L210 110 L10 110 Z" />
            </svg>
            <div className="legend">
              <div><span className="swatch s2" />Essentials</div>
              <div><span className="swatch s3" />Lifestyle</div>
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
              <div className="tile t1">Housing</div>
              <div className="tile t2">Groceries</div>
              <div className="tile t3">Dining</div>
              <div className="tile t4">Transport</div>
              <div className="tile t5">Other</div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Budget vs Actual</div>
              <div className="chart-subtitle">Grouped bars</div>
            </div>
            <span className="chart-chip">This month</span>
          </div>
          <div className="chart-body">
            <div className="grouped-bars">
              {["Housing", "Groceries", "Dining", "Transport"].map((c, i) => (
                <div key={c} className="group">
                  <div className="gcol g1" style={{ height: `${70 - i * 6}%` }} />
                  <div className="gcol g2" style={{ height: `${55 - i * 5}%` }} />
                  <span>{c}</span>
                </div>
              ))}
            </div>
            <div className="legend">
              <div><span className="swatch s1" />Budget</div>
              <div><span className="swatch s3" />Actual</div>
            </div>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
