type RedirectSystemPathOptions = {
  path: string;
  initial: boolean;
};

/**
 * Razorpay/UPI apps may return to E-MAN with only the custom scheme
 * (for example emanreact:///). That URL is not a real Expo Router page.
 * Always normalize that bare callback to our dedicated recovery route.
 */
export function redirectSystemPath({
  path,
}: RedirectSystemPathOptions): string {
  try {
    const incoming = String(path || "").trim();

    if (!incoming || incoming === "/" || /^\/{2,}$/.test(incoming)) {
      return "/user/payment-return";
    }

    if (/^emanreact:\/*$/i.test(incoming)) {
      return "/user/payment-return";
    }

    const parsed = new URL(incoming, "emanreact://app");

    if (
      parsed.protocol.toLowerCase() === "emanreact:" &&
      !parsed.hostname &&
      (!parsed.pathname || parsed.pathname === "/")
    ) {
      return "/user/payment-return";
    }

    return path;
  } catch {
    return "/user/payment-return";
  }
}
