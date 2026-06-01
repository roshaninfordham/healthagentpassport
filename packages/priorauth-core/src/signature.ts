import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export function signText(privateKeyPem: string, text: string) {
  return sign(null, Buffer.from(text), createPrivateKey(privateKeyPem)).toString(
    "base64url"
  );
}

export function verifyText(
  publicKeyPem: string,
  text: string,
  signature: string
) {
  try {
    return verify(
      null,
      Buffer.from(text),
      createPublicKey(publicKeyPem),
      Buffer.from(signature, "base64url")
    );
  } catch {
    return false;
  }
}
