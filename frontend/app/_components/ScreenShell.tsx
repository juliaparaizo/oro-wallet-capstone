"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ScreenShell({
  title,
  crumb,
  showTitle = true,
  showNav = true,
  children
}: {
  title: string;
  crumb?: string;
  showTitle?: boolean;
  showNav?: boolean;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";
  const name = searchParams.get("name") || "Rebecca";

  const withParams = (href: string) => {
    if (!userId && !name) return href;
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (name) params.set("name", name);
    return `${href}?${params.toString()}`;
  };

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <div className="screen">
          <div className="status-bar">
            <span className="status-time">9:41</span>
            <div className="status-icons">
              <span className="status-signal" />
              <span className="status-wifi" />
              <span className="status-battery" />
            </div>
          </div>
          <header className="topbar">
            <h1>Hi, {name}</h1>
            <div className="menu">≡</div>
          </header>
          <section className="panel">
            {showNav && (
              <div className="nav-row">
                <span>←</span>
                <span style={{ fontWeight: 600 }}>{crumb || title}</span>
              </div>
            )}
            {showTitle && <h2>{title}</h2>}
            {children}
          </section>
          <nav className="bottom-nav">
            <Link className="nav-item" href={withParams("/home")}>
              <div className="nav-dot">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 11.5 12 5l8 6.5v7.5a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
                </svg>
              </div>
              Home
            </Link>
            <Link className="nav-item" href={withParams("/graphs")}>
              <div className="nav-dot">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 19V9m7 10V5m7 14v-7" />
                </svg>
              </div>
              Graphs
            </Link>
            <Link
              className="nav-item nav-item-center"
              href={withParams("/bot")}
              aria-label="Chat Bot"
            >
              <div className="nav-dot nav-dot-center" />
              Chat Bot
            </Link>
            <Link className="nav-item" href={withParams("/calendar")}>
              <div className="nav-dot">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 4v3M17 4v3M5 8h14M6 10h12v9H6z" />
                </svg>
              </div>
              Calendar
            </Link>
            <Link className="nav-item" href={withParams("/planning")}>
              <div className="nav-dot">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7h10M7 12h10M7 17h6M4 7h1M4 12h1M4 17h1" />
                </svg>
              </div>
              Planning
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
