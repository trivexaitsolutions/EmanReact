// E-MAN API: HTTPS live domain by default. Local testing may override via EXPO_PUBLIC_API_URL.
// For physical-device local testing use your PC's LAN IP, not localhost.
const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_URL = (
  configured || "https://emen.trivexait.online/api"
).replace(/\/+$/, "");
