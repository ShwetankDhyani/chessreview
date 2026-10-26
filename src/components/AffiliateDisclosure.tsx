/**
 * Affiliate disclosure component
 * 
 * Shows required FTC disclosure for affiliate links
 */

interface AffiliateDisclosureProps {
  inline?: boolean;
  className?: string;
}

export function AffiliateDisclosure({ inline = false, className = "" }: AffiliateDisclosureProps) {
  if (inline) {
    return (
      <p className={`text-[10px] text-chess-muted leading-relaxed ${className}`}>
        Some links on this page are affiliate links. We may earn a small commission if you purchase through them, at no extra cost to you. This helps keep ChessReview free.
      </p>
    );
  }

  return (
    <div className={`rounded-lg border border-chess-hairline bg-chess-surface/40 px-3 py-2 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1">
        Affiliate Disclosure
      </p>
      <p className="text-[11px] text-chess-subtext leading-relaxed">
        ChessReview participates in affiliate programs. When you purchase through our links, we may earn a small commission at no extra cost to you. This helps cover server costs and keeps the site free. We only recommend products we believe are genuinely helpful for chess improvement.
      </p>
    </div>
  );
}

/**
 * Full disclosure page content
 */
export function AffiliateDisclosureContent() {
  return (
    <div className="space-y-4 text-sm text-chess-subtext leading-relaxed">
      <h2 className="text-lg font-bold text-chess-text">Affiliate Disclosure</h2>
      
      <p>
        ChessReview participates in several affiliate and referral programs to help support the site's operation costs.
      </p>
      
      <p>
        <strong className="text-chess-text">What this means:</strong> When you click on certain links to chess courses, books, equipment, or training platforms and make a purchase, we may receive a small commission. This comes at no extra cost to you — the price you pay is exactly the same whether you use our link or go directly to the site.
      </p>
      
      <p>
        <strong className="text-chess-text">Our promise:</strong> We only recommend products and services we believe are genuinely useful for chess improvement. Our recommendations are based on quality and relevance, not commission rates.
      </p>
      
      <p>
        <strong className="text-chess-text">Programs we participate in:</strong>
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Chessable affiliate program</li>
        <li>Chess.com affiliate program</li>
        <li>ChessMood affiliate program</li>
        <li>Amazon Associates (for chess books and equipment)</li>
      </ul>
      
      <p>
        All affiliate links use <code className="text-xs bg-chess-surface px-1 py-0.5 rounded">rel="sponsored noopener noreferrer"</code> attributes as recommended by search engines.
      </p>
      
      <p className="text-xs text-chess-muted">
        If you have questions about our affiliate relationships, contact us at admin@chessreview.org
      </p>
    </div>
  );
}
