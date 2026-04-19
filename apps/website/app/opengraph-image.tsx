import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col justify-center bg-[#1A5C38] px-20 text-white">
        <div tw="text-[96px] font-bold text-[#FF6B35]">goZaika</div>
        <div tw="mt-6 text-[36px]">India&apos;s mystery meal drop platform.</div>
        <div tw="mt-4 text-[28px] text-[#EAF3DE]">
          Discover. Pickup. Devour.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
