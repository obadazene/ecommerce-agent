const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3000";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type JsonBody =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | Array<unknown>;

type FetchBackendOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | JsonBody;
  query?: QueryParams;
};

const getStoredAccessToken = () =>
  typeof window !== "undefined"
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;

const getStoredRefreshToken = () =>
  typeof window !== "undefined"
    ? window.localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;

const setStoredAccessToken = (token: string) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};

const setStoredRefreshToken = (token: string) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const persistAuthSession = (
  accessToken: string,
  refreshToken: string,
) => {
  setStoredAccessToken(accessToken);
  setStoredRefreshToken(refreshToken);
};

export const clearAuthSession = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const hasStoredSession = () => Boolean(getStoredAccessToken());

const buildUrl = (path: string, query?: QueryParams) => {
  const normalizedBase = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}/auth/refresh`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: refreshToken }),
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { accessToken?: string };
  if (!data?.accessToken) {
    return false;
  }

  setStoredAccessToken(data.accessToken);
  return true;
};

export async function fetchBackend<T = unknown>(
  path: string,
  options: FetchBackendOptions = {},
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("fetchBackend can only be called from the browser.");
  }

  const { query, headers: customHeaders, body, ...rest } = options;
  const url = buildUrl(path, query);
  const headers = new Headers(customHeaders ?? {});

  if (!headers.has("Content-Type") && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getStoredAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const requestInit: RequestInit = {
    ...rest,
    headers,
    body:
      body instanceof FormData ||
      typeof body === "string" ||
      body instanceof Blob
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  };

  let response = await fetch(url, requestInit);

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const refreshedToken = getStoredAccessToken();
      if (refreshedToken) {
        headers.set("Authorization", `Bearer ${refreshedToken}`);
      }
      response = await fetch(url, requestInit);
    }
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Backend request failed: ${response.status} ${response.statusText} - ${responseText}`,
    );
  }

  return response.json() as Promise<T>;
}
