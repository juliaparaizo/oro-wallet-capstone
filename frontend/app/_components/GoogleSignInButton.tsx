"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  text = "signin_with",
}: {
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError(null);
      return;
    }
    let cancelled = false;
    let intervalId: number | undefined;

    const renderGoogleButton = () => {
      if (cancelled || !window.google || !containerRef.current) {
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          if (!credential) {
            setError("Google did not return a credential.");
            return;
          }

          setError(null);
          try {
            const res = await fetch(`${API_BASE}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_token: credential }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data?.detail || "Google sign-in failed.");
            }

            const name = `${data.firstName} ${data.lastName}`.trim();
            router.push(
              `/home?userId=${encodeURIComponent(data.userId)}&name=${encodeURIComponent(name)}`
            );
          } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign-in failed.");
          }
        },
      });

      containerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text,
        width: 320,
      });
      return true;
    };

    if (!renderGoogleButton()) {
      intervalId = window.setInterval(() => {
        if (renderGoogleButton() && intervalId) {
          window.clearInterval(intervalId);
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [router, text]);

  return (
    <>
      <div ref={containerRef} />
      {error && <p className="auth-error">{error}</p>}
    </>
  );
}
