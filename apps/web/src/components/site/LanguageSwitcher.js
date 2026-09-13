import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { DICTIONARIES, LOCALES, useI18n } from "@/i18n";

/*
 * Language dropdown for the site header. Closes on outside click, Escape, or
 * after a choice; the preference itself is stored by the i18n provider.
 */
export function LanguageSwitcher({ dark = false }) {
  const { locale, t, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const trigger = dark
    ? "border-white/15 bg-white/5 text-[#e6ece7] hover:border-white/25 hover:bg-white/10"
    : "border-black/10 bg-white text-[#101410] hover:bg-[#faf9f7]";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.language.menu}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 h-9 px-3 border text-[13px] font-semibold transition-colors ${trigger}`}
      >
        <Icon name="globe" size={15} strokeWidth={1.6} />
        {DICTIONARIES[locale].shortLabel}
        <Icon
          name="chevron"
          size={13}
          strokeWidth={2}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t.language.label}
          className="absolute right-0 z-50 mt-1.5 min-w-[148px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(16,20,16,0.14)] py-1"
        >
          {LOCALES.map((code) => {
            const selected = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#f3f2ee] ${
                  selected
                    ? "font-semibold text-[#17714a]"
                    : "font-medium text-[#40463f]"
                }`}
              >
                <span className="font-grotesk text-[10px] tracking-[0.12em] text-[#9aa09a] w-5">
                  {DICTIONARIES[code].shortLabel}
                </span>
                {DICTIONARIES[code].label}
                {selected ? (
                  <Icon
                    name="check"
                    size={13}
                    strokeWidth={2.4}
                    className="ml-auto text-[#177245]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
