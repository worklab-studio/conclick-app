import { cn } from '@/lib/utils';
import { meshSpec } from '@/lib/mesh/spec';
import { meshSvg } from '@/lib/mesh/svg';

// The pastel hue-mesh image with one serif word on it. Used as the article hero
// AND, at small sizes, as the card thumbnail on the blog index.
//
// Server component. The SVG is generated at render and inlined, which means:
// crisp at every size (it is vector), zero extra network requests, and no
// /images/og/*.png build step to keep in sync.
//
// *** WHY THE WORD IS NOT IN THE SVG ***
// The art here is byte-for-byte the art the OG card uses, and the OG card is
// rasterized by resvg, which only knows about fonts passed to ImageResponse —
// a <text> node inside the SVG would silently render as tofu. So the art layer
// and the word layer are always separate, in both consumers. Here the word is
// real DOM text: selectable, translatable, and read by screen readers.
//
// *** KEEP THESE THREE NUMBERS IN SYNC WITH src/app/og/route.tsx ***
// They are what makes the hero and the social card look like one image.
const ART_W = 1200;
const ART_H = 630;
/** Word size as a % of the art's width. 10.8% of 1200 = 129.6px on the OG card. */
const WORD_SIZE_PCT = 10.8;
/** Word inset from the left/bottom edges, % of width. 6% of 1200 = 72px. */
const WORD_INSET_PCT = 6;

export interface MeshHeroProps {
  /** Drives the art. Same slug always yields the same image. */
  slug: string;
  /** The serif word, from heroWordFor(entry). Include its trailing period. */
  word: string;
  className?: string;
  /**
   * True for the one hero above the fold. Offscreen card thumbnails default to
   * `content-visibility: auto` so the browser can skip rasterizing the blur
   * filter for art the reader has not scrolled to yet.
   */
  priority?: boolean;
}

export function MeshHero({ slug, word, className, priority = false }: MeshHeroProps) {
  const svg = meshSvg(meshSpec(slug), ART_W, ART_H);

  return (
    <figure
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-white/10',
        // Arbitrary variant: stretch the generated SVG to fill the figure. The
        // SVG's own preserveAspectRatio="xMidYMid slice" handles any crop.
        '[&>div>svg]:block [&>div>svg]:h-full [&>div>svg]:w-full',
        className,
      )}
      style={{
        // The whole point: the word is sized in cqw against THIS box, so a
        // 320px card thumb and a 1200px hero are the same composition scaled,
        // not one with a comically oversized word.
        containerType: 'inline-size',
        aspectRatio: `${ART_W} / ${ART_H}`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={
          priority
            ? undefined
            : { contentVisibility: 'auto', containIntrinsicSize: `${ART_W}px ${ART_H}px` }
        }
        // Safe: `svg` is generated entirely by meshSvg from numeric spec values,
        // and the only string that reaches it — the id prefix — is stripped to
        // [a-z0-9-] in svg.ts. No entry content is interpolated.
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <figcaption className="absolute inset-0 flex items-end">
        <span
          // text-5xl is the fallback: if a browser cannot parse `cqw` it drops
          // the inline font-size declaration and this class still gives a
          // sensible size, rather than collapsing to 16px.
          className="text-5xl text-white"
          style={{
            fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            fontSize: `${WORD_SIZE_PCT}cqw`,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            paddingLeft: `${WORD_INSET_PCT}cqw`,
            paddingRight: `${WORD_INSET_PCT}cqw`,
            paddingBottom: `${WORD_INSET_PCT}cqw`,
            // Pastel art plus a baked-in bottom scrim already carries most of the
            // contrast; this is the last bit of insurance on the lightest blobs.
            textShadow: '0 1px 24px rgba(0,0,0,0.28)',
          }}
        >
          {word}
        </span>
      </figcaption>
    </figure>
  );
}

export default MeshHero;
