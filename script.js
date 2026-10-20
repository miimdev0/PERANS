/* =====================================================================
   PRINCE BIRJAND — Photo Gallery
   script.js
   =====================================================================

   ┌───────────────────────────────────────────────────────────────────┐
   │  بخش ۱ — تنظیمات و محتوا                                          │
   │  فقط همین بخش را ویرایش کنید. به بخش ۲ (موتور سایت) دست نزنید.     │
   │                                                                   │
   │  قوانین ساده:                                                      │
   │   • متن‌ها داخل گیومه‌ی انگلیسی "..." نوشته می‌شوند.               │
   │   • بعد از هر مورد یک ویرگول انگلیسی ( , ) لازم است.              │
   │   • مسیرها نسبت به محل index.html هستند.                          │
   └───────────────────────────────────────────────────────────────────┘ */

/* --- مسیر پوشه‌ی عکس‌ها (با اسلش انتهایی) --- */
const PHOTOS_DIR = "img/";

/* --- نام فایل لوگوی شخصی شما داخل همان پوشه (در صورت نبودن، متن MIIM نمایش داده می‌شود) --- */
const LOGO_FILE = "logo.png";

/* --- نام فایل لوگوی باشگاه (در صورت نبودن، متن PERANS.FC نمایش داده می‌شود) --- */
const CLUB_LOGO_FILE = "logo_c.png";

/* --- تعداد و پسوند عکس‌ها: اگر تعداد عوض شد فقط همین عدد را تغییر دهید --- */
const PHOTO_COUNT = 56;
const PHOTO_EXT   = "jpg";

/* --- پیشوند نام فایل دانلودی؛ خروجی: PERANS-FUTSAL-CLUB-05.jpg --- */
const DOWNLOAD_PREFIX = "PERANS-FUTSAL-CLUB-";

/* --- عکس برگزیده‌ی هیرو — عکس مالک باشگاه (شماره‌ی عکس از ۱ تا PHOTO_COUNT) --- */
const HERO_PHOTO = 22;

/* --- روبیکا --- */
const RUBIKA = {
  id:   "MIIM_DEV",
  link: "https://rubika.ir/MIIM_DEV",
};

/* --- آمار هیرو (عدد + برچسب) --- */
const STATS = [
  { n: PHOTO_COUNT, label: "عکس" },
  { n: 3,           label: "روز مسابقه" },
  { n: 20,          label: "عضو تیم" },
];

/* --- دسته‌بندی اختیاری برای عکس‌های دلخواه (بدون زیرنویس روی عکس‌ها) ---
   فقط «دسته‌بندی» را بنویسید؛ دکمه‌های فیلتر بالای گالری خودکار ساخته می‌شوند.
   مثال: شماره‌ی عکس: { category: "گل‌ها" }   */
const PHOTO_META = {
  1:  { category: "تیمی" },
  6:  { category: "هجوم" },
  12: { category: "گل‌ها" },
  19: { category: "دفاع" },
  27: { category: "تیمی" },
  34: { category: "کنار زمین" },
  45: { category: "کنار زمین" },
};

/* --- فاصله‌ی بین دانلودهای «دانلود همه» (میلی‌ثانیه) --- */
const DOWNLOAD_ALL_DELAY = 450;

/* --- تعداد عکس‌هایی که با هر بار «نمایش بیشتر» در گرید اضافه می‌شود --- */
const THUMB_STEP = 12;

/* =====================================================================
   بخش ۲ — موتور سایت  (به این بخش دست نزنید)
   ===================================================================== */
