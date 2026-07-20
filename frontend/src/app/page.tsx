"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchBackend, hasStoredSession } from "../lib/api";

type ResultPayload<T> = {
  success?: boolean;
  value?: T;
  error?: string | null;
};

type UiState = "idle" | "loading" | "success" | "error";
const AUTH_COOKIE_KEY = "auth_token";

function getDisplayName(): string {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return "User";
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return "User";
    }

    const parsed = JSON.parse(atob(payload)) as {
      name?: string;
      email?: string;
    };

    if (parsed.name) {
      return parsed.name;
    }

    if (parsed.email) {
      return parsed.email.split("@")[0];
    }
  } catch {
    return "User";
  }

  return "User";
}

export default function HomePage() {
  const router = useRouter();
  const [uiState, setUiState] = useState<UiState>("idle");
  const [name, setName] = useState("User");

  useEffect(() => {
    if (!hasStoredSession()) {
      router.replace("/login");
      return;
    }

    setName(getDisplayName());
  }, [router]);

  const statusMessage = useMemo(() => {
    switch (uiState) {
      case "loading":
        return "Searching AliExpress...";
      case "success":
        return "✅ Email sent! Check your inbox.";
      case "error":
        return "❌ Failed to send email. Please try again.";
      default:
        return "Ready to run discovery";
    }
  }, [uiState]);

  const runDiscovery = async () => {
    setUiState("loading");

    try {
      const payload = await fetchBackend<ResultPayload<unknown[]>>(
        "/products/manual-search",
        {
          method: "POST",
          body: {
            keyword: "trending",
            maxPrice: 200,
          },
        },
      );

      if (payload.success === false) {
        throw new Error(payload.error || "Discovery failed");
      }

      setUiState("success");
    } catch {
      setUiState("error");
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
            <h1 className="text-xl font-semibold text-slate-900">
              E-Commerce Agent
            </h1>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Logout
            </button>
          </header>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-slate-900">
                👋 Welcome, {name}!
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Run a product discovery scan to find winning products. A
                detailed report will be sent to your email.
              </p>

              <div className="mt-7">
                <button
                  type="button"
                  onClick={runDiscovery}
                  disabled={uiState === "loading"}
                  className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uiState === "loading" ? "Running..." : "🚀 Run Discovery"}
                </button>
              </div>

              {uiState !== "idle" ? (
                <div
                  className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
                    uiState === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : uiState === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {uiState === "loading" ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                    ) : null}
                    <p>{statusMessage}</p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 text-sm text-slate-700">
                Ready to run discovery
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
