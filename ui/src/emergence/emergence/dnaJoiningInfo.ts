import { decode, encode } from "@msgpack/msgpack";

export interface DnaJoiningInfo {
  originalDnaHash: Uint8Array;
  name: string;
  networkSeed: string;
}

// Encode a dna clone description as a base64 string for easily sharing
export const encodeDnaJoiningInfo = (originalDnaHash: Uint8Array, name: string, networkSeed: string): string => btoa(String.fromCharCode.apply(null, encode({originalDnaHash, name, networkSeed})));

// Decode base64 string back to clone description
export const decodeDnaJoiningInfo = (shareCode: string): DnaJoiningInfo => decode(new Uint8Array(atob(shareCode).split("").map((c) => c.charCodeAt(0)))) as DnaJoiningInfo;

// True when a decoded value has the shape of a DnaJoiningInfo. Used to reject
// arbitrary QR codes that happen to be valid base64 msgpack.
export const isDnaJoiningInfo = (value: unknown): value is DnaJoiningInfo => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.originalDnaHash instanceof Uint8Array
    && typeof v.name === "string"
    && typeof v.networkSeed === "string";
};

// Decode a string that may have come from anywhere (a QR scan, a paste) and
// return the joining info only if it is one.
export const tryDecodeDnaJoiningInfo = (shareCode: string): DnaJoiningInfo | undefined => {
  try {
    const info = decodeDnaJoiningInfo(shareCode);
    return isDnaJoiningInfo(info) ? info : undefined;
  } catch {
    return undefined;
  }
};
