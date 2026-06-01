export type AnchorResult = {
  mode: "mock" | "live";
  delegationHash: string;
  signature: string;
  explorerUrl?: string;
};

export async function anchorDelegationHash(
  delegationHash: string
): Promise<AnchorResult> {
  if (process.env.SOLANA_MODE !== "live") {
    return {
      mode: "mock",
      delegationHash,
      signature: `mock-solana-anchor-${delegationHash.slice(0, 16)}`
    };
  }

  return {
    mode: "mock",
    delegationHash,
    signature: `live-not-configured-${delegationHash.slice(0, 16)}`
  };
}
