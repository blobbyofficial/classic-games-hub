/**
 * Discord interaction signature verification (Ed25519 via WebCrypto).
 * Discord signs every interaction POST with the app's key pair; anything that
 * fails verification MUST be rejected with a 401 or Discord disables the
 * endpoint.
 */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

let cachedKey: CryptoKey | null = null;
let cachedKeyHex = "";

async function importKey(publicKeyHex: string): Promise<CryptoKey> {
  if (cachedKey && cachedKeyHex === publicKeyHex) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    "raw",
    hexToBytes(publicKeyHex) as unknown as BufferSource,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  cachedKeyHex = publicKeyHex;
  return cachedKey;
}

export async function verifyDiscordRequest(
  publicKeyHex: string,
  signatureHex: string | null,
  timestamp: string | null,
  rawBody: string,
): Promise<boolean> {
  if (!publicKeyHex || !signatureHex || !timestamp) return false;
  try {
    const key = await importKey(publicKeyHex);
    const data = new TextEncoder().encode(timestamp + rawBody);
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBytes(signatureHex) as unknown as BufferSource,
      data as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}
