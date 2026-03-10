const REDACTION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /[\w.-]+@[\w.-]+\.\w{2,}/gi, replacement: "[EMAIL]" },
  { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: "[SSN]" },
  {
    pattern:
      /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE]",
  },
  {
    pattern: /\b4[0-9]{12}(?:[0-9]{3})?\b|\b5[1-5][0-9]{14}\b|\b3[47][0-9]{13}\b|\b3(?:0[0-5]|[68][0-9])[0-9]{11}\b|\b6(?:011|5[0-9]{2})[0-9]{12}\b/g,
    replacement: "[CARD]",
  },
  {
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    replacement: "[PASSPORT/ID]",
  },
  {
    pattern:
      /(?:password|passwd|secret|api[_-]?key|token|bearer)\s*[:=]\s*\S+/gi,
    replacement: "[SECRET]",
  },
  {
    pattern:
      /-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}/g,
    replacement: "[LOCATION]",
  },
];

export function redactPII(text: string): string {
  let result = text;
  for (const rule of REDACTION_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}
