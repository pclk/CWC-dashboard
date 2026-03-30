import type { NextConfig } from "next";

const defaultLocalDevPort = "3000";
const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const forwardedHostPatterns = codespacesForwardingDomain
  ? [`*.${codespacesForwardingDomain}`]
  : [];
const allowedDevOrigins = ["localhost", ...forwardedHostPatterns];
const allowedServerActionOrigins = [
  `localhost:${defaultLocalDevPort}`,
  `127.0.0.1:${defaultLocalDevPort}`,
  `[::1]:${defaultLocalDevPort}`,
  ...forwardedHostPatterns,
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  experimental: {
    // Codespaces can proxy requests from a forwarded host while the browser origin remains localhost.
    serverActions: {
      allowedOrigins: allowedServerActionOrigins,
    },
  },
};

export default nextConfig;
