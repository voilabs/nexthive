/*
 * Türkçe site metinleri. Bu dosya `en.js` ile aynı yapıda kalmalı — dil
 * seçici çalışma anında birini diğeriyle değiştiriyor.
 */
export const tr = {
  code: "tr",
  label: "Türkçe",
  shortLabel: "TR",
  htmlLang: "tr",
  numberLocale: "tr-TR",

  nav: {
    home: "NextHive ana sayfa",
    main: "Ana gezinme",
    skip: "İçeriğe geç",
    github: "GitHub",
    download: "İndir",
    links: {
      product: "Ürün",
      how: "Nasıl çalışır",
      integrations: "Entegrasyonlar",
      security: "Güvenlik",
      faq: "SSS",
    },
  },

  language: {
    label: "Dil",
    menu: "Dil seçin",
  },

  cta: {
    downloadWindows: "Windows için indir",
  },

  footer: {
    headlineTop: "Çalışmanızın sürümlerini",
    headlineBottom: "kaybetmeyin.",
    star: "GitHub'da yıldız verin",
    blurb:
      "Sessiz, denetlenebilir ve tamamen sizin kontrolünüzdeki yedekler. VoiLabs tarafından geliştirildi.",
    productHeading: "Ürün",
    projectHeading: "Proje",
    download: "İndir",
    github: "GitHub",
    releases: "Sürümler",
    changelog: "Değişiklik günlüğü",
    copyright: "© 2026 VoiLabs. NextHive açık kaynaklı bir yazılımdır.",
  },

  home: {
    meta: {
      title: "NextHive — Kontrolü sizde olan sürümlü yedekler",
      description:
        "NextHive, klasörlerinizi izleyen, okunabilir ve tarihli Git geçmişi oluşturan ve bunu kontrolünüzdeki özel depolara gönderen yerel öncelikli bir Windows yedekleme uygulamasıdır.",
      ogTitle: "NextHive — Kontrolü sizde olan sürümlü yedekler",
      ogDescription:
        "Sahibi olduğunuz özel depolara sessiz ve denetlenebilir masaüstü yedekleri.",
    },
    hero: {
      badge: "Windows için erken erişim",
      titleTop: "Dosyalarınız değişir.",
      titleBottom: "NextHive hatırlar.",
      exploreSource: "Kaynak kodu inceleyin",
      copy: "Klasörlerinizi izleyen, yalnızca değişeni kaydeden ve kontrolünüzdeki özel Git depolarında okunabilir bir geçmiş oluşturan yerel öncelikli bir masaüstü uygulaması.",
      points: [
        "Git kurulumu gerekmez",
        "Kaynak klasörlere dokunulmaz",
        "Yeni depolar gizlidir",
      ],
    },
    mock: {
      tabs: [
        "Panel",
        "Yedek geçmişi",
        "Sorunlu dosyalar",
        "Zamanlama",
        "Hedefler",
      ],
      titleBar: "NextHive — 6 profil · 08 Ağu 2026, 09:04",
      runAll: "Tümünü çalıştır",
      columns: [
        "Klasör",
        "Profil",
        "Dosya",
        "Son çalışma",
        "Doğrulama",
        "Durum",
      ],
      status: {
        running: "Yedekleniyor…",
        queued: "Sırada",
        done: "Yedeklendi",
      },
      rows: [
        {
          folder: "Belgeler",
          profile: "Kişisel",
          files: "12.402",
          changes: "37 değişti",
          verify: "SHA-256 doğrulandı",
          state: "done",
        },
        {
          folder: "Projeler / müşteriler",
          profile: "İş",
          files: "8.114",
          changes: "112 değişti",
          verify: "SHA-256 doğrulandı",
          state: "done",
        },
        {
          folder: "Tasarım / marka",
          profile: "İş",
          files: "2.930",
          changes: "6 değişti",
          verify: "değişenler hash'leniyor",
          state: "running",
        },
        {
          folder: "Finans / 2026",
          profile: "Kişisel",
          files: "1.204",
          changes: "2 değişti",
          verify: "SHA-256 doğrulandı",
          state: "done",
        },
        {
          folder: "Fotoğraflar / aile",
          profile: "Kişisel",
          files: "24.551",
          changes: "418 değişti",
          verify: "sırasını bekliyor",
          state: "queued",
        },
        {
          folder: "Araştırma / notlar",
          profile: "Kişisel",
          files: "3.388",
          changes: "değişiklik yok",
          verify: "güncel",
          state: "done",
        },
      ],
    },
    facts: [
      ["0", "dosyalarınızın yanına eklenen .git klasörü"],
      ["SHA-256", "değişen her dosya için doğrulama"],
      ["Gizli", "varsayılan depo görünürlüğü"],
      ["Tek kilit", "profil başına çift çalışma yok"],
    ],
    problem: {
      kicker: "Sorun",
      title: "Elle yedekleme sessiz bir risktir.",
      items: [
        "Kopyala-yapıştır sürümler çoğalır, hiçbiri gerçek olmaz",
        "Tek seferlik arşivler neyin ne zaman değiştiğini gösteremez",
        "Bulut senkronizasyonu geçmişi saklamak yerine üzerine yazar",
        "Bir yedeğin başarısız olduğunu ancak ihtiyacınız olunca fark edersiniz",
      ],
      folderLabel: "Masaüstü › Yedekler (elle)",
      files: [
        ["rapor-son.docx", "12 Mar 2026"],
        ["rapor-son-v2.docx", "03 Nis 2026"],
        ["rapor-SON-gercek.docx", "03 Nis 2026"],
        ["rapor-son-v2 (kopya).docx", "tarih bilinmiyor"],
        ["yedek-2025.zip", "içerik bilinmiyor"],
      ],
      question: "Hangisi doğru olan?",
    },
    product: {
      kicker: "NextHive ile",
      title: "İşi uygulama yapar. Kanıt sizde kalır.",
      imageAlt:
        "Korunan klasörleri ve yedekleme profillerini gösteren NextHive masaüstü paneli",
      items: [
        "İster 02:00'de ister anlık çalıştırın — sonuç aynı tarihli, okunabilir geçmiş",
        "Her çalışma, herhangi bir makinede açabileceğiniz bir Git commit'ine dönüşür",
        "Uydurma yüzdeler değil, gerçek aşamalar ve somut değişiklikler",
        "Neyin değiştiği, neyin başarısız olduğu ve sıradakiler için tek bir panel",
      ],
    },
    how: {
      kicker: "Nasıl çalışır",
      title: "Bir kez kurun. Geçmişi hep saklasın.",
      copy: "Her profil küçük bir sözleşmedir: şu klasörler, şu hedef, şu zamanlama. NextHive sözleşmeye uyar ve yaptığı işi gösterir.",
      stepLabel: "Adım",
      steps: [
        {
          number: "01",
          title: "Herhangi bir klasörle başlayın",
          copy: "Belgeler, müşteri işleri ya da korumaya değer her şey için bir profil oluşturun. Kaynaklar okunur, asla değiştirilmez.",
        },
        {
          number: "02",
          title: "Kararı tarama versin",
          copy: "Hızlı meta veri karşılaştırması değişmeyenleri atlar; SHA-256 yalnızca gerçekten değişenleri yeniden hash'ler.",
        },
        {
          number: "03",
          title: "Gönderin, sonra doğrulayın",
          copy: "Değişiklikler tarihli, okunabilir bir Git commit'i olur. Bir çalışma, ancak özel uzak depo kabul ettikten sonra başarılı sayılır.",
        },
      ],
      folders: [
        ["Belgeler", true],
        ["Projeler / müşteriler", true],
        ["Tasarım / marka", true],
        ["node_modules", false],
      ],
      scanLog: [
        "meta veri karşılaştırma · 12.402 dosya · 0,8sn",
        "değişmeyen atlandı · 12.365 dosya",
        "değişen yeniden hash'lendi · 37 dosya",
        "SHA-256 doğrulandı · 37 / 37",
        "hiçbir kaynak dosyaya yazılmadı",
      ],
      push: {
        commit: "commit 2026-08-08",
        commitNote: "37 dosya",
        pushLine: "push → nexthive-belgeler",
        pushNote: "gizli",
        confirmed: "Uzak depo onayladı",
      },
    },
    schedule: {
      tabs: [
        "Belgeler",
        "Müşteri işleri",
        "Tasarım",
        "Finans",
        "Fotoğraflar",
        "Araştırma",
      ],
      feed: [
        { time: "02:00", text: "Zamanlanmış çalışma kaçtı — makine uykudaydı" },
        {
          time: "09:04",
          text: "Uyanışta otomatik telafi edildi",
          chip: "37 dosya",
        },
        {
          time: "09:04",
          text: "Commit yazıldı: 2026-08-08",
          chip: "okunabilir geçmiş",
        },
        { time: "09:05", text: "Özel uzak depoya gönderildi", chip: "onaylandı" },
      ],
      kicker: "Zamanlama",
      title: "Hiç hatırlamadığınız rutini otomatikleştirin.",
      copy: "Zamanlamalar uyku ve kapanmalardan etkilenmez: kaçan 02:00 çalışması, makineniz bir sonraki uyanışında sessizce telafi edilir.",
      features: [
        [
          "clock",
          "Telafili zamanlama",
          "02:00 kaçtı · 09:04'te soru sormadan telafi edildi.",
        ],
        [
          "tray",
          "Sessiz tepsi kullanımı",
          "Uygulamayı açmadan yedeği duraklatın veya çalıştırın.",
        ],
        [
          "file",
          "Görünür sorunlu dosyalar",
          "Yeniden deneyin veya ilgili dosyayı hariç tutma profiline ekleyin.",
        ],
      ],
    },
    integrations: {
      kicker: "Hedefiniz",
      title: "Sizin hesabınız. Sizin deponuz. Sizin geçmişiniz.",
      copyBefore:
        "Kişisel ve iş kimliklerinizi bağlayın, var olan özel bir depoyu seçin ya da NextHive sizin için ",
      copyAfter: " deposunu oluştursun.",
      availableHeading: "Bugün kullanılabilir",
      available: [
        ["GitHub", "Gizli depolar · LFS dahili"],
        ["GitLab", "GitLab.com veya kendi sunucunuz"],
        ["Gitea / Forgejo", "Kendi altyapınız"],
        ["Codeberg", "Topluluk tarafından işletilen barındırma"],
      ],
      plannedHeading: "Yolda",
      planned: ["Google Drive", "Yandex Disk", "MEGA", "SFTP / FTPS"],
      plannedChip: "Planlanan",
      plannedNote: "Dürüstçe planlanan olarak gösteriliyor — söz verilen tarih değil.",
      everyHeading: "Her hedefte",
      every: [
        ["lock", "Token, işletim sisteminin kimlik kasasında"],
        ["shield", "Varsayılan olarak gizli görünürlük"],
        ["key", "Gönderme izni baştan doğrulanır"],
        ["file", "Büyük dosyalar için LFS desteği"],
      ],
    },
    trust: {
      kicker: "Doğruluk",
      title: "Doğrulanmadıysa yedek sayılmaz.",
      copy: "NextHive ölçemediği bir ilerlemeyi uydurmak yerine gerçek aşamaları ve somut değişiklikleri bildirir — ve bir çalışma yalnızca uzak depo gönderimi kabul ettiğinde başarılı olur.",
      items: [
        "Hızlı meta veri karşılaştırması değişmeyen dosyaların yeniden hash'lenmesini önler",
        "SHA-256, gerçekten değişen her dosyayı doğrular",
        "Tarihli yapı, NextHive olmadan da her makinede okunabilir",
      ],
      diff: [
        ["A", "tasarim/lansman-notlari.md", "+ 18 KB"],
        ["M", "src/features/sync.ts", "SHA doğrulandı"],
        ["D", "arsiv/eski-taslak.pdf", "silindi"],
      ],
      confirmed: "Gönderim uzak depo tarafından onaylandı — çalışma başarılı kaydedildi",
    },
    faq: {
      title: "SSS",
      copyBefore:
        "Hâlâ sorunuz mu var? Kaynak kodu okuyun ya da şurada bir konu açın: ",
      copyLink: "GitHub",
      copyAfter: ".",
      items: [
        {
          q: "NextHive nedir?",
          a: "Seçtiğiniz klasörleri izleyen, yalnızca değişeni kaydeden ve kontrolünüzdeki özel Git depolarında okunabilir, tarihli bir geçmiş oluşturan yerel öncelikli bir Windows masaüstü uygulaması.",
        },
        {
          q: "Orijinal klasörlerime dokunuyor mu?",
          a: "Hayır. Kaynak klasörler okunur, asla yazılmaz. Değişen içerikler yönetilen bir çalışma alanına kopyalanır; dosyalarınızın yanında hiçbir zaman .git klasörü oluşmaz.",
        },
        {
          q: "Git kurulu olmalı mı?",
          a: "Hayır. NextHive libgit2'yi içinde barındırır ve tüm Git işlemlerini kendisi yapar — kabuk komutu yok, ayrı kurulum yok.",
        },
        {
          q: "Yedeklerim nerede duruyor?",
          a: "Sahibi olduğunuz hesaplardaki depolarda — GitHub, GitLab, Gitea, Forgejo veya Codeberg. NextHive bunları varsayılan olarak gizli oluşturur ya da var olan özel bir depoyu seçersiniz.",
        },
        {
          q: "Verilerim şifreleniyor mu?",
          a: "Aktarım HTTPS üzerinden yapılır ve token'lar Windows kimlik kasasında durur. Özel bir Git deposu, erişim denetimli bir depolamadır; uçtan uca şifreli bir depolama değildir — NextHive bu sınırı bulanıklaştırmak yerine açıkça söyler.",
        },
        {
          q: "Maliyeti nedir?",
          a: "NextHive açık kaynaklı ve ücretsizdir. Sunucu, hesap ve abonelik yoktur — işin içindeki tek depolama, kendi Git sağlayıcınızın depolamasıdır.",
        },
      ],
    },
    security: {
      kicker: "Sınırla gelen güvenlik",
      title: "Sırlar Rust'ta kalır. Dosyalar web katmanına girmez.",
      copy: "Arayüz, geniş dosya sistemi erişimi kazanmadan ve sağlayıcı token'ınızı hiç görmeden iş talep edebilir.",
      note: "Özel bir Git deposu, erişim denetimli depolamadır; uçtan uca şifreli depolama değildir. NextHive bu sınırı açıkça belirtir.",
      badges: [
        "Token'lar işletim sistemi kimlik kasasında",
        "Yalnızca tipli Rust komutları",
        "Varsayılan olarak gizli depolar",
        "libgit2 — kabuktan çağrılan Git yok",
      ],
    },
    counter: {
      kicker: "Bugüne dek NextHive sunucularında saklanan dosya baytı",
      copy: "Yedekler makinenizden doğrudan sahibi olduğunuz depolara gider. nexthive.app'in sayabileceği tek şey, isteğe bağlı ve anonim bir günlük ping'dir — bir sürüm numarası ile bir işletim sistemi adı, üstelik kapatma düğmesiyle.",
    },
  },

  download: {
    meta: {
      title: "NextHive'ı indirin — Windows",
      description:
        "NextHive {version} sürümünü Windows için indirin: kontrolünüzdeki özel depolarda okunabilir, tarihli Git geçmişi oluşturan yerel öncelikli bir yedekleme uygulaması.",
      ogTitle: "NextHive'ı indirin — Windows",
      ogDescription:
        "Erken erişim Windows sürümünü edinin. Açık kaynak, hesap yok, takip yok.",
    },
    hero: {
      kicker: "İndir",
      title: "NextHive'ı Windows için edinin.",
      copy: "Sürüm {version}, erken erişim. Tek kurulum dosyası, hesap yok, takip yok — ilk yedeğiniz birkaç dakika içinde çalışabilir.",
      button: "NextHive {version} indir",
      allReleases: "Tüm sürümler",
      note: "GitHub Releases üzerinden sunulur — uygulamanın güncellemeleri kontrol ettiği yerin aynısı.",
    },
    card: {
      installerLabel: "Windows kurulum dosyası",
      version: "Sürüm",
      versionValue: "{version} · erken erişim",
      platform: "Platform",
      platformValue: "Windows 10 / 11, 64-bit",
      license: "Lisans",
      licenseValue: "Açık kaynak",
      source: "Kaynak",
      activeToday: "Bugün aktif cihaz",
      direct: "Doğrudan indir",
    },
    steps: {
      kicker: "İndirmeden ilk yedeğe",
      title: "Üç adım, sürpriz yok.",
      copy: "Kurulum yalnızca uygulamayı kurar, başka bir şey değil — istemediğiniz servisler ve uygulama dışında çalışan arka plan güncelleyicileri yok.",
      label: "Adım",
      items: [
        {
          number: "01",
          title: "Kurulumu çalıştırın",
          copy: "İndirme bitince {installer} dosyasına çift tıklayın. Önceden kurulması gereken Git, çalışma zamanı veya ek araç yok.",
        },
        {
          number: "02",
          title: "SmartScreen'i bir kez geçin",
          copy: "Erken erişim sürümleri henüz imzalı olmadığından Windows bir SmartScreen uyarısı gösterebilir. “Ek bilgi → Yine de çalıştır” seçin — ya da isterseniz kaynaktan derleyin.",
        },
        {
          number: "03",
          title: "İlk profilinizi oluşturun",
          copy: "Korumaya değer klasörleri seçin, bir Git hesabı bağlayın ve ilk yedeği çalıştırın. Ancak uzak depo onayladığında başarılı sayılır.",
        },
      ],
    },
    needsHeading: "Gerekenler",
    needs: [
      "64-bit Windows 10 veya 11",
      "Hedefler için GitHub, GitLab, Gitea, Forgejo veya Codeberg hesabı",
      "Yedekler gönderilirken internet bağlantısı",
    ],
    notNeedsHeading: "Gerekmeyenler",
    notNeeds: [
      "Git kurulumu gerekmez — libgit2 dahili",
      "NextHive hesabı gerekmez — kaydolunacak bir şey yok",
      "Abonelik gerekmez — açık kaynak, ücretsiz",
    ],
    telemetry: {
      kicker: "Sayılır, takip edilmez",
      title: "Günde bir anonim ping. Hikâyenin tamamı bu.",
      copyBefore: "NextHive çalışırken günde bir kez ",
      copyEm: "bir",
      copyAfter:
        " cihazın açık olduğunu bildirir — bir uygulama sürümü ve bir işletim sistemi adı, başka hiçbir şey. Kimlik yok, donanım bilgisi yok, dosya adı yok. Sunucu yalnızca günlük toplamları tutar ve bu sayfada gördüğünüz sayı bizim gördüğümüzün aynısıdır.",
      points: [
        "İstediğiniz an kapatın: Ayarlar → Gizlilik → Anonim kullanım ping'i",
        "İki taraf da açık kaynak — ping de sayaç da depoda",
      ],
      endpoint: "POST nexthive.app/api/ping",
      rows: [
        ["Gönderilen kimlikler", "yok"],
        ["Saklanan IP adresi", "hayır"],
        ["Sunucuda saklanan", "bugünün toplamına +1"],
      ],
      countedToday: "Bugün sayılan cihaz",
    },
    platforms: {
      kicker: "Diğer platformlar",
      title: "Önce Windows. Gerisi, dürüstçe daha sonra.",
      copy: "macOS ve Linux sürümleri henüz yok. Depoyu veya sürümler sayfasını takip edin — çıktıklarında ilk orada görünecekler.",
      notAvailable: "Henüz mevcut değil",
      follow: "GitHub'da sürümleri takip edin",
    },
  },
};
