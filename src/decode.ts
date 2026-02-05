/**
 * Noema Output Decoder
 *
 * Decodes §b64:...§ encoded tokens back to plaintext before displaying to users.
 * This is applied at the output boundary (message_sending hook) so humans see
 * readable text while the AI only ever saw opaque tokens.
 */

const NOEMA_TOKEN_REGEX = /§b64:([A-Za-z0-9+/=]+)§/g;

/**
 * Decode all Noema-encoded tokens in a string.
 *
 * §b64:Sm9obiBEb2U=§ → John Doe
 */
export function decodeNoema(text: string): string {
  return text.replace(NOEMA_TOKEN_REGEX, (_, encoded: string) => {
    try {
      return Buffer.from(encoded, "base64").toString("utf-8");
    } catch {
      // If decoding fails, return the original token
      return `§b64:${encoded}§`;
    }
  });
}

/**
 * Check if a string contains Noema-encoded tokens.
 */
export function hasNoemaTokens(text: string): boolean {
  // Reset lastIndex since we're using a global regex
  NOEMA_TOKEN_REGEX.lastIndex = 0;
  return NOEMA_TOKEN_REGEX.test(text);
}
