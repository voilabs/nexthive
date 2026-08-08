const TRANSLITERATION: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

/** Mirrors the repository name generated authoritatively by the Rust backend. */
export function previewRepositoryName(profileName: string): string {
  const slug = Array.from(profileName.toLocaleLowerCase("tr-TR"))
    .map((character) => TRANSLITERATION[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

  return `nexthive-${slug || "backup"}`;
}
