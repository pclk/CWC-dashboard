export type SessionDeviceMetadata = {
  userAgent: string | null;
  ipAddress: string | null;
  browser: string;
  os: string;
  deviceType: string;
  deviceLabel: string;
};

function extractClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);

  return (
    firstForwardedIp ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("fastly-client-ip") ||
    null
  );
}

function withMajorVersion(name: string, version?: string) {
  const majorVersion = version?.split(".")[0];

  return majorVersion ? `${name} ${majorVersion}` : name;
}

function detectBrowser(userAgent: string) {
  const rules: Array<[RegExp, string]> = [
    [/EdgA?\/([\d.]+)/, "Microsoft Edge"],
    [/EdgiOS\/([\d.]+)/, "Microsoft Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/CriOS\/([\d.]+)/, "Chrome"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/FxiOS\/([\d.]+)/, "Firefox"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Version\/([\d.]+).*Safari\//, "Safari"],
  ];

  for (const [pattern, name] of rules) {
    const match = userAgent.match(pattern);

    if (match?.[1]) {
      return withMajorVersion(name, match[1]);
    }
  }

  return "Unknown browser";
}

function detectOs(userAgent: string) {
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    const version = userAgent.match(/OS ([\d_]+)/)?.[1]?.replaceAll("_", ".");
    return withMajorVersion("iOS", version);
  }

  if (/Android/.test(userAgent)) {
    return withMajorVersion("Android", userAgent.match(/Android ([\d.]+)/)?.[1]);
  }

  if (/Windows NT/.test(userAgent)) {
    return "Windows";
  }

  if (/Mac OS X/.test(userAgent)) {
    const version = userAgent.match(/Mac OS X ([\d_]+)/)?.[1]?.replaceAll("_", ".");
    return withMajorVersion("macOS", version);
  }

  if (/CrOS/.test(userAgent)) {
    return "Chrome OS";
  }

  if (/Linux/.test(userAgent)) {
    return "Linux";
  }

  return "Unknown OS";
}

function detectDeviceType(userAgent: string) {
  const normalized = userAgent.toLowerCase();

  if (/bot|crawler|spider|crawling/.test(normalized)) {
    return "bot";
  }

  if (/ipad|tablet/.test(normalized)) {
    return "tablet";
  }

  if (/mobile|iphone|ipod|android/.test(normalized)) {
    return "mobile";
  }

  if (/windows|macintosh|linux|cros/.test(normalized)) {
    return "desktop";
  }

  return "unknown";
}

export function getSessionDeviceMetadata(request: Request): SessionDeviceMetadata {
  const userAgent = request.headers.get("user-agent");

  if (!userAgent) {
    return {
      userAgent: null,
      ipAddress: extractClientIp(request.headers),
      browser: "Unknown browser",
      os: "Unknown OS",
      deviceType: "unknown",
      deviceLabel: "Unknown device",
    };
  }

  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);
  const deviceType = detectDeviceType(userAgent);

  return {
    userAgent,
    ipAddress: extractClientIp(request.headers),
    browser,
    os,
    deviceType,
    deviceLabel: `${browser} on ${os}`,
  };
}
