export function isCorsRequest(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    const originURL = new URL(origin);
    const reqURL = new URL(request.url);
    return (
      originURL.host !== reqURL.host || originURL.protocol !== reqURL.protocol
    );
  } catch {
    return true;
  }
}
