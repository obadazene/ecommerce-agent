"use client";

import {
  ArrowPathIcon,
  ArrowRightIcon,
  BellAlertIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  fetchBackend,
  hasStoredSession,
  persistAuthSession,
} from "../../lib/api";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  url: string;
  platform: string;
  source: string | null;
  imageUrl: string | null;
  criteriaScore: number | null;
  isNew: boolean;
};

type ResultPayload<T> = {
  success?: boolean;
  value?: T;
  error?: string | null;
};

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

const defaultRegisterForm = {
  name: "",
  email: "",
  password: "",
};

const knownPlatforms = [
  "AliExpress",
  "Amazon",
  "Shopify",
  "WooCommerce",
  "eBay",
];

const toastStyles: Record<ToastType, string> = {
  success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  error: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  info: "border-sky-400/20 bg-sky-500/10 text-sky-100",
};

export default function Dashboard() {
  const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
  const [loginForm, setLoginForm] = useState({
    email: defaultRegisterForm.email,
    password: defaultRegisterForm.password,
  });
  const [searchForm, setSearchForm] = useState({
    keyword: "",
    maxPrice: 50,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("Ready to run discovery.");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  useEffect(() => {
    setAuthenticated(hasStoredSession());
    if (typeof window !== "undefined") {
      const speechSupport = Boolean(
        (
          window as Window & {
            SpeechRecognition?: unknown;
            webkitSpeechRecognition?: unknown;
          }
        ).SpeechRecognition ||
        (
          window as Window & {
            SpeechRecognition?: unknown;
            webkitSpeechRecognition?: unknown;
          }
        ).webkitSpeechRecognition,
      );
      setVoiceSupported(speechSupport);
    }
  }, []);

  const stats = useMemo(() => {
    const monitored = products.length;
    const newToday = products.filter((product) => product.isNew).length;
    const scored = products.filter((product) => product.criteriaScore !== null);
    const winningProducts = scored.filter(
      (product) => (product.criteriaScore ?? 0) >= 5,
    );
    const averageScore =
      scored.length > 0
        ? Math.round(
            scored.reduce(
              (total, product) => total + (product.criteriaScore ?? 0),
              0,
            ) / scored.length,
          )
        : 0;

    return {
      monitored,
      newToday,
      averageScore,
      winningProducts: winningProducts.length,
    };
  }, [products]);

  const platformPresence = useMemo(() => {
    return knownPlatforms.map((platform) => ({
      platform,
      count: products.filter((product) => product.platform === platform).length,
    }));
  }, [products]);

  const recentProducts = useMemo(() => products.slice(0, 8), [products]);

  const extractResult = <T,>(payload: ResultPayload<T>): T => {
    if (payload.success === false) {
      throw new Error(payload.error || "Request failed");
    }

    return (payload.value ?? payload) as T;
  };

  const pushToast = (type: ToastType, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, type, message }].slice(-3));
  };

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const runAction = async (
    loadingMessage: string,
    action: () => Promise<void>,
  ) => {
    setLoading(true);
    setStatus(loadingMessage);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    await runAction("Creating account...", async () => {
      try {
        const response = await fetchBackend<AuthResponse>("/auth/register", {
          method: "POST",
          body: registerForm,
        });
        persistAuthSession(response.accessToken, response.refreshToken);
        setAuthenticated(true);
        setLoginForm({
          email: registerForm.email,
          password: registerForm.password,
        });
        setStatus("Account created and authenticated.");
        pushToast("success", "Account created and signed in.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(message);
        pushToast("error", message);
      }
    });
  };

  const handleLogin = async () => {
    await runAction("Signing in...", async () => {
      try {
        const response = await fetchBackend<AuthResponse>("/auth/login", {
          method: "POST",
          body: loginForm,
        });
        persistAuthSession(response.accessToken, response.refreshToken);
        setAuthenticated(true);
        setStatus("Authenticated. You can run searches from the browser now.");
        pushToast("success", "Signed in successfully.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(message);
        pushToast("error", message);
      }
    });
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthenticated(false);
    setStatus("Local session cleared.");
    pushToast("info", "Session cleared.");
  };

  const loadProducts = async () => {
    await runAction("Loading stored products...", async () => {
      try {
        const response = await fetchBackend<ResultPayload<Product[]>>(
          "/products",
          {
            method: "GET",
          },
        );
        const result = extractResult<Product[]>(response);
        setProducts(result);
        setStatus(`Loaded ${result.length} stored products.`);
        pushToast("success", `Loaded ${result.length} products.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(message);
        pushToast("error", message);
      }
    });
  };

  const startVoiceSearch = () => {
    if (!authenticated || loading) {
      return;
    }

    const SpeechRecognition =
      (
        window as Window & {
          SpeechRecognition?: new () => any;
          webkitSpeechRecognition?: new () => any;
        }
      ).SpeechRecognition ||
      (
        window as Window & {
          SpeechRecognition?: new () => any;
          webkitSpeechRecognition?: new () => any;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const message = "Voice input is not supported in this browser.";
      setStatus(message);
      pushToast("info", message);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setVoiceListening(true);
    setStatus("Listening for a search keyword...");

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setSearchForm((current) => ({
          ...current,
          keyword: transcript,
        }));
        setStatus(`Voice search captured: "${transcript}".`);
        pushToast("success", `Captured "${transcript}" from voice.`);
      }
    };

    recognition.onerror = (event: any) => {
      const message = `Voice input failed: ${event?.error || "unknown error"}`;
      setStatus(message);
      pushToast("error", message);
      setVoiceListening(false);
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.start();
  };

  const runDiscovery = async () => {
    if (!authenticated) {
      const message = "Please authenticate before running discovery.";
      setStatus(message);
      pushToast("error", message);
      return;
    }

    if (!searchForm.keyword.trim()) {
      const message = "Enter a search keyword first.";
      setStatus(message);
      pushToast("error", message);
      return;
    }

    await runAction("Running discovery...", async () => {
      try {
        const response = await fetchBackend<ResultPayload<Product[]>>(
          "/products/manual-search",
          {
            method: "POST",
            body: searchForm,
          },
        );
        const result = extractResult<Product[]>(response);
        setProducts(result);
        setStatus(
          `Discovery completed with ${result.length} products for "${searchForm.keyword}".`,
        );
        pushToast("success", `Discovery returned ${result.length} products.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(message);
        pushToast("error", message);
      }
    });
  };

  const getProductBadge = (product: Product) => {
    if ((product.criteriaScore ?? 0) >= 5) {
      return {
        label: "Winning",
        className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
      };
    }

    if (product.isNew) {
      return {
        label: "New",
        className: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
      };
    }

    return {
      label: "Review",
      className: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    };
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_30px_120px_rgba(2,6,23,0.6)] backdrop-blur-xl sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <SparklesIcon className="h-4 w-4" />
              Product intelligence console
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              E-Commerce Agent Dashboard
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Run discovery, track platform presence, and review scored products
              from one focused operations surface.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-lg shadow-slate-950/20">
            <span
              className={`h-2.5 w-2.5 rounded-full ${authenticated ? "bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.75)]" : "bg-slate-500"}`}
            />
            <span>
              {authenticated ? "Session active" : "No active session"}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Squares2X2Icon}
            label="Products Monitored"
            value={stats.monitored}
            helper="Tracked in the current session."
          />
          <StatCard
            icon={ClockIcon}
            label="New Today"
            value={stats.newToday}
            helper="Fresh discoveries worth reviewing."
          />
          <StatCard
            icon={ChartBarIcon}
            label="Average Score"
            value={stats.averageScore}
            helper="Average score across recent results."
          />
          <StatCard
            icon={ShieldCheckIcon}
            label="Winning Products"
            value={stats.winningProducts}
            helper="Products above the winning threshold."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.25fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Platform presence
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Quick visibility into where the current product set appears.
                  </p>
                </div>
                <TruckIcon className="h-6 w-6 text-cyan-300" />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {platformPresence.map((entry) => (
                  <div
                    key={entry.platform}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${entry.count > 0 ? "bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.5)]" : "bg-slate-600"}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {entry.platform}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.count > 0
                          ? `${entry.count} matches`
                          : "No matches yet"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Authentication
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Register or login with real credentials to unlock workflow
                    actions.
                  </p>
                </div>
                <BellAlertIcon className="h-6 w-6 text-amber-300" />
              </div>

              <div className="mt-5 grid gap-3">
                <input
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Name"
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
                />
                <input
                  value={registerForm.email}
                  onChange={(event) => {
                    const email = event.target.value;
                    setRegisterForm((current) => ({ ...current, email }));
                    setLoginForm((current) => ({ ...current, email }));
                  }}
                  placeholder="Email"
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
                />
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => {
                    const password = event.target.value;
                    setRegisterForm((current) => ({ ...current, password }));
                    setLoginForm((current) => ({ ...current, password }));
                  }}
                  placeholder="Password"
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Register
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  Login
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear session
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Search & discovery
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Expand the search bar to adjust your keyword and discovery
                    threshold.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSearchExpanded((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  {searchExpanded ? "Collapse" : "Expand"}
                  {searchExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
              </div>

              {!searchExpanded ? (
                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Current search
                    </p>
                    <p className="truncate text-sm font-medium text-white">
                      {searchForm.keyword} · Max {searchForm.maxPrice}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchExpanded(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    Edit search
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                    <input
                      value={searchForm.keyword}
                      onChange={(event) =>
                        setSearchForm((current) => ({
                          ...current,
                          keyword: event.target.value,
                        }))
                      }
                      placeholder="Search keyword"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
                    />
                    <input
                      type="number"
                      min="1"
                      value={searchForm.maxPrice}
                      onChange={(event) =>
                        setSearchForm((current) => ({
                          ...current,
                          maxPrice: Number(event.target.value) || 0,
                        }))
                      }
                      placeholder="Max price"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={startVoiceSearch}
                      disabled={loading || !authenticated || !voiceSupported}
                      className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {voiceListening ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <MagnifyingGlassIcon className="h-4 w-4" />
                      )}
                      {voiceListening ? "Listening..." : "Voice search"}
                    </button>

                    <button
                      type="button"
                      onClick={runDiscovery}
                      disabled={loading || !authenticated}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      Run Discovery
                    </button>

                    <button
                      type="button"
                      onClick={loadProducts}
                      disabled={loading || !authenticated}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Load stored products
                    </button>
                  </div>

                  {!voiceSupported ? (
                    <p className="text-xs text-slate-500">
                      Voice search is only available in browsers with the Web
                      Speech API.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Status
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                {status}
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Recent products
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  A compact table of the latest products returned by discovery.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
                {recentProducts.length} shown
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left">
                  <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.22em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Platform</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-slate-950/45 text-sm text-slate-200">
                    {recentProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          No products loaded yet. Authenticate first, then run a
                          discovery.
                        </td>
                      </tr>
                    ) : (
                      recentProducts.map((product) => {
                        const badge = getProductBadge(product);

                        return (
                          <tr key={product.id} className="hover:bg-white/5">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-300">
                                  <Squares2X2Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-white">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {product.id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                                {product.platform}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-200">
                              {product.source ?? "N/A"}
                            </td>
                            <td className="px-4 py-4 font-medium text-white">
                              {product.currency} {product.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-4 text-slate-200">
                              {product.criteriaScore !== null
                                ? product.criteriaScore.toFixed(2)
                                : "N/A"}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {recentProducts.slice(0, 2).map((product) =>
                product.url && product.source?.toLowerCase() !== "demo" ? (
                  <a
                    key={`${product.id}-link`}
                    href={product.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 transition hover:border-cyan-400/20 hover:bg-slate-950/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Open product page
                      </p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-cyan-300 transition group-hover:translate-x-0.5" />
                  </a>
                ) : (
                  <div
                    key={`${product.id}-link`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        No product URL available
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-3 sm:right-6 sm:top-6">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-slate-950/30 backdrop-blur ${toastStyles[toast.type]}`}
            >
              <div className="mt-0.5 rounded-full bg-white/10 p-1">
                {toast.type === "success" ? (
                  <ShieldCheckIcon className="h-4 w-4" />
                ) : toast.type === "error" ? (
                  <BellAlertIcon className="h-4 w-4" />
                ) : (
                  <ClockIcon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold capitalize">{toast.type}</p>
                <p className="mt-1 text-sm leading-6 text-current/90">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 text-current/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss toast"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
          {label}
        </p>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  );
}
