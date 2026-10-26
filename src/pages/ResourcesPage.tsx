import { Link } from "react-router-dom";
import { SiteChrome } from "../components/SiteChrome";
import { AFFILIATE_PRODUCTS, isAffiliateEnabled, type AffiliateProduct } from "../config/affiliateProducts";
import { AffiliateDisclosureContent } from "../components/AffiliateDisclosure";
import { hapticSoft } from "../utils/chessSounds";
import { useState } from "react";

interface CategorySection {
  id: string;
  title: string;
  description: string;
  categories: AffiliateProduct['category'][];
}

const SECTIONS: CategorySection[] = [
  {
    id: 'training',
    title: 'Training & Courses',
    description: 'Structured courses and training programs',
    categories: ['opening', 'tactics', 'endgame', 'strategy'],
  },
  {
    id: 'books',
    title: 'Chess Books',
    description: 'Classic and modern instructional books',
    categories: ['general'],
  },
  {
    id: 'equipment',
    title: 'Equipment',
    description: 'Boards, pieces, and clocks for serious practice',
    categories: ['equipment'],
  },
];

const LEVEL_LABELS: Record<AffiliateProduct['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all: 'All Levels',
};

const CATEGORY_LABELS: Record<AffiliateProduct['category'], string> = {
  opening: 'Opening',
  tactics: 'Tactics',
  endgame: 'Endgame',
  strategy: 'Strategy',
  general: 'General',
  equipment: 'Equipment',
};

export default function ResourcesPage() {
  const [showDisclosure, setShowDisclosure] = useState(false);

  if (!isAffiliateEnabled()) {
    return (
      <SiteChrome title="Resources">
        <div className="page-inline-pad max-w-3xl mx-auto py-8">
          <div className="rounded-xl border border-chess-hairline bg-chess-surface/40 px-4 py-6 text-center">
            <p className="text-sm text-chess-muted">
              Resource recommendations are currently disabled.
            </p>
          </div>
        </div>
      </SiteChrome>
    );
  }

  const trackClick = (productId: string) => {
    try {
      if (window.localStorage) {
        const clicks = JSON.parse(localStorage.getItem('affiliate_clicks') || '{}');
        clicks[productId] = (clicks[productId] || 0) + 1;
        localStorage.setItem('affiliate_clicks', JSON.stringify(clicks));
      }
    } catch {
      // Ignore
    }
  };

  return (
    <SiteChrome title="Recommended Resources">
      <div className="page-inline-pad max-w-4xl mx-auto py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-chess-text mb-2">
            Chess Resources
          </h1>
          <p className="text-sm text-chess-subtext leading-relaxed">
            Curated tools and training materials for chess improvement.{' '}
            <button
              type="button"
              onClick={() => {
                hapticSoft();
                setShowDisclosure(!showDisclosure);
              }}
              className="text-chess-accent hover:text-chess-accent-hover underline"
            >
              {showDisclosure ? 'Hide' : 'View'} affiliate disclosure
            </button>
          </p>
          
          {showDisclosure && (
            <div className="mt-4">
              <AffiliateDisclosureContent />
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const products = AFFILIATE_PRODUCTS.filter((p) =>
              section.categories.includes(p.category)
            );

            if (products.length === 0) return null;

            return (
              <section key={section.id}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-chess-text mb-1">
                    {section.title}
                  </h2>
                  <p className="text-xs text-chess-muted">
                    {section.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((product) => (
                    <ResourceCard
                      key={product.id}
                      product={product}
                      onTrack={trackClick}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-8 pt-6 border-t border-chess-hairline">
          <p className="text-xs text-chess-muted text-center">
            Have a suggestion for a resource we should add?{' '}
            <Link
              to="/about"
              className="text-chess-accent hover:text-chess-accent-hover"
            >
              Let us know
            </Link>
          </p>
        </div>
      </div>
    </SiteChrome>
  );
}

interface ResourceCardProps {
  product: AffiliateProduct;
  onTrack: (id: string) => void;
}

function ResourceCard({ product, onTrack }: ResourceCardProps) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => {
        hapticSoft();
        onTrack(product.id);
      }}
      className="group block rounded-xl border border-chess-hairline bg-chess-card shadow-elev-1 p-4 transition-all duration-200 ease-soft hover:border-chess-accent/30 hover:bg-chess-card-hover hover:shadow-elev-2"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-chess-text mb-1 truncate">
            {product.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-chess-surface text-chess-muted">
              {CATEGORY_LABELS[product.category]}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-chess-accent/10 text-chess-accent">
              {LEVEL_LABELS[product.level]}
            </span>
          </div>
        </div>
        <span className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-chess-hairline bg-chess-surface text-chess-muted group-hover:border-chess-accent/30 group-hover:bg-chess-accent/10 group-hover:text-chess-accent transition-all">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </span>
      </div>

      <p className="text-xs text-chess-subtext leading-relaxed mb-2">
        {product.description}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted">
          {product.partner}
        </span>
        {product.needsReferralId && (
          <span className="text-[9px] text-chess-muted/70 italic">
            Placeholder link
          </span>
        )}
      </div>
    </a>
  );
}
