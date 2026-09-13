/**
 * JSON-LD helpers for marketing / SEO pages (kept out of the board app).
 */

import { SITE_ORIGIN } from "./seo";

export function webPageJsonLd(input: {
  path: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  const url = `${SITE_ORIGIN}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#page`,
    name: input.name,
    url,
    description: input.description,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
  };
}

export function faqPageJsonLd(
  items: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
