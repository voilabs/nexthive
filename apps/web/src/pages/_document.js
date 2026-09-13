import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  // `lang` is filled in from the active i18n locale.
  return (
    <Html>
      <Head />
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