(() => {
  "use strict";

  /* ---------- ابزارها ---------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (v) => String(v).replace(/\d/g, (d) => FA_DIGITS[+d]);
  const pad2 = (v) => String(v).padStart(2, "0");
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const DIR = getComputedStyle(document.documentElement).direction === "rtl" ? -1 : 1;

  /* ---------- ساخت مدل عکس‌ها (حلقه‌ی ۱ تا PHOTO_COUNT) ---------- */
  const photos = [];
  for (let i = 1; i <= PHOTO_COUNT; i++) {
    const meta = PHOTO_META[i] || {};
    photos.push({
      id: i,
      src: PHOTOS_DIR + i + "." + (meta.ext || PHOTO_EXT),
      fileName: DOWNLOAD_PREFIX + pad2(i) + "." + (meta.ext || PHOTO_EXT),
      alt: `عکس ${fa(i)} — پرنس بیرجند (PERANS FUTSAL CLUB) در مسابقات کشوری قم`,
      category: meta.category || "",
      errored: false,
    });
  }

  /* دانلود یک فایل با نام زیبا — بدون fetch، بدون کانواس؛ فقط لینک مستقیم */
  function downloadFile(photo) {
    const a = document.createElement("a");
    a.href = photo.src;
    a.download = photo.fileName;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------- toast شیشه‌ای ---------- */
  const toastEl = $("#toast");
  const toastText = $("#toast-text");
  let toastTimer = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastText.textContent = msg;
    toastEl.classList.remove("is-visible");
    void toastEl.offsetWidth; /* ریست انیمیشن */
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
  }

  /* ---------- کپی متن (با جایگزین برای file:// و مرورگرهای قدیمی) ---------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;inset-inline-start:-999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch { return false; }
  }

  /* ---------- اتصال لینک‌های روبیکا ---------- */
  function bindLinks() {
    ["hero-rubika", "about-rubika", "cta-btn", "sheet-rubika", "contact-link"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = RUBIKA.link;
    });
    const idText = "@" + RUBIKA.id;
    const short = RUBIKA.link.replace(/^https?:\/\//, "");
    ["cta-id", "contact-id"].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = idText; });
    const clt = $("#contact-link-text"); if (clt) clt.textContent = short;
  }

  /* ---------- لوگوها (person: logo.png ← MIIM ؛ باشگاه: logo_c.png ← PERANS.FC) ---------- */
  function initLogos() {
    const mounts = [
      ...$$("[data-logo]").map((el) => ({ el, file: LOGO_FILE, alt: "لوگوی مجتبی میدانی (آقای میم)", fb: "MIIM", title: "مجتبی میدانی (آقای میم)" })),
      ...$$("[data-club-logo]").map((el) => ({ el, file: CLUB_LOGO_FILE, alt: "لوگوی باشگاه پرنس بیرجند (PERANS FUTSAL CLUB)", fb: "PF", title: "PERANS FUTSAL CLUB" })),
    ];
    const waits = mounts.map(({ el, file, alt, fb, title }) => new Promise((resolve) => {
      const img = new Image();
      img.draggable = false;
      img.alt = alt;
      img.onload = () => { el.appendChild(img); resolve(); };
      img.onerror = () => {
        el.innerHTML = `<span class="logo-fallback" aria-hidden="true" title="${title}">${fb}</span>`;
        resolve();
      };
      img.src = PHOTOS_DIR + file;
    }));
    /* لودینگ حداکثر ۳ ثانیه برای لوگو صبر می‌کند */
    return Promise.race([
      Promise.all(waits),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  }

  /* ---------- آمار هیرو ---------- */
  function renderStats() {
    const wrap = $("#hero-stats");
    if (!wrap) return;
    wrap.innerHTML = STATS.map((s, i) => `
      <div class="stat" data-reveal style="--d:${0.55 + i * 0.12}s">
        <span class="stat__value" data-count="${+s.n || 0}">${fa(0)}</span>
        <span class="stat__label">${s.label}</span>
      </div>`).join("");
  }

  /* ---------- شمارنده‌ی اعداد فارسی ---------- */
  function countUp(el) {
    const target = +el.dataset.count || 0;
    if (REDUCED) { el.textContent = fa(target); return; }
    const dur = 1400, t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fa(Math.round(target * e));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- ظهور هنگام اسکرول (blur → sharp) ---------- */
  function initReveal() {
    const items = $$("[data-reveal]");
    const fire = (el) => {
      el.classList.add("is-in");
      $$("[data-count]", el).forEach(countUp);
      if (el.matches("[data-count]")) countUp(el);
    };
    if (!("IntersectionObserver" in window) || REDUCED) {
      items.forEach(fire);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        fire(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });

    /* بعد از پایان لودینگ شروع کن تا انیمیشن‌ها پشت پرده هدر نروند */
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      items.forEach((el) => io.observe(el));
    };
    document.addEventListener("loader:done", start, { once: true });
    setTimeout(start, 6500); /* پشتیبان مطلق */
  }

  /* ---------- ناوبری: pill لغزان + scroll-spy + منوی موبایل ---------- */
  function initNav() {
    const menu = $(".nav__menu");
    const pill = $(".nav__pill");
    const links = $$(".nav__link");
    const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);

    const movePill = (link) => {
      if (!link || !menu || !pill) return;
      const mr = menu.getBoundingClientRect();
      const lr = link.getBoundingClientRect();
      const isRTL = DIR === -1;
      const offset = isRTL ? mr.right - lr.right : lr.left - mr.left;
      pill.style.width = lr.width + "px";
      pill.style.transform = `translateX(${isRTL ? -offset : offset}px)`;
      pill.style.opacity = "1";
    };

    const setActive = (id) => {
      links.forEach((l) => l.classList.toggle("is-active", l.dataset.nav === id));
      movePill(links.find((l) => l.dataset.nav === id));
    };

    let current = null;
    const topOf = (s) => (s.id === "home" ? 0 : s.offsetTop);
    const spy = () => {
      const y = window.scrollY + window.innerHeight * 0.38;
      let id = sections[0].id;
      for (const s of sections) if (y >= topOf(s)) id = s.id;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) id = sections[sections.length - 1].id;
      if (id !== current) { current = id; setActive(id); }
    };
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);

    const scrollToSection = (target) => {
      if (!target) return;
      window.scrollTo({ top: topOf(target), behavior: REDUCED ? "auto" : "smooth" });
    };

    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        closeSheet();
        scrollToSection(target);
        history.replaceState(null, "", id);
        if (target.id === "gallery" && window.PB_GOTO_HERO_PHOTO) {
          window.PB_GOTO_HERO_PHOTO();
        }
      });
    });

    window.addEventListener("resize", () => movePill(links.find((l) => l.classList.contains("is-active"))));
    document.fonts?.ready?.then(() => movePill(links.find((l) => l.classList.contains("is-active"))));
    requestAnimationFrame(spy);
    setTimeout(spy, 600);

    /* منوی موبایل */
    const burger = $("#burger");
    const sheet = $("#sheet");
    let sheetOpen = false;
    function openSheet() {
      sheetOpen = true;
      burger.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "بستن منو");
      sheet.classList.add("is-open");
      sheet.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
    }
    function closeSheet() {
      if (!sheetOpen) return;
      sheetOpen = false;
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "باز کردن منو");
      sheet.classList.remove("is-open");
      sheet.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
    }
    burger.addEventListener("click", () => (sheetOpen ? closeSheet() : openSheet()));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

    /* دکمه‌ی بازگشت به بالا */
    const toTop = $("#totop");
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));
    const onScrollTop = () => toTop.classList.toggle("is-visible", window.scrollY > 600);
    window.addEventListener("scroll", onScrollTop, { passive: true });
    onScrollTop();
  }

  /* ---------- هیرو: عکس برگزیده + پارالاکس ---------- */
  function initHero() {
    const inner = $("#hero-inner");
    const media = $("#hero-media");
    const photoWrap = $("#hero-photo-link");
    const img = $("#hero-photo");
    let heroPhotoId = clamp(HERO_PHOTO, 1, PHOTO_COUNT);

    /* اگر عکس برگزیده پیدا نشد، چند عکس بعدی را امتحان کن؛ آخرِ کار کارت مخفی می‌شود */
    let tries = 0;
    const loadHero = () => {
      const p = photos.find((x) => x.id === heroPhotoId);
      if (!p) { photoWrap.classList.add("is-missing"); return; }
      img.onerror = () => {
        tries += 1;
        const next = photos.find((x) => x.id > heroPhotoId && !x.errored);
        if (tries < 6 && next) { heroPhotoId = next.id; img.src = next.src; }
        else photoWrap.classList.add("is-missing");
      };
      img.onload = () => photoWrap.classList.add("is-loaded");
      img.src = p.src;
      img.alt = "مالک باشگاه پرنس بیرجند — PERANS FUTSAL CLUB در مسابقات کشوری قم";
    };
    loadHero();

    /* کلیک روی عکس برگزیده → پرش به همان عکس در گالری */
    window.PB_GOTO_HERO_PHOTO = null; /* بعداً در گالری مقداردهی می‌شود */

    /* محو شدن نرم هیرو هنگام اسکرول */
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = inner.offsetHeight || 1;
        const p = clamp(window.scrollY / (h * 0.9), 0, 1);
        inner.style.opacity = String(1 - p * 1.1);
        if (!REDUCED) inner.style.transform = `translateY(${p * -36}px) scale(${1 - p * 0.04})`;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    /* پارالاکس ملایم با موس (فقط دسکتاپ) */
    if (!FINE_POINTER || REDUCED || !media) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const loop = () => {
      cx = lerp(cx, tx, 0.07);
      cy = lerp(cy, ty, 0.07);
      media.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05) raf = requestAnimationFrame(loop);
      else raf = null;
    };
    const hero = $("#home");
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 16;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 10;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  }

  /* ---------- گالری (کاروسل + فیلتر + گرید + لایت‌باکس) ---------- */
  function initGallery() {
    const stage   = $("#stage");
    const countEl = $("#carousel-count");
    const rail    = $("#rail");
    const thumbEl = $("#rail-thumb");
    const hint    = $("#carousel-hint");
    const filtersEl = $("#filters");
    const grid    = $("#thumbs-grid");
    const moreBox = $(".thumbs__more");
    const moreBtn = $("#thumbs-more");

    /* ---- ساخت کارت‌های کاروسل ---- */
    const DEFAULT_ASPECT = 4 / 3;
    const cards = new Map();

    photos.forEach((p, idx) => {
      const el = document.createElement("article");
      el.className = "ph";
      el.dataset.pid = p.id;
      el.setAttribute("aria-label", `عکس ${fa(p.id)} از ${fa(PHOTO_COUNT)} — پرنس بیرجند در قم`);
      el.innerHTML = `
        <span class="ph__skeleton" aria-hidden="true"></span>
        <img class="ph__img" draggable="false" decoding="async" ${idx > 3 ? 'loading="lazy"' : ""} alt="${p.alt}">
        <a class="ph__dl" href="${p.src}" download="${p.fileName}" target="_blank" rel="noopener"
           data-no-drag aria-label="دانلود عکس ${fa(p.id)} با کیفیت اصلی (${p.fileName})">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v10m0 0-4-4m4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 17v1.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
        </a>`;
      const img = el.querySelector(".ph__img");
      const card = { el, img, aspect: DEFAULT_ASPECT, loaded: false };

      /* بازخورد toast هنگام دانلود تکی */
      el.querySelector(".ph__dl").addEventListener("click", (e) => {
        e.stopPropagation();
        toast("دانلود شروع شد ✓");
      });

      const onLoad = () => {
        if (img.naturalWidth && img.naturalHeight) card.aspect = img.naturalWidth / img.naturalHeight;
        card.loaded = true;
        el.classList.add("is-loaded");
        measure();
        apply(pos);
      };
      if (img.complete && img.naturalWidth) onLoad();
      else img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", () => {
        /* عکس پیدا نشد → کارت پنهان و از چرخه حذف می‌شود تا سایت نشکند */
        handlePhotoError(p);
      }, { once: true });
      img.src = p.src;

      stage.appendChild(el);
      cards.set(p.id, card);
    });

    /* ---- وضعیت چرخه ---- */
    let filter = "همه";
    let list = [];
    let m = 0;
    let slot = 0;
    let pos = 0;
    const VISIBLE = 2;
    let stageW = 0, stageH = 0, gap = 26;
    let widths = [];

    const VISIBLE_LIST = () => photos.filter((p) => !p.errored && (filter === "همه" || p.category === filter));

    const scaleAt = (k) => Math.max(0.5, 1 - 0.13 * k);

    function measure() {
      stageW = stage.clientWidth;
      stageH = stage.clientHeight;
      gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-gap")) || 26;
      const maxW = Math.min(stageW * (stageW < 640 ? 0.86 : 0.62), stageH * 2.2);
      const minW = Math.min(stageH * 0.45, maxW);
      widths = list.map((p) => {
        const c = cards.get(p.id);
        const w = clamp(stageH * (c ? c.aspect : DEFAULT_ASPECT), minW, maxW);
        if (c) { c.el.style.setProperty("--w", w + "px"); }
        return w;
      });
    }

    /* چیدمان سه‌بعدی برای یک اسلات فعالِ صحیح */
    function layoutFor(a) {
      const out = new Array(m);
      for (let i = 0; i < m; i++) {
        const d = i - a;
        const k = Math.abs(d);
        if (k > VISIBLE) { out[i] = { x: Math.sign(d) * DIR * stageW, s: 0.4, r: 0, o: 0, b: 5, z: 0, hidden: true }; continue; }
        let x = 0;
        if (k > 0) {
          x = widths[a] / 2 + gap;
          for (let j = 1; j < k; j++) {
            const idx = a + Math.sign(d) * j;
            x += widths[idx] * scaleAt(j) + gap;
          }
          x += widths[i] * scaleAt(k) / 2;
          x *= 0.92 - k * 0.04;
        }
        out[i] = {
          x: Math.sign(d) * DIR * x,
          s: scaleAt(k),
          r: Math.sign(d) * DIR * (Math.min(k, 1) * 15 + Math.max(0, k - 1) * 4),
          o: k === 0 ? 1 : Math.max(0.2, 0.74 - (k - 1) * 0.24),
          b: k === 0 ? 0 : 0.7 + (k - 1) * 1.1,
          z: 20 - k,
          hidden: false,
        };
      }
      return out;
    }

    function apply(p) {
      if (!stageW) measure();
      if (!m) return;
      const a = clamp(Math.floor(p), 0, m - 1);
      const t = clamp(p - a, 0, 1);
      const L1 = layoutFor(a);
      const L2 = t > 0 && a + 1 < m ? layoutFor(a + 1) : L1;
      for (let i = 0; i < m; i++) {
        const s1 = L1[i], s2 = L2[i];
        const card = cards.get(list[i].id);
        if (!card) continue;
        /* کارت‌های خارج از دید هیچ نوشته‌ای روی DOM دریافت نمی‌کنند (عملکرد ۶۰fps) */
        if (s1.hidden && s2.hidden) {
          if (!card.el.classList.contains("is-hidden")) card.el.classList.add("is-hidden");
          continue;
        }
        const x = lerp(s1.x, s2.x, t), s = lerp(s1.s, s2.s, t), r = lerp(s1.r, s2.r, t);
        const o = lerp(s1.o, s2.o, t), b = lerp(s1.b, s2.b, t);
        card.el.style.transform = `translate3d(${x}px, 0, 0) scale(${s}) rotateY(${r}deg)`;
        card.el.style.opacity = o.toFixed(3);
        card.el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
        card.el.style.zIndex = Math.round(lerp(s1.z, s2.z, t));
        card.el.classList.remove("is-hidden");
        card.el.classList.toggle("is-active", i === slot);
        card.el.setAttribute("aria-hidden", i === slot ? "false" : "true");
      }
    }

    function updateMeta(animated = true) {
      if (!m) return;
      countEl.textContent = `${fa(slot + 1)} از ${fa(m)}`;

      /* ریل پیشرفت */
      const railW = rail.clientWidth;
      const tw = Math.max(railW / m, 34);
      const off = m > 1 ? (railW - tw) * (slot / (m - 1)) : 0;
      thumbEl.style.width = tw + "px";
      thumbEl.style.transform = `translateX(${DIR * off}px)`;
    }

    function markCurrentThumb() {
      $$(".thumb", grid).forEach((b) => b.classList.toggle("is-current", +b.dataset.pid === (list[slot] && list[slot].id)));
    }

    function preloadAround(center) {
      for (let k = -2; k <= 2; k++) {
        const q = list[center + k];
        if (q && !q.errored) { const im = new Image(); im.src = q.src; }
      }
    }

    function goTo(target, { animated = true } = {}) {
      if (!m) return;
      const next = clamp(target, 0, m - 1);
      const changed = next !== slot;
      slot = next;
      pos = next;
      apply(pos);
      updateMeta(animated);
      markCurrentThumb();
      preloadAround(slot);
      if (changed) hint.classList.add("is-faded");
    }

    function goToPhoto(id) {
      const i = list.findIndex((p) => p.id === id);
      if (i >= 0) goTo(i);
      else { /* عکس در فیلتر فعلی نیست → فیلتر برداشته می‌شود */
        setFilter("همه", () => goToPhoto(id));
      }
    }
    window.PB_GOTO_HERO_PHOTO = () => {
      const heroImg = $("#hero-photo");
      const id = heroImg && heroImg.src ? +(heroImg.src.match(/(\d+)\.\w+$/) || [])[1] : 0;
      if (id) setTimeout(() => goToPhoto(id), 700);
    };

    /* ---- کشیدن / سوایپ ---- */
    let dragging = false, startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, moved = false, pid = null, startCard = null, fromControl = false;
    const unit = () => Math.max(160, (widths[slot] || 240) * 0.75);

    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      /* دکمه‌های داخل کارت (دانلود) درگ را شروع نمی‌کنند */
      fromControl = !!(e.target.closest && e.target.closest("[data-no-drag]"));
      if (fromControl) return;
      dragging = true; moved = false; pid = e.pointerId;
      startCard = e.target.closest?.(".ph") || null;
      startX = lastX = e.clientX; startPos = pos; lastT = performance.now(); vel = 0;
      stage.classList.add("is-dragging");
      stage.setPointerCapture?.(pid);
    });
    stage.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      const now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
      let p = startPos - (dx / unit()) * DIR;
      if (p < 0) p = p * 0.35;
      if (p > m - 1) p = (m - 1) + (p - (m - 1)) * 0.35;
      pos = p;
      apply(pos);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      stage.releasePointerCapture?.(pid);
      const fling = -vel * DIR * 14;
      let target = Math.round(pos + clamp(fling, -1, 1));
      if (!moved && e && e.type === "pointerup" && startCard) {
        const id = +startCard.dataset.pid;
        const idx = list.findIndex((p) => p.id === id);
        if (idx === slot) openLightbox(slot);
        else if (idx >= 0) target = idx;
      }
      startCard = null;
      goTo(target);
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("lostpointercapture", () => { if (dragging) endDrag(); });

    /* اسکرول افقی تاچ‌پد */
    let wheelLock = false;
    stage.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
      e.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      goTo(slot + (e.deltaX > 0 ? -DIR : DIR));
      setTimeout(() => (wheelLock = false), 480);
    }, { passive: false });

    /* کیبورد */
    stage.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(slot + (DIR === -1 ? 1 : -1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(slot + (DIR === -1 ? -1 : 1)); }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(slot); }
      if (e.key === "Home") { e.preventDefault(); goTo(0); }
      if (e.key === "End")  { e.preventDefault(); goTo(m - 1); }
    });

    let rT;
    const reMeasure = () => { clearTimeout(rT); rT = setTimeout(() => { measure(); apply(pos); updateMeta(false); }, 80); };
    window.addEventListener("resize", reMeasure);
    if ("ResizeObserver" in window) new ResizeObserver(() => { measure(); apply(pos); }).observe(stage);

    /* ---- فیلترها ---- */
    const categories = [];
    photos.forEach((p) => { if (p.category && !categories.includes(p.category)) categories.push(p.category); });

    function renderFilters() {
      if (!filtersEl) return;
      const all = ["همه", ...categories];
      filtersEl.innerHTML = all.map((c) => {
        const count = c === "همه" ? photos.filter((p) => !p.errored).length : photos.filter((p) => !p.errored && p.category === c).length;
        return `<button type="button" class="filters__chip${c === filter ? " is-active" : ""}" data-filter="${c}" aria-pressed="${c === filter}">${c} · ${fa(count)}</button>`;
      }).join("");
      $$(".filters__chip", filtersEl).forEach((b) =>
        b.addEventListener("click", () => { if (b.dataset.filter !== filter) setFilter(b.dataset.filter); })
      );
    }

    /* عکسی که لود نشد: از کاروسل و گرید حذف می‌شود و شمارش‌ها به‌روز می‌مانند */
    function handlePhotoError(p) {
      p.errored = true;
      const c = cards.get(p.id);
      if (c) c.el.classList.add("is-hidden");
      refreshList();
      renderFilters();
    }

    function setFilter(next, after) {
      filter = next;
      if (REDUCED) { refreshList(); after && after(); renderFilters(); return; }
      stage.classList.add("is-filtering");
      grid.style.opacity = "0";
      grid.style.transform = "translateY(10px)";
      setTimeout(() => {
        refreshList();
        renderFilters();
        stage.classList.remove("is-filtering");
        grid.style.opacity = "";
        grid.style.transform = "";
        grid.style.transition = "opacity .5s var(--ease), transform .6s var(--ease)";
        after && after();
      }, 380);
    }

    function refreshList() {
      const prevPhoto = list[slot] || null;
      list = VISIBLE_LIST();
      m = list.length;
      /* کارت‌های خارج از فیلتر/خطادار پنهان می‌شوند */
      photos.forEach((p) => {
        const c = cards.get(p.id);
        if (!c) return;
        const inList = !p.errored && (filter === "همه" || p.category === filter);
        c.el.classList.toggle("is-hidden", !inList);
      });
      const idx = prevPhoto ? list.indexOf(prevPhoto) : -1;
      slot = idx >= 0 ? idx : 0;
      pos = slot;
      thumbShown = 0;
      grid.innerHTML = "";
      measure();
      apply(pos);
      updateMeta(false);
      renderThumbs(true);
      preloadAround(slot);
    }

    /* ---- گرید بندانگشتی با «نمایش بیشتر» ---- */
    let thumbShown = 0;

    function renderThumbs(firstOverride) {
      if (!grid) return;
      if (!m) {
        grid.innerHTML = '<p class="thumbs__empty">هنوز عکسی در این دسته نیست.</p>';
        moreBox.hidden = true;
        return;
      }
      const from = firstOverride ? 0 : thumbShown;
      const to = Math.min(m, from + THUMB_STEP);
      const frag = document.createDocumentFragment();
      for (let i = from; i < to; i++) {
        const p = list[i];
        const b = document.createElement("button");
        b.className = "thumb";
        b.type = "button";
        b.dataset.pid = p.id;
        b.style.setProperty("--d", `${((i - from) % THUMB_STEP) * 0.04}s`);
        b.setAttribute("aria-label", `رفتن به عکس ${fa(p.id)}`);
        b.innerHTML = `
          <span class="thumb__skel" aria-hidden="true"></span>
          <img class="thumb__img" src="${p.src}" alt="${p.alt}" loading="lazy" decoding="async" draggable="false">
          <span class="thumb__num">${fa(p.id)}</span>`;
        const img = b.querySelector("img");
        img.addEventListener("load", () => b.classList.add("is-loaded"), { once: true });
        img.addEventListener("error", () => { handlePhotoError(p); }, { once: true });
        b.addEventListener("click", () => {
          const target = $("#gallery");
          if (target) window.scrollTo({ top: target.offsetTop, behavior: REDUCED ? "auto" : "smooth" });
          goToPhoto(p.id);
          markCurrentThumb();
        });
        frag.appendChild(b);
      }
      grid.appendChild(frag);
      thumbShown = to;
      moreBox.hidden = thumbShown >= m;
      markCurrentThumb();
    }

    moreBtn.addEventListener("click", () => renderThumbs());

    /* ---- لایت‌باکس ---- */
    const lb      = $("#lightbox");
    const lbStage = $("#lb-stage");
    const lbImg   = $("#lb-img");
    const lbCount = $("#lb-count");
    const lbDl    = $("#lb-download");
    let lbOpen = false, lbSlot = 0, lastFocus = null;

    /* زوم و پن */
    let scale = 1, tx = 0, ty = 0;
    let pointers = new Map();
    let pinchStart = null;
    let panStart = null;
    let lastTap = { t: 0, x: 0, y: 0 };

    function applyZoom(animate) {
      if (!REDUCED && animate) lbImg.style.transition = "transform .45s cubic-bezier(.22,1,.36,1), opacity .3s";
      else lbImg.style.transition = "opacity .3s";
      lbImg.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      lbImg.classList.toggle("is-zoomed", scale > 1.02);
      requestAnimationFrame(() => { lbImg.style.transition = ""; });
    }
    /* محدوده‌ی پن بر اساس ابعاد بدونِ ترنسفورم (offsetWidth) تا در زوم‌های متوالی قفل نشود */
    function clampPan() {
      const w = lbImg.offsetWidth || 0, h = lbImg.offsetHeight || 0;
      const maxX = Math.max(0, (w * scale - w) / 2 + 40);
      const maxY = Math.max(0, (h * scale - h) / 2 + 40);
      tx = clamp(tx, -maxX, maxX);
      ty = clamp(ty, -maxY, maxY);
    }
    function resetZoom() { scale = 1; tx = 0; ty = 0; pointers.clear(); pinchStart = null; panStart = null; }

    function fillLightbox(targetSlot, animated) {
      if (!m) return;
      lbSlot = clamp(targetSlot, 0, m - 1);
      const p = list[lbSlot];
      const swap = () => {
        resetZoom();
        applyZoom(false);
        lbImg.src = p.src;
        lbImg.alt = p.alt;
        lbCount.textContent = `${fa(lbSlot + 1)} از ${fa(m)}`;
        lbDl.href = p.src;
        lbDl.setAttribute("download", p.fileName);
        lbImg.classList.remove("is-switching");
        /* پیش‌بارگذاری عکس بعدی */
        const nxt = list[lbSlot + 1] || list[0];
        if (nxt) { const im = new Image(); im.src = nxt.src; }
      };
      if (animated && !REDUCED) {
        lbImg.classList.add("is-switching");
        setTimeout(swap, 180);
      } else swap();
      if (!lbOpen) return;
      goTo(lbSlot, { animated: false });
    }

    function openLightbox(targetSlot) {
      if (!m) return;
      lastFocus = document.activeElement;
      fillLightbox(targetSlot, false);
      lb.hidden = false;
      lbOpen = true;
      document.body.classList.add("is-locked");
      requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add("is-open")));
      $(".lightbox__btn--close").focus({ preventScroll: true });
      goTo(lbSlot, { animated: false });
    }

    function closeLightbox() {
      if (!lbOpen) return;
      lbOpen = false;
      lb.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      setTimeout(() => { lb.hidden = true; lbImg.src = ""; resetZoom(); }, REDUCED ? 0 : 420);
      lastFocus?.focus?.({ preventScroll: true });
      stage.focus({ preventScroll: true });
    }

    $$("[data-lb-close]").forEach((b) => b.addEventListener("click", closeLightbox));
    $("#lb-prev").addEventListener("click", () => fillLightbox(lbSlot - 1, true));
    $("#lb-next").addEventListener("click", () => fillLightbox(lbSlot + 1, true));

    lbDl.addEventListener("click", () => toast("دانلود شروع شد ✓"));

    /* اشتراک‌گذاری (Web Share با جایگزین کپی لینک) */
    $("#lb-share").addEventListener("click", async () => {
      const p = list[lbSlot];
      if (!p) return;
      const url = new URL(p.src, location.href).href;
      const data = {
        title: `عکس ${fa(p.id)} — پرنس بیرجند (PERANS FUTSAL CLUB)`,
        text: `عکس‌های تیم پرنس بیرجند در مسابقات کشوری قم؛ عکاس: مجتبی میدانی (آقای میم)`,
        url,
      };
      try {
        if (navigator.share) { await navigator.share(data); return; }
        if (await copyText(url)) toast("لینک عکس کپی شد ✓");
        else toast("اشتراک‌گذاری در این مرورگر ممکن نیست");
      } catch (err) {
        if (err && err.name === "AbortError") return; /* کاربر لغو کرد */
        if (await copyText(url)) toast("لینک عکس کپی شد ✓");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (!lbOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft")  fillLightbox(lbSlot + (DIR === -1 ? 1 : -1), true);
      if (e.key === "ArrowRight") fillLightbox(lbSlot + (DIR === -1 ? -1 : 1), true);
    });

    /* ژست‌ها روی صحنه‌ی لایت‌باکس: سوایپ / دابل‌تپ / پینچ / پن */
    lbStage.addEventListener("pointerdown", (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lbStage.setPointerCapture?.(e.pointerId);
      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        pinchStart = {
          dist: Math.hypot(dx, dy),
          scale,
          mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
          tx, ty,
        };
        panStart = null;
      } else if (pointers.size === 1) {
        panStart = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
        pinchStart = null;
      }
    });

    lbStage.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinchStart) {
        const pts = Array.from(pointers.values());
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        scale = clamp(pinchStart.scale * (dist / Math.max(1, pinchStart.dist)), 1, 4);
        tx = pinchStart.tx + (mid.x - pinchStart.mid.x);
        ty = pinchStart.ty + (mid.y - pinchStart.mid.y);
        clampPan();
        applyZoom(false);
      } else if (pointers.size === 1 && panStart) {
        const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) panStart.moved = true;
        if (scale > 1.02) {
          tx = panStart.tx + dx;
          ty = panStart.ty + dy;
          clampPan();
          applyZoom(false);
        }
      }
    });

    const zoomAtPoint = (x, y) => {
      const r = lbStage.getBoundingClientRect();
      scale = 2.4;
      tx = -((x - (r.left + r.width / 2)) * 0.5);
      ty = -((y - (r.top + r.height / 2)) * 0.5);
      clampPan();
      applyZoom(true);
    };

    const endLbPointer = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      lbStage.releasePointerCapture?.(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0 && panStart) {
        const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
        const wasTap = !panStart.moved;
        panStart = null;
        if (wasTap && e.pointerType !== "mouse") {
          /* دابل‌تپ لمسی: زوم نقطه‌ای ↔ برگشت از زوم (موس با dblclick پوشش داده می‌شود) */
          const now = performance.now();
          const isDouble = now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40;
          lastTap = { t: now, x: e.clientX, y: e.clientY };
          if (isDouble) {
            if (scale > 1.02) { resetZoom(); applyZoom(true); }
            else zoomAtPoint(e.clientX, e.clientY);
          }
        } else if (scale <= 1.02) {
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            fillLightbox(lbSlot + (dx < 0 ? -DIR : DIR), true);   /* سوایپ افقی */
          } else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) {
            closeLightbox();                                       /* کشیدن به پایین */
          }
        } else if (scale <= 1.04) { resetZoom(); applyZoom(true); }
      }
    };
    lbStage.addEventListener("pointerup", endLbPointer);
    lbStage.addEventListener("pointercancel", endLbPointer);

    /* دابل‌کلیک روی «صحنه» (نه خود عکس): به‌خاطر setPointerCapture رویداد به صحنه برمی‌گردد */
    lbStage.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (scale > 1.02) { resetZoom(); applyZoom(true); return; }
      zoomAtPoint(e.clientX, e.clientY);
    });

    /* ---- دانلود همه‌ی عکس‌ها (پشت‌سرهم با فاصله‌ی کوتاه) ---- */
    $("#download-all").addEventListener("click", () => {
      const okPhotos = photos.filter((p) => !p.errored);
      okPhotos.forEach((p, i) => setTimeout(() => downloadFile(p), i * DOWNLOAD_ALL_DELAY));
      toast(`دانلود ${fa(okPhotos.length)} عکس شروع شد ✓`);
    });

    /* ---- شروع ---- */
    filter = "همه";
    list = VISIBLE_LIST();
    m = list.length;
    measure();
    apply(0);
    if (m) { updateMeta(false); preloadAround(0); }
    renderFilters();
    renderThumbs(true);

    /* ورود اولیه‌ی سینمایی کارت‌ها */
    if (!REDUCED && m) {
      cards.forEach((c) => {
        c.el.style.transition = "none";
        c.el.style.opacity = "0";
        c.el.style.transform = "translate3d(0,0,0) scale(0.9)";
      });
      const start = () => requestAnimationFrame(() => {
        cards.forEach((c) => (c.el.style.transition = ""));
        apply(0);
      });
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { start(); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(stage);
    }
  }

  /* ---------- دکمه‌های مغناطیسی ---------- */
  function initMagnetic() {
    if (!FINE_POINTER || REDUCED) return;
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.22;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- کپی آیدی (CTA و کارت تماس) ---------- */
  function initCopyButtons() {
    const id = "@" + RUBIKA.id;

    const ctaCopy = $("#cta-copy");
    const ctaCopyText = $("#cta-copy-text");
    ctaCopy.addEventListener("click", async () => {
      const ok = await copyText(RUBIKA.id);
      if (ok) {
        ctaCopy.classList.add("is-done");
        ctaCopyText.textContent = "کپی شد ✓";
        toast(`آیدی ${id} کپی شد ✓`);
        setTimeout(() => { ctaCopy.classList.remove("is-done"); ctaCopyText.textContent = "کپی آیدی"; }, 2200);
      } else toast("کپی ممکن نشد؛ آیدی را دستی بنویسید");
    });

    const contactCopy = $("#contact-copy");
    contactCopy.addEventListener("click", async () => {
      const ok = await copyText(RUBIKA.id);
      if (ok) {
        contactCopy.classList.add("is-done");
        toast(`آیدی ${id} کپی شد ✓`);
        setTimeout(() => contactCopy.classList.remove("is-done"), 2200);
      } else toast("کپی ممکن نشد؛ آیدی را دستی بنویسید");
    });
  }

  /* ---------- سال جاری شمسی در فوتر ---------- */
  function initFooterYear() {
    const el = $("#footer-year");
    if (!el) return;
    try {
      const y = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric" })
        .format(new Date()).replace(/\D/g, "");
      el.textContent = fa(y);
    } catch {
      el.textContent = fa(new Date().getFullYear());
    }
  }

  /* ---------- صفحه‌ی بارگذاری ---------- */
  function initLoader(logoReadyPromise) {
    const loader = $("#loader");
    const fill = $("#loader-fill");
    const pct = $("#loader-pct");
    if (!loader) { document.dispatchEvent(new CustomEvent("loader:done")); return; }

    document.body.classList.add("is-locked");
    const t0 = performance.now();
    const MIN = REDUCED ? 300 : 1700;
    const MAX = 6500;
    let target = 8, shown = 0, done = false, raf = 0;

    const bump = (v) => { target = Math.min(100, target + v); };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      fill.style.width = "100%";
      pct.textContent = fa(100) + "٪";
      loader.classList.add("is-done");
      setTimeout(() => {
        loader.classList.add("is-out");
        document.body.classList.remove("is-locked", "is-loading");
        document.dispatchEvent(new CustomEvent("loader:done"));
        setTimeout(() => loader.remove(), 1400);
      }, REDUCED ? 50 : 380);
    };

    let last = t0, reached = 0;
    const tick = (now) => {
      const elapsed = now - t0;
      const dt = Math.min(80, now - last); last = now;
      if (target >= 100 && !reached) reached = now;
      const ceiling = target < 100 ? Math.min(target, 92) : 100;
      const k = target >= 100 ? 6 : 1.6;
      shown += (ceiling - shown) * (1 - Math.exp(-k * dt / 1000));
      if (target < 100) shown = Math.min(shown + dt / 900, ceiling);
      const v = Math.round(shown);
      fill.style.width = v + "%";
      pct.textContent = fa(v) + "٪";
      const settled = shown > 99.2 || (reached && now - reached > 1200);
      if (target >= 100 && settled && elapsed >= MIN) { finish(); return; }
      if (elapsed >= MAX) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    /* منتظر سه چیز می‌مانیم: فونت، لوگو، لود کامل صفحه */
    let fontsDone = false, logoDone = false, loadDone = false;
    const check = () => { if (fontsDone && logoDone && loadDone) target = 100; };

    (document.fonts?.ready || Promise.resolve())
      .then(() => { fontsDone = true; bump(36); check(); })
      .catch(() => { fontsDone = true; bump(36); check(); });

    Promise.resolve(logoReadyPromise)
      .then(() => { logoDone = true; bump(32); check(); })
      .catch(() => { logoDone = true; bump(32); check(); });
    setTimeout(() => { logoDone = true; bump(32); check(); }, 3500);

    const loadOk = () => { loadDone = true; bump(22); check(); };
    if (document.readyState === "complete") loadOk();
    else window.addEventListener("load", loadOk, { once: true });
    setTimeout(loadOk, 4500);
  }

  /* ---------- اجرا ---------- */
  function boot() {
    bindLinks();
    const logoReady = initLogos();
    renderStats();
    initHero();
    initGallery();
    initNav();
    initReveal();
    initMagnetic();
    initCopyButtons();
    initFooterYear();
    initLoader(logoReady);
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
