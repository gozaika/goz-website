import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1A5C38',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          color: '#FFFFFF',
        }}
      >
        <div style={{ color: '#FF6B35', fontSize: 96, fontWeight: 700 }}>goZaika</div>
        <div style={{ fontSize: 36, marginTop: 24 }}>India&apos;s mystery meal drop platform.</div>
        <div style={{ color: '#EAF3DE', fontSize: 28, marginTop: 16 }}>
          Discover. Pickup. Devour.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
