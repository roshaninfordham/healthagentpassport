import {
  createHash,
  generateKeyPairSync,
  randomUUID,
  sign,
  verify
} from "node:crypto";
import { readFile } from "node:fs/promises";
import type { AgentKeyFile } from "./types.js";

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function bodyHash(body: unknown): string {
  return sha256Hex(stableJson(body ?? {}));
}

export function signingBaseString(input: {
  method: string;
  path: string;
  body?: unknown;
  timestamp: string;
  nonce: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.path,
    bodyHash(input.body ?? {}),
    input.timestamp,
    input.nonce
  ].join("\n");
}

export function signText(privateKeyPem: string, text: string): string {
  return sign(null, Buffer.from(text), privateKeyPem).toString("base64");
}

export function verifyText(
  publicKeyPem: string,
  text: string,
  signatureBase64: string
): boolean {
  try {
    return verify(
      null,
      Buffer.from(text),
      publicKeyPem,
      Buffer.from(signatureBase64, "base64")
    );
  } catch {
    return false;
  }
}

export function makeEd25519KeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" })
  };
}

export async function readAgentKeyFile(agentKeyFile: string) {
  return JSON.parse(await readFile(agentKeyFile, "utf8")) as AgentKeyFile;
}

export async function signAgentRequest(input: {
  agentKeyFile: string;
  method: string;
  path: string;
  body?: unknown;
  runId?: string;
  sandboxScenario?: "trusted" | "attack";
}) {
  const agent = await readAgentKeyFile(input.agentKeyFile);

  if (!agent.privateKeyPem) {
    throw new Error(`Agent key ${input.agentKeyFile} does not include privateKeyPem.`);
  }

  const timestamp = new Date().toISOString();
  const nonce = randomUUID();
  const base = signingBaseString({
    method: input.method,
    path: input.path,
    body: input.body ?? {},
    timestamp,
    nonce
  });
  const signature = signText(agent.privateKeyPem, base);

  return {
    agent,
    headers: {
      "x-agent-id": agent.id,
      "x-agent-timestamp": timestamp,
      "x-agent-nonce": nonce,
      "x-agent-signature": signature,
      ...(input.runId ? { "x-hap-run-id": input.runId } : {}),
      ...(input.sandboxScenario
        ? { "x-hap-sandbox-scenario": input.sandboxScenario }
        : {})
    }
  };
}
