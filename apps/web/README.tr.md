# NextHive Web

**Türkçe** · [English](README.md)

NextHive'ın herkese açık tanıtım, dokümantasyon ve masaüstü indirme sitesi. Bu uygulama bağımsız olarak dağıtılır ve hiçbir zaman Tauri kurulum dosyasına veya güncelleyici çıktılarına dahil edilmez.

## Geliştirme

Depo kökünden:

```bash
bun install --cwd apps/web
npm run web:dev
```

Ya da doğrudan bu paketin içinde çalışarak:

```bash
cd apps/web
bun install
bun run dev
bun run lint
bun run build
```

Tanıtım sitesi Next.js kullanır ve kendi Bun lock dosyasına sahiptir. Masaüstü sürümleri yalnızca `apps/desktop` üzerinden üretilir.

## Dil desteği

Site İngilizce ve Türkçe yayınlanır. Diller Next.js'in yerleşik alt yol yönlendirmesiyle ayrılır: İngilizce `/`, Türkçe `/tr` altında sunulur (örneğin `/download` ve `/tr/download`). Yapılandırma `next.config.mjs` içindeki `i18n` alanındadır.

- Metinler `src/i18n/en.js` ve `src/i18n/tr.js` dosyalarında durur. İki dosya birebir aynı yapıda olmalıdır.
- Sayfalar ve bileşenler metne `src/i18n/index.js` içindeki `useI18n()` kancasıyla erişir; aktif dil URL'den gelir, bu yüzden çeviri sunucu tarafında render edilir.
- `{version}` gibi yer tutucular `fmt(metin, { version })` ile doldurulur.
- Başlıktaki dil seçici `src/components/site/LanguageSwitcher.js` dosyasındadır. Seçenekler aynı sayfanın diğer dildeki adresine giden gerçek bağlantılardır ve seçim `NEXT_LOCALE` çerezine yazılır.
- Her sayfa `LocaleAlternates` bileşeniyle `canonical` ve `hreflang` bağlantılarını yayınlar.

Yeni bir dil eklemek için sözlük dosyasını oluşturun, `src/i18n/index.js` içindeki `DICTIONARIES` ve `LOCALES` değerlerine ekleyin ve `next.config.mjs` içindeki `i18n.locales` listesini genişletin.
