"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || "Login failed.");
        return;
      }
      const name = `${data.firstName} ${data.lastName}`.trim();
      router.push(
        `/home?userId=${encodeURIComponent(data.userId)}&name=${encodeURIComponent(name)}`
      );
    } catch (err) {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="phone-frame auth-phone">
        <div className="auth-top">
          <span className="auth-time">9:41</span>
          <div className="auth-status">
            <span className="auth-signal" />
            <span className="auth-wifi" />
            <span className="auth-battery" />
          </div>
        </div>
        <div className="auth-panel">
          <h1 className="auth-title">Welcome to Oro Wallet!</h1>
          <p className="auth-subtitle">Enter Login Credentials</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2 8 5 8-5" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="Enter Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </label>
            <label className="auth-field">
              <span className="auth-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h1zm2 0h6V7a3 3 0 0 0-6 0v3z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c5.5 0 9.8 4 11 7-1.2 3-5.5 7-11 7S2.2 15 1 12c1.2-3 5.5-7 11-7zm0 3.2A3.8 3.8 0 1 0 12 16a3.8 3.8 0 0 0 0-7.6z" />
                </svg>
              </button>
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-primary" type="submit" disabled={loading}>
              {loading ? "Signing In..." : "Login"}
            </button>
          </form>
          <div className="auth-divider">
            <span>Or</span>
          </div>
          <button className="auth-google" type="button">
            <span className="auth-google-icon">G</span>
            Login with Google
          </button>
          <p className="auth-footer">
            Don't have an account? <a href="/signup">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
