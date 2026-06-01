import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify
} from "node:crypto";
import { canonicalJson } from "./canonical";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function makeEd25519KeyPair(): {
  publicKeyPem: string;
  privateKeyPem: string;
} {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey
  };
}

export function signText(privateKeyPem: string, text: string): string {
  const key = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(text), key).toString("base64url");
}

export function verifyText(
  publicKeyPem: string,
  text: string,
  signatureBase64Url: string
): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    return verify(
      null,
      Buffer.from(text),
      key,
      Buffer.from(signatureBase64Url, "base64url")
    );
  } catch {
    return false;
  }
}

export function bodyHash(body: unknown): string {
  if (body === null || body === undefined) return sha256Hex("");
  if (typeof body === "string") return sha256Hex(body);
  return sha256Hex(canonicalJson(body));
}

export function signingBaseString(input: {
  method: string;
  path: string;
  body: unknown;
  timestamp: string;
  nonce: string;
}): string {
  return [
    "HEALTHAGENT-PASSPORT-V1",
    input.method.toUpperCase(),
    input.path,
    bodyHash(input.body),
    input.timestamp,
    input.nonce
  ].join("\n");
}
