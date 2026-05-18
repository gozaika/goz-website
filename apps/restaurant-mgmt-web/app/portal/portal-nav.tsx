const links = [
  ["Dashboard", "/portal/dashboard"],
  ["Onboarding", "/portal/onboarding"],
  ["Templates", "/portal/templates"],
  ["New drop", "/portal/drops/new"],
] as const;

export function PortalNav() {
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Restaurant portal">
      {links.map(([label, href]) => (
        <a
          key={href}
          href={href}
          className="inline-flex min-h-10 items-center rounded-lg border border-[#1A5C38]/20 px-3 text-sm font-semibold text-[#1A5C38] transition hover:border-[#1A5C38] hover:bg-[#EAF3DE]"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
