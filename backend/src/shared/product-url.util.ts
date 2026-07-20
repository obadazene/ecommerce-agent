const PRODUCT_NOT_FOUND_MARKERS = [
  "this page no longer exists",
  "page does not exist",
  "page isn't available",
  "this item is no longer available",
  "esta página no existe",
  "esta pagina no existe",
];

export function normalizeProductUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return "";
  }

  try {
    return new URL(rawUrl).toString();
  } catch {
    return "";
  }
}

export async function resolveReachableProductUrl(
  rawUrl: string | null | undefined,
  timeoutMs: number = 3500,
): Promise<string> {
  const candidateUrl = normalizeProductUrl(rawUrl);

  if (!candidateUrl) {
    return "";
  }

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(candidateUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (!response.ok) {
      return "";
    }

    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const lowered = html.toLowerCase();
      if (
        PRODUCT_NOT_FOUND_MARKERS.some((marker) => lowered.includes(marker))
      ) {
        return "";
      }
    }

    return response.url || candidateUrl;
  } catch {
    return "";
  }
}
