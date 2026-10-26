import { SiteChrome } from "../components/SiteChrome";
import { AffiliateDisclosureContent } from "../components/affiliate/AffiliateDisclosure";
import { usePageSeo } from "../hooks/usePageSeo";

export default function AffiliateDisclosurePage() {
  usePageSeo({
    title: "Affiliate Disclosure — ChessReview",
    description:
      "How ChessReview.org uses affiliate links to keep free chess game reviews online.",
    path: "/affiliate-disclosure",
  });

  return (
    <SiteChrome title="Affiliate disclosure">
      <main className="page-inline-pad max-w-2xl mx-auto py-8 sm:py-10">
        <AffiliateDisclosureContent />
      </main>
    </SiteChrome>
  );
}
