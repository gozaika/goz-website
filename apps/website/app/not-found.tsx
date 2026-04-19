import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div className="mx-auto flex max-w-screen-md flex-col items-center px-4 py-24 text-center md:px-6">
      <h1 className="heading-page text-gray900">Page not found</h1>
      <p className="mt-3 text-base text-gray700">
        The page you requested does not exist or has moved to a canonical route.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-saffron px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-saffron-hover)]"
      >
        Go to Homepage
      </Link>
    </div>
  );
}
