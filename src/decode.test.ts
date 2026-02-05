/**
 * Tests for Noema decoder
 */

import { decodeNoema, hasNoemaTokens } from "./decode.js";

// Test data
const testCases = [
  {
    name: "simple string",
    encoded: "§b64:Sm9obiBEb2U=§",
    decoded: "John Doe",
  },
  {
    name: "multiple tokens",
    encoded: "From §b64:Sm9obiBEb2U=§: §b64:SGVsbG8gV29ybGQ=§",
    decoded: "From John Doe: Hello World",
  },
  {
    name: "no tokens",
    encoded: "Plain text without encoding",
    decoded: "Plain text without encoding",
  },
  {
    name: "mixed content",
    encoded: "Priority: high, Subject: §b64:VXJnZW50IG1lZXRpbmc=§",
    decoded: "Priority: high, Subject: Urgent meeting",
  },
  {
    name: "empty string",
    encoded: "",
    decoded: "",
  },
  {
    name: "unicode content",
    encoded: "§b64:8J+Riw==§", // 👋 emoji
    decoded: "👋",
  },
];

// Run tests
let passed = 0;
let failed = 0;

console.log("Running Noema decoder tests...\n");

for (const tc of testCases) {
  const result = decodeNoema(tc.encoded);
  if (result === tc.decoded) {
    console.log(`✓ ${tc.name}`);
    passed++;
  } else {
    console.log(`✗ ${tc.name}`);
    console.log(`  Expected: ${tc.decoded}`);
    console.log(`  Got:      ${result}`);
    failed++;
  }
}

// Test hasNoemaTokens
const hasTokensTests = [
  { input: "§b64:dGVzdA==§", expected: true },
  { input: "no tokens here", expected: false },
  { input: "", expected: false },
];

console.log("\nTesting hasNoemaTokens...\n");

for (const tc of hasTokensTests) {
  const result = hasNoemaTokens(tc.input);
  if (result === tc.expected) {
    console.log(`✓ hasNoemaTokens("${tc.input.slice(0, 20)}...") = ${result}`);
    passed++;
  } else {
    console.log(`✗ hasNoemaTokens("${tc.input.slice(0, 20)}...") expected ${tc.expected}, got ${result}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
