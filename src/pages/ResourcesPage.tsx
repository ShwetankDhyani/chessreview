import { useState } from "react";
import { Link } from "react-router-dom";
import { SiteChrome } from "../components/SiteChrome";
import {
  AFFILIATE_PRODUCTS,
  CATEGORY_LABELS,
  getLiveProducts,
  isPlacementEnabled,
  type AffiliateCategory,
  type AffiliateProduct,
} from "../config/affiliateProducts";
import { AffiliateCard } from "../components/affiliate/AffiliateCard";
import {
  AffiliateDisclosure,
  AffiliateDisclosureContent,
} from "../components/affiliate/AffiliateDisclosure";
import { hapticSoft } from "../utils/chessSounds";
import { usePageSeo } from "../hooks/usePageSeo";

const SECTIONS: {
  id: string;
  title: string;
  description: string;
  categories: AffiliateCategory[];
}[] = [
  {
    id: "training",
    title: "Training & courses",
    description: "Structured improvement for openings, tactics, and strategy",
    categories: ["course", "training", "software"],
  },
  {
    id: "books",
    title: "Essential books",
    description: "Time-tested chess literature",
    categories: ["book"],
  },
  {
    id: "equipment",
    title: "Boards & clocks",
    description: "Gear for serious practice and tournament play",
    categories: ["board", "clock"],
  },
];

export default function ResourcesPage() {
  const [showDisclosure, setShowDisclosure] = useState(false);

  usePageSeo({
    title: "Recommended Chess Tools & Books — ChessReview",
    description:
      "Curated chess books, courses, boards, and clocks. Honest recommendations that help keep ChessReview free.",
    path: "/resources",
  });

  if (!isPlacementEnabled("resourcesPage")) {
    return (
      <SiteChrome title="Recommended">
        <div className="page-inline-pad max-w-3xl mx-auto py-8 text-center text-sm text-chess-muted">
          Recommendations are currently disabled.
        </div>
      </SiteChrome>
    );
  }

  const live = getLiveProducts();
  // In DEV show all so owner can preview placeholders
  const catalog = import.meta.env.DEV ? AFFILIATE_PRODUCTS : live;

  return (
    <SiteChrome title="Recommended">
      <div className="page-inline-pad max-w-4xl mx-auto py-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-chess-text mb-2">
            Recommended chess tools &amp; books
          </h1>
          <p className="text-sm text-chess-subtext leading-relaxed">
            Curated picks with honest &quot;best for&quot; notes.{" "}
            <button
              type="button"
              onClick={() => {
                hapticSoft();
                setShowDisclosure((v) => !v);
              }}
              className="text-chess-accent hover:underline"
            >
              {showDisclosure ? "Hide" : "View"} disclosure
            </button>
            {" · "}
            <Link
              to="/affiliate-disclosure"
              className="text-chess-accent hover:underline"
            >
              Full page
            </Link>
          </p>
          {showDisclosure ? (
            <div className="mt-4">
              <AffiliateDisclosureContent />
            </div>
          ) : (
            <AffiliateDisclosure className="mt-4" />
          )}
        </header>

        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const products = catalog.filter((p) =>
              section.categories.includes(p.category)
            );
            if (products.length === 0) return null;
            return (
              <section key={section.id}>
                <div className="mb-3">
                  <h2 className="text-lg font-bold text-chess-text">
                    {section.title}
                  </h2>
                  <p className="text-xs text-chess-muted">{section.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((product) => (
                    <ResourceFeatured key={product.id} product={product} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-8 pt-6 border-t border-chess-hairline text-xs text-chess-muted text-center">
          These are genuine recommendations. Commissions help keep ChessReview
          free.{" "}
          <Link to="/about" className="text-chess-accent hover:underline">
            How we operate
          </Link>
        </p>
      </div>
    </SiteChrome>
  );
}

function ResourceFeatured({ product }: { product: AffiliateProduct }) {
  return (
    <div className="space-y-1">
      <AffiliateCard
        product={product}
        placement="resources-page"
        variant="featured"
      />
      {import.meta.env.DEV && product.needsReferralId ? (
        <p className="text-[9px] text-chess-muted/70 italic px-1">
          DEV: placeholder link ({CATEGORY_LABELS[product.category]})
        </p>
      ) : null}
    </div>
  );
}
