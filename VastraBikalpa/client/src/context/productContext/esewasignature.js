import CryptoJS from "crypto-js";

export function generateEsewaSignature(message) {
  const secretkey = "8gBm/:&EnhH.1/q";
  if (!secretkey) {
    throw new Error("Missing ESEWA_SECRET_KEY in environment variables.");
  }
  return CryptoJS.HmacSHA256(message, secretkey).toString(CryptoJS.enc.Base64);
}

// Helper function to create signature message for v2
export function createSignatureMessage(
  total_amount,
  transaction_uuid,
  product_code
) {
  return `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
}
