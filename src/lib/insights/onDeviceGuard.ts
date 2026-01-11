// Insights must remain on-device (no entry text sent over the network).

let installed = false;

export function installInsightsNetworkGuard() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return () => {};
  if (installed) return () => {};
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (...args: Parameters<typeof fetch>) => {
    const input = args[0];
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
        ? input.url
        : "";

    // Block OpenAI calls while the Insights page is active.
    if (url.includes("api.openai.com") || url.includes("/v1/responses")) {
      throw new Error(
        "Insights are on-device only: network calls to OpenAI are blocked on this page."
      );
    }

    return originalFetch(...args);
  };

  return () => {
    window.fetch = originalFetch;
    installed = false;
  };
}
