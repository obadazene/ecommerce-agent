"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
};

type RegisterResponse = AuthResponse;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:3000";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_COOKIE_KEY = "auth_token";

function getApiUrl(path: string) {
  const normalizedBase = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function postJson<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Request failed.";
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) {
        errorMessage = data.message.join(" ");
      } else if (typeof data.message === "string") {
        errorMessage = data.message;
      }
    } catch {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

function saveSession(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(accessToken)}; path=/; max-age=86400; samesite=lax`;
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const response = await postJson<AuthResponse>("/auth/login", {
      email,
      password,
    });

    if (!response.accessToken) {
      throw new Error("Login succeeded but access token is missing.");
    }

    saveSession(response.accessToken, response.refreshToken);
    router.push("/");
    router.refresh();
  };

  const handleRegister = async () => {
    const registerResponse = await postJson<RegisterResponse>(
      "/auth/register",
      {
        name,
        email,
        password,
      },
    );

    if (registerResponse.accessToken) {
      saveSession(registerResponse.accessToken, registerResponse.refreshToken);
      router.push("/");
      router.refresh();
      return;
    }

    await handleLogin();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegisterMode) {
        await handleRegister();
      } else {
        await handleLogin();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              🔐 E-Commerce Agent
            </h1>
            <p className="text-sm text-slate-600">
              AI-powered product discovery
            </p>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Secure Login
            </span>
          </div>

          <form
            className="mx-auto mt-7 w-full max-w-md space-y-5"
            onSubmit={onSubmit}
          >
            {isRegisterMode ? (
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="name"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoComplete="name"
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Your name"
                />
              </div>
            ) : null}

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={
                  isRegisterMode ? "new-password" : "current-password"
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : isRegisterMode
                  ? "Create account"
                  : "Login"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
            {isRegisterMode
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode((current) => !current);
                setError("");
              }}
              className="font-medium text-slate-900 underline underline-offset-4"
            >
              {isRegisterMode ? "Login" : "Register"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
