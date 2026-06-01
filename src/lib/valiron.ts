import type { TrustRoute } from "./trust";

type ValironLike = {
  checkAgent: (
    agentId: string,
    options: { chain: string }
  ) => Promise<unknown>;
};

function isTrustRoute(value: unknown): value is TrustRoute {
  return (
    value === "prod" ||
    value === "prod_throttled" ||
    value === "sandbox" ||
    value === "sandbox_only"
  );
}

export async function getValironRoute(
  agentId: string
): Promise<TrustRoute | null> {
  if (process.env.VALIRON_MODE !== "live") return null;

  try {
    const importer = new Function(
      "specifier",
      "return import(specifier)"
    ) as (specifier: string) => Promise<Record<string, unknown>>;
    const sdkModule = await importer("@valiron/sdk");
    const ValironSDK = sdkModule.ValironSDK as
      | (new (input: { chain: string }) => ValironLike)
      | undefined;

    if (!ValironSDK) return null;

    const valiron = new ValironSDK({
      chain: process.env.VALIRON_CHAIN || "solana"
    });
    const route = await valiron.checkAgent(agentId, {
      chain: process.env.VALIRON_CHAIN || "solana"
    });

    return isTrustRoute(route) ? route : null;
  } catch (error) {
    console.error("Valiron live route failed; using local trust.", error);
    return null;
  }
}
