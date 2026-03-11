export interface CredibilityScore {
  score: number;
  label: "High" | "Good" | "Mixed" | "Unknown";
  color: string;
}

const HIGH_DOMAINS = new Set([
  "wikipedia.org", "nature.com", "science.org", "sciencedirect.com", "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov", "bbc.com", "bbc.co.uk", "reuters.com", "apnews.com", "ap.org",
  "who.int", "cdc.gov", "nih.gov", "nasa.gov", "europa.eu", "un.org",
  "harvard.edu", "mit.edu", "stanford.edu", "oxford.ac.uk", "cambridge.org",
  "springer.com", "wiley.com", "jstor.org", "arxiv.org", "ieee.org", "acm.org",
]);

const GOOD_DOMAINS = new Set([
  "nytimes.com", "washingtonpost.com", "theguardian.com", "economist.com",
  "wsj.com", "ft.com", "bloomberg.com", "businessinsider.com",
  "techcrunch.com", "wired.com", "arstechnica.com", "theverge.com",
  "github.com", "stackoverflow.com", "developer.mozilla.org", "docs.python.org",
  "medium.com", "substack.com", "forbes.com", "time.com", "nationalgeographic.com",
  "smithsonianmag.com", "scientificamerican.com", "technologyreview.com",
  "cnn.com", "nbcnews.com", "abcnews.go.com", "cbsnews.com",
]);

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.toLowerCase().replace(/^www\./, "");
  }
}

export function scoreSource(url: string): CredibilityScore {
  const domain = extractDomain(url);

  if (domain.endsWith(".gov") || domain.endsWith(".edu") || domain.endsWith(".mil")) {
    return { score: 92, label: "High", color: "#10B981" };
  }
  for (const d of HIGH_DOMAINS) {
    if (domain === d || domain.endsWith(`.${d}`)) {
      return { score: 88, label: "High", color: "#10B981" };
    }
  }
  for (const d of GOOD_DOMAINS) {
    if (domain === d || domain.endsWith(`.${d}`)) {
      return { score: 72, label: "Good", color: "#3B82F6" };
    }
  }
  if (domain.includes(".")) {
    return { score: 50, label: "Mixed", color: "#F59E0B" };
  }
  return { score: 30, label: "Unknown", color: "#6B7280" };
}
