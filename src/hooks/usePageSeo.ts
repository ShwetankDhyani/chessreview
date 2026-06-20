import { useEffect, useMemo } from "react";
import { applyPageSeo, DEFAULT_SEO, restoreHomeJsonLd, type PageSeoOptions } from "../utils/seo";

/** Sync `<head>` tags when a route mounts or its SEO props change. */
export function usePageSeo(options: PageSeoOptions) {
  const jsonLdKey = useMemo(
    () => (options.jsonLd ? JSON.stringify(options.jsonLd) : ""),
    [options.jsonLd]
  );

  useEffect(() => {
    applyPageSeo(options);
    return () => {
      applyPageSeo({
        title: DEFAULT_SEO.title,
        description: DEFAULT_SEO.description,
        path: "/",
      });
      restoreHomeJsonLd();
    };
  }, [
    options.title,
    options.description,
    options.path,
    options.ogType,
    options.ogImage,
    options.noindex,
    jsonLdKey,
  ]);
}
