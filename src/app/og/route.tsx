import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

// Dynamic per-page OG image (1200x630). og:image points here with ?title= &
// ?eyebrow=, so every shared comparison/glossary/blog link gets a distinct,
// on-topic preview instead of one generic default.png.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') || 'Privacy-first analytics that shows you revenue').slice(0, 120);
  const eyebrow = (searchParams.get('eyebrow') || 'Conclick').slice(0, 32);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#050505',
          padding: '72px',
          position: 'relative',
        }}
      >
        {/* purple glow */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '900px',
            height: '500px',
            background: 'radial-gradient(closest-side, rgba(108,99,201,0.35), rgba(108,99,201,0))',
          }}
        />
        {/* brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#6C63C9' }} />
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>Conclick</div>
        </div>

        {/* title block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '8px 18px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.05)',
              color: '#c7c5ec',
              fontSize: '22px',
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.08,
              letterSpacing: '-1.5px',
              maxWidth: '1000px',
            }}
          >
            {title}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '24px', color: '#8b88cf', fontWeight: 600 }}>conclick.io</div>
          <div style={{ fontSize: '20px', color: '#6b7280' }}>Analytics · Heatmaps · Funnels · Revenue</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'cache-control': 'public, max-age=86400, s-maxage=86400, immutable' },
    },
  );
}
