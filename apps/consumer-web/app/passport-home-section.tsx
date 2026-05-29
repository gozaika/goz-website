"use client";

import { ZaykaPassportCard } from "@gozaika/ui";
import type { ZaykaPassportPayload } from "@gozaika/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function PassportHomeSection() {
  const [payload, setPayload] = useState<ZaykaPassportPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/account/passport")
      .then((r) => r.json())
      .then((json) => { if (json.ok) setPayload(json.data as ZaykaPassportPayload); })
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);

  // Don't show section until loaded, and skip if not signed in (no payload)
  if (!loaded || !payload) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="rounded-xl border border-[#1A5C38]/20 bg-[#F0F9F4] p-6 lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1A5C38]">Zayka Passport</p>
            <h2 className="mt-1 text-2xl font-bold text-[#2D2D2D]">Track your food journey</h2>
            <p className="mt-2 max-w-lg text-sm text-[#2D2D2D]/70">
              Every BAM Bag you claim expands your Flavour Passport — new cuisines, new neighbourhoods, higher tier access.
            </p>
          </div>
          <div className="mt-4 flex gap-3 lg:mt-0 lg:flex-col lg:items-end">
            <Link
              href="/auth/login?next=/account/passport"
              className="inline-flex min-h-11 items-center rounded-lg bg-[#1A5C38] px-5 text-sm font-bold text-white"
            >
              View Passport
            </Link>
            <Link
              href="/account/discovery"
              className="inline-flex min-h-11 items-center rounded-lg border border-[#1A5C38]/25 px-5 text-sm font-semibold text-[#1A5C38]"
            >
              Flavour Passport
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#2D2D2D]">Your Passport Progress</h2>
        <Link href="/account/passport" className="text-sm font-semibold text-[#1A5C38] hover:underline">
          View full passport →
        </Link>
      </div>
      <ZaykaPassportCard passport={payload} compact />
    </section>
  );
}
