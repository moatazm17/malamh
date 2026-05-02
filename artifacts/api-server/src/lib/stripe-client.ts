/**
 * Stripe client via Replit Connectors.
 * WARNING: Never cache this client — tokens expire.
 * Always call getUncachableStripeClient() fresh on every request.
 */
import Stripe from "stripe";

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    // Fall back to env var for local dev / non-Replit environments
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return null;
    return { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "", secretKey };
  }

  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", connectorName);
  url.searchParams.set("environment", targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken,
    },
  });

  if (!response.ok) return null;
  const data = await response.json() as any;
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret) return null;

  return {
    publishableKey: settings.publishable ?? "",
    secretKey: settings.secret as string,
  };
}

export async function getUncachableStripeClient(): Promise<Stripe | null> {
  const creds = await getCredentials();
  if (!creds) return null;

  return new Stripe(creds.secretKey, {
    apiVersion: "2025-08-27.basil" as any,
  });
}

export async function getStripePublishableKey(): Promise<string | null> {
  const creds = await getCredentials();
  return creds?.publishableKey ?? null;
}
