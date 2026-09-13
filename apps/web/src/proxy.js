import { NextResponse } from "next/server";

/*
 * Automatic language detection for first-time visitors.
 *
 * Next.js has built-in Accept-Language detection, but it only matches exact
 * locale tags: a browser sending `tr-TR` alone never reaches `/tr`. This runs
 * the match on the language subtag instead, so every Turkish browser lands on
 * the Turkish site. Built-in detection is therefore turned off in
 * next.config.mjs and this file is the single place the decision is made.
 *
 * An explicit choice always wins: the language switcher writes NEXT_LOCALE and
 * this redirect then stays out of the way.
 */

const LOCALES = ["en", "tr"];
const DEFAULT_LOCALE = "en";
const LOCALE_COOKIE = "NEXT_LOCALE";

export const config = {
  /* Skip API routes, Next internals and anything with a file extension. */
  matcher: ["/((?!api|_next/|.*\\.).*)"],
};

/* Highest-quality Accept-Language entry whose language subtag we publish. */
function detectLocale(header) {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.toLowerCase(), q: q === undefined ? 1 : Number(q) };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  const match = ranked.find((entry) => LOCALES.includes(entry.tag.split("-")[0]));
  return match ? match.tag.split("-")[0] : DEFAULT_LOCALE;
}

export function proxy(request) {
  console.log("[proxy]", request.nextUrl.pathname, request.nextUrl.locale, request.headers.get("accept-language"));
  const { nextUrl } = request;

  /* A prefixed URL (/tr/...) is already an explicit request for that locale. */
  if (nextUrl.locale !== DEFAULT_LOCALE) return NextResponse.next();

  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  if (chosen && LOCALES.includes(chosen)) {
    if (chosen === DEFAULT_LOCALE) return NextResponse.next();
    return NextResponse.redirect(localeUrl(request, chosen));
  }

  const detected = detectLocale(request.headers.get("accept-language"));
  if (detected !== DEFAULT_LOCALE) {
    return NextResponse.redirect(localeUrl(request, detected));
  }

  /* The default-locale response depends on who is asking — say so to caches. */
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

function localeUrl(request, locale) {
  const { nextUrl } = request;
  const path = nextUrl.pathname === "/" ? "" : nextUrl.pathname;
  return new URL(`/${locale}${path}${nextUrl.search}`, request.url);
}
