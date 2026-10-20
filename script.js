/* =====================================================================
   PRINCE BIRJAND — PERANS FUTSAL CLUB · Photo Gallery
   script.js  (بهینه‌شده برای ۶۰fps روی موبایل)
   =====================================================================

   ┌───────────────────────────────────────────────────────────────────┐
   │  بخش ۱ — تنظیمات و محتوا                                          │
   │  فقط همین بخش را ویرایش کنید. به بخش ۲ (موتور سایت) دست نزنید.     │
   │                                                                   │
   │  قوانین ساده: متن‌ها داخل "..."، بعد از هر مورد یک ویرگول ( , )   │
   │  و مسیرها نسبت به محل index.html هستند.                           │
   └───────────────────────────────────────────────────────────────────┘ */

/* --- مسیر پوشه‌ها (با اسلش انتهایی) --- */
const PHOTOS_DIR = "img/";
const THUMB_DIR  = "img/thumbs/";   /* نسخه‌ی کوچک عکس‌ها برای گرید؛ اگر نباشد خودکار به نسخه‌ی اصلی برمی‌گردد */

/* --- لوگوها (در صورت نبودن: شخصی ← MIIM ؛ باشگاهی ← PF) --- */
const LOGO_FILE      = "logo.png";
const CLUB_LOGO_FILE = "logo_c.png";

/* --- تعداد و پسوند عکس‌ها: اگر تعداد عوض شد فقط همین عدد را تغییر دهید --- */
const PHOTO_COUNT = 56;
const PHOTO_EXT   = "jpg";

/* --- پیشوند نام فایل دانلودی؛ خروجی: PERANS-FUTSAL-CLUB-05.jpg --- */
const DOWNLOAD_PREFIX = "PERANS-FUTSAL-CLUB-";

/* --- عکس برگزیده‌ی هیرو — عکس مالک باشگاه --- */
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

/* --- تنظیمات اختیاری تک‌تک عکس‌ها ---
   اگر عکسی پسوند متفاوتی دارد اینجا بنویسید. مثال:  8: { ext: "png" },   */
const PHOTO_META = {
  // 8: { ext: "png" },
};

/* --- فاصله‌ی بین دانلودهای «دانلود همه» (میلی‌ثانیه) --- */
const DOWNLOAD_ALL_DELAY = 450;
/* --- تعداد عکس‌هایی که با هر بار «نمایش بیشتر» اضافه می‌شود --- */
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
  const FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const DIR = getComputedStyle(document.documentElement).direction === "rtl" ? -1 : 1;

  /* حالت سبک: فقط برای دستگاه‌های واقعاً ضعیف */
  const LITE = REDUCED
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
    || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (LITE) document.documentElement.classList.add("lite");

  /* پشتیبانی @property برای border چرخان CTA؛ نداشت → چرخش transform */
  try { CSS.registerProperty({ name: "--pb-probe", syntax: "<angle>", initialValue: "0deg", inherits: false }); }
  catch { document.documentElement.classList.add("no-angleprop"); }

  /* ---------- قفل/آزاد اسکرول بدنه (با شمارنده، سازگار با iOS) ---------- */
  let lockCount = 0, savedY = 0;
  function lockBody() {
    if (lockCount++ > 0) return;
    savedY = window.scrollY;
    document.documentElement.classList.add("is-locked");
    document.body.classList.add("is-locked");
    document.body.style.top = `-${savedY}px`;   /* iOS: اسکرول را از دست نمی‌دهد */
  }
  function unlockBody() {
    if (lockCount === 0 || --lockCount > 0) return;
    document.documentElement.classList.remove("is-locked");
    document.body.classList.remove("is-locked");
    document.body.style.top = "";
    window.scrollTo(0, savedY);
  }

  /* ---------- ساخت مدل عکس‌ها (حلقه‌ی ۱ تا PHOTO_COUNT) ---------- */
  const photos = [];
  for (let i = 1; i <= PHOTO_COUNT; i++) {
    const meta = PHOTO_META[i] || {};
    photos.push({
      id: i,
      src: PHOTOS_DIR + i + "." + (meta.ext || PHOTO_EXT),
      thumbSrc: THUMB_DIR + i + "." + (meta.ext || PHOTO_EXT),
      fileName: DOWNLOAD_PREFIX + pad2(i) + "." + (meta.ext || PHOTO_EXT),
      alt: `عکس ${fa(i)} — پرنس بیرجند (PERANS FUTSAL CLUB) در مسابقات کشوری قم`,
      errored: false,
    });
  }

  /* دانلود مستقیم فایل اصلی (بدون fetch و کانواس؛ روی file:// هم کار می‌کند) */
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

  /* ---------- toast شیشه‌ای (قابل‌به‌روزرسانی برای نمایش پیشرفت) ---------- */
  const toastEl = $("#toast");
  const toastText = $("#toast-text");
  let toastTimer = 0;
  function toast(msg, hold = 2600) {
    if (!toastEl) return;
    toastText.textContent = msg;
    toastEl.classList.remove("is-visible");
    void toastEl.offsetWidth;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    if (hold > 0) toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), hold);
  }

  /* ---------- کپی متن (clipboard + fallback) ---------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* ادامه با روش قدیمی */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;inset-inline-start:-999px";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch { return false; }
  }

  /* ---------- افکت موج (ripple) روی کلیک دکمه‌ها — با delegation یک نسخه ---------- */
  (function initRipples() {
    if (REDUCED) return;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn, .btn-rb, .cta__copy, .contact__copy, .lightbox__action");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const wave = document.createElement("span");
      wave.className = "ripple";
      wave.style.left = (e.clientX - r.left - 7) + "px";
      wave.style.top  = (e.clientY - r.top - 7) + "px";
      btn.appendChild(wave);
      setTimeout(() => wave.remove(), 800);
    }, { passive: true });
  })();

  /* ---------- لوگوها: شخصی (logo.png←MIIM) و باشگاهی (logo_c.png←PF) ---------- */
  function initLogos() {
    const mounts = [
      ...$$("[data-logo]").map((el) => ({ el, file: LOGO_FILE, alt: "لوگوی مجتبی میدانی (آقای میم)", fb: "MIIM", title: "مجتبی میدانی (آقای میم)" })),
      ...$$("[data-club-logo]").map((el) => ({ el, file: CLUB_LOGO_FILE, alt: "لوگوی باشگاه پرنس بیرجند (PERANS FUTSAL CLUB)", fb: "PF", title: "PERANS FUTSAL CLUB" })),
    ];
    const waits = mounts.map(({ el, file, alt, fb, title }) => new Promise((resolve) => {
      const img = new Image();
      img.draggable = false;
      img.alt = alt;
      const done = () => resolve();
      img.onload = () => { el.appendChild(img); done(); };
      img.onerror = () => {
        el.innerHTML = `<span class="logo-fallback" aria-hidden="true" title="${title}">${fb}</span>`;
        done();
      };
      img.src = PHOTOS_DIR + file;
    }));
    return Promise.allSettled(waits);
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
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = fa(Math.round(target * ease));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- ظهور هنگام اسکرول با یک IntersectionObserver مشترک ---------- */
  let revealStart = null;
  function initReveal() {
    const items = $$("[data-reveal]");
    const fire = (el) => {
      el.classList.add("is-in");
      $$("[data-count]", el).forEach(countUp);
      if (el.matches("[data-count]")) countUp(el);
    };
    if (!("IntersectionObserver" in window) || REDUCED) {
      revealStart = () => items.forEach(fire);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        fire(en.target);
        io.unobserve(en.target);        /* کارش که تمام شد، دیگر رصد نمی‌شود */
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    /* بعد از پایان لودینگ رصد شروع شود تا انیمیشن‌ها پشت پرده هدر نروند */
    let started = false;
    revealStart = () => {
      if (started) return;
      started = true;
      items.forEach((el) => io.observe(el));
    };
    setTimeout(revealStart, 6500); /* پشتیبان مطلق */
  }

  /* ---------- توقف انیمیشن‌های بی‌پایان هنگام خروج از دید/مخفی شدن تب ---------- */
  function initAnimPausing() {
    document.addEventListener("visibilitychange", () => {
      document.body.classList.toggle("doc-hid", document.hidden);
    });
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle("sect--out", !en.isIntersecting));
    }, { rootMargin: "120px" });
    $$("[data-anim-scope], .bg").forEach((el) => io.observe(el));
  }

  /* ---------- ناوبری: pill لغزان + scroll-spy + بازگشت به بالا ---------- */
  function initNav() {
    const menu = $(".nav__menu");
    const pill = $(".nav__pill");
    const links = $$(".nav__link");
    const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);
    if (!menu || !sections.length) return;

    const movePill = (link) => {
      if (!pill) return;
      if (!link) { pill.style.opacity = "0"; return; }
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

    /* scroll-spy با rAF و listener غیرفعال (passive) */
    let current = null, spyTick = false;
    const topOf = (s) => (s.id === "home" ? 0 : s.offsetTop);
    const spy = () => {
      const y = window.scrollY + window.innerHeight * 0.38;
      let id = sections[0].id;
      for (const s of sections) if (y >= topOf(s)) id = s.id;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) id = sections[sections.length - 1].id;
      if (id !== current) { current = id; setActive(id); }
    };
    const onScrollSpy = () => {
      if (spyTick) return;
      spyTick = true;
      requestAnimationFrame(() => { spy(); spyTick = false; });
    };
    window.addEventListener("scroll", onScrollSpy, { passive: true });
    window.addEventListener("resize", onScrollSpy);

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
        scrollToSection(target);
        history.replaceState(null, "", id);
        if (target.id === "gallery" && window.PB_GOTO_HERO_PHOTO) window.PB_GOTO_HERO_PHOTO();
      });
    });

    window.addEventListener("resize", () => movePill(links.find((l) => l.classList.contains("is-active"))));
    document.fonts?.ready?.then(() => movePill(links.find((l) => l.classList.contains("is-active"))));
    requestAnimationFrame(spy);
    setTimeout(spy, 600);

    /* بازگشت به بالا */
    const toTop = $("#totop");
    if (toTop) {
      toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));
      let topTick = false;
      const onScrollTop = () => {
        if (topTick) return;
        topTick = true;
        requestAnimationFrame(() => {
          toTop.classList.toggle("is-visible", window.scrollY > 600);
          topTick = false;
        });
      };
      window.addEventListener("scroll", onScrollTop, { passive: true });
      onScrollTop();
    }
  }

  /* ---------- هیرو: عکس برگزیده + محو با اسکرول + پارالاکس موس ---------- */
  function initHero() {
    const inner = $("#hero-inner");
    const media = $("#hero-media");
    const photoWrap = $("#hero-photo-link");
    const img = $("#hero-photo");
    if (!inner) return;
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
    window.PB_GOTO_HERO_PHOTO = null; /* در گالری مقداردهی می‌شود */

    /* محو شدن نرم هیرو هنگام اسکرول (passive + rAF، خواندن و نوشتن جدا) */
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

    /* پارالاکس ملایم با موس (فقط دسکتاپ و دستگاه‌های سالم؛ مقادیر کش و در یک تیک ترکیب می‌شوند) */
    if (!FINE || REDUCED || LITE || !media) return;
    const hero = $("#home");
    const text = $("#hero-text");
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const loop = () => {
      cx = lerp(cx, tx, 0.07);
      cy = lerp(cy, ty, 0.07);
      media.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (text) text.style.transform = `translate3d(${cx * 0.45}px, ${cy * 0.45}px, 0)`;
      if (Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05) raf = requestAnimationFrame(loop);
      else raf = null;
    };
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 16;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 10;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  }

  /* ---------- تیلت سه‌بعدی ملایم کارت‌ها (فقط hover دسکتاپ) ---------- */
  function initTilt() {
    if (!FINE || REDUCED || LITE) return;
    $$("[data-tilt]").forEach((el) => {
      let trx = 0, tryy = 0, crx = 0, cry = 0, raf = null;
      const loop = () => {
        crx = lerp(crx, trx, 0.12);
        cry = lerp(cry, tryy, 0.12);
        el.style.setProperty("--rx", crx.toFixed(2) + "deg");
        el.style.setProperty("--ry", cry.toFixed(2) + "deg");
        if (Math.abs(crx - trx) > 0.05 || Math.abs(cry - tryy) > 0.05) raf = requestAnimationFrame(loop);
        else raf = null;
      };
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        tryy = ((e.clientX - r.left) / r.width - 0.5) * 5;
        trx  = -((e.clientY - r.top) / r.height - 0.5) * 4;
        if (!raf) raf = requestAnimationFrame(loop);
      }, { passive: true });
      el.addEventListener("pointerleave", () => { trx = 0; tryy = 0; if (!raf) raf = requestAnimationFrame(loop); });
    });
  }

  /* ---------- دکمه‌های مغناطیسی ---------- */
  function initMagnetic() {
    if (!FINE || REDUCED || LITE) return;
    $$("[data-magnetic]").forEach((el) => {
      let raf = null, mx = 0, my = 0;
      el.addEventListener("pointermove", (e) => {
        mx = e.clientX; my = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          const r = el.getBoundingClientRect();
          const x = (mx - r.left - r.width / 2) * 0.18;
          const y = (my - r.top - r.height / 2) * 0.22;
          el.style.transform = `translate(${x}px, ${y}px)`;
        });
      }, { passive: true });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- گالری (کاروسل سه‌بعدی + گرید + لایت‌باکس) ---------- */
  function initGallery() {
    const stage   = $("#stage");
    const countEl = $("#carousel-count");
    const rail    = $("#rail");
    const thumbEl = $("#rail-thumb");
    const hint    = $("#carousel-hint");
    const grid    = $("#thumbs-grid");
    const moreBox = $(".thumbs__more");
    const moreBtn = $("#thumbs-more");
    if (!stage) return;

    const DEFAULT_ASPECT = 4 / 3;
    const VISIBLE = 3;                       /* فقط ±۳ کارت اطراف رندر کامل → ۷ کارت */
    let list = [];                            /* عکس‌های سالم، همیشه همه به ترتیب ۱..۵۶ */
    let m = 0;
    let slot = 0;                             /* اسلات فعال */
    let pos = 0;                              /* موقعیت متحرک برای اینترپولیشن */
    let targetPos = 0;                        /* هدف حلقه‌ی اینرسی */
    let rafLoop = null;
    let stageW = 0, stageH = 0, gap = 26;
    let widths = [];
    const cards = new Map();

    /* ---- ساخت کارت‌ها: تصویر واقعی فقط وقتی به بازه‌ی لُود برسد ---- */
    photos.forEach((p) => {
      const el = document.createElement("article");
      el.className = "ph";
      el.dataset.pid = p.id;
      el.setAttribute("aria-label", `عکس ${fa(p.id)} از ${fa(PHOTO_COUNT)} — پرنس بیرجند در قم`);
      el.innerHTML = `
        <span class="ph__skeleton" aria-hidden="true"></span>
        <img class="ph__img" draggable="false" decoding="async" alt="${p.alt}">
        <a class="ph__dl" href="${p.src}" download="${p.fileName}" target="_blank" rel="noopener"
           data-no-drag aria-label="دانلود عکس ${fa(p.id)} با کیفیت اصلی (${p.fileName})">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v10m0 0-4-4m4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 17v1.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
        </a>`;
      const img = el.querySelector(".ph__img");
      const card = { el, img, aspect: DEFAULT_ASPECT, loaded: false, wanted: false };

      el.querySelector(".ph__dl").addEventListener("click", (e) => {
        e.stopPropagation();
        toast("دانلود شروع شد ✓");
      });

      img.addEventListener("load", () => {
        if (img.naturalWidth && img.naturalHeight) card.aspect = img.naturalWidth / img.naturalHeight;
        card.loaded = true;
        el.classList.add("is-loaded");
        measure();
        apply(pos);
      }, { once: true });
      img.addEventListener("error", () => { handlePhotoError(p); }, { once: true });

      stage.appendChild(el);
      cards.set(p.id, card);
    });

    /* لود عکس فقط در بازه‌ی ±۲ اطراف فعال (و یک بار برای همیشه) */
    function warm(center) {
      for (let k = -2; k <= 2; k++) {
        const q = list[center + k];
        if (!q || q.errored) continue;
        const c = cards.get(q.id);
        if (c && !c.wanted) { c.wanted = true; c.img.src = q.src; }
      }
    }

    /* عکسی که اصلاً لود نشد: از چرخه و گرید حذف می‌شود و چیدمان نمی‌شکند */
    function handlePhotoError(p) {
      if (p.errored) return;
      p.errored = true;
      const c = cards.get(p.id);
      if (c) { c.el.classList.add("is-hidden"); c.el.remove(); }
      refreshList();
    }

    /* ---- اندازه‌گیری ---- */
    function measure() {
      stageW = stage.clientWidth;
      stageH = stage.clientHeight;
      gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-gap")) || 26;
      const maxW = Math.min(stageW * (stageW < 640 ? 0.86 : 0.62), stageH * 2.2);
      const minW = Math.min(stageH * 0.45, maxW);
      widths = list.map((p) => {
        const c = cards.get(p.id);
        const w = clamp(stageH * (c ? c.aspect : DEFAULT_ASPECT), minW, maxW);
        if (c) c.el.style.setProperty("--w", w + "px");
        return w;
      });
    }

    const scaleAt = (k) => Math.max(0.5, 1 - 0.13 * k);

    /* چیدمان سه‌بعدی برای یک اسلات فعالِ صحیح */
    function layoutFor(a) {
      const out = new Array(m);
      for (let i = 0; i < m; i++) {
        const d = i - a;
        const k = Math.abs(d);
        if (k > VISIBLE) { out[i] = null; continue; }
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
          o: k === 0 ? 1 : Math.max(0.16, 0.74 - (k - 1) * 0.24),
          b: k === 0 ? 0 : Math.min(3, 0.7 + (k - 1) * 1.1),
          z: 20 - k,
        };
      }
      return out;
    }

    /* نوشتن روی DOM فقط برای کارت‌های نزدیک */
    function apply(p) {
      if (!stageW) measure();
      if (!m) return;
      const a = clamp(Math.floor(p), 0, m - 1);
      const t = clamp(p - a, 0, 1);
      const L1 = layoutFor(a);
      const L2 = t > 0 && a + 1 < m ? layoutFor(a + 1) : L1;
      for (let i = 0; i < m; i++) {
        const card = cards.get(list[i].id);
        if (!card || !card.el.isConnected) continue;
        const s1 = L1[i], s2 = L2[i];
        const hidden = (!s1 || s1.k === undefined) && (!s2);
        const h1 = !s1, h2 = !s2;
        if (h1 && h2) { card.el.classList.add("is-hidden"); continue; }
        card.el.classList.remove("is-hidden");
        const A = s1 || s2, B = s2 || s1;
        const x = lerp(A.x, B.x, t), s = lerp(A.s, B.s, t), r = lerp(A.r, B.r, t);
        const o = lerp(A.o, B.o, t), b = lerp(A.b, B.b, t);
        card.el.style.transform = `translate3d(${x}px, 0, 0) scale(${s}) rotateY(${r}deg)`;
        card.el.style.opacity = o.toFixed(3);
        card.el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
        card.el.style.zIndex = Math.round(lerp(A.z, B.z, t));
        card.el.classList.toggle("is-active", i === slot);
        card.el.setAttribute("aria-hidden", i === slot ? "false" : "true");
      }
    }

    /* will-change فقط روی کارت‌های نزدیک و فقط هنگام حرکت */
    let liveTimer = 0;
    function setLive(on) {
      clearTimeout(liveTimer);
      for (let i = 0; i < m; i++) {
        const card = cards.get(list[i].id);
        if (card && card.el.isConnected) card.el.classList.toggle("is-live", on && Math.abs(i - slot) <= VISIBLE + 1);
      }
      if (on) liveTimer = setTimeout(() => setLive(false), 500);
    }

    /* حلقه‌ی اینرسی: فقط تا وقتی بین pos و targetPos اختلاف هست */
    function loop() {
      pos = lerp(pos, targetPos, REDUCED ? 1 : 0.16);
      if (Math.abs(targetPos - pos) < 0.0015) {
        pos = targetPos;
        apply(pos);
        rafLoop = null;
        setLive(false);
        return;
      }
      apply(pos);
      rafLoop = requestAnimationFrame(loop);
    }
    function kickLoop() { if (!rafLoop) { setLive(true); rafLoop = requestAnimationFrame(loop); } }

    function updateMeta() {
      if (!m) return;
      countEl.textContent = `${fa(slot + 1)} از ${fa(m)}`;
      const railW = rail.clientWidth;
      const tw = Math.max(railW / m, 34);
      const off = m > 1 ? (railW - tw) * (slot / (m - 1)) : 0;
      thumbEl.style.width = tw + "px";
      thumbEl.style.transform = `translateX(${DIR * off}px)`;
    }

    function goTo(i, { fromUser = true } = {}) {
      if (!m) return;
      /* حلقه‌ی بی‌نهایت برای فلش/کیبورد: بدون پرش بد */
      slot = ((i % m) + m) % m;
      targetPos = slot;
      kickLoop();
      updateMeta();
      markCurrentThumb();
      warm(slot);
      if (fromUser) hint.classList.add("is-faded");
    }

    function goToPhoto(id) {
      const i = list.findIndex((p) => p.id === id);
      if (i >= 0) goTo(i);
    }
    window.PB_GOTO_HERO_PHOTO = () => {
      const heroImg = $("#hero-photo");
      const id = heroImg && heroImg.src ? +(heroImg.src.match(/(\d+)\.\w+$/) || [])[1] : 0;
      if (id) setTimeout(() => goToPhoto(id), 700);
    };

    /* ---- کشیدن/سوایپ جهت‌دار RTL + تفکیک کلیک از درگ (آستانه‌ی ۷px) ---- */
    const DRAG_TAP = 7;
    let dragging = false, startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, moved = false, pid = null, startCard = null;
    const unit = () => Math.max(160, (widths[slot] || 240) * 0.75);

    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest && e.target.closest("[data-no-drag]")) return; /* دکمه‌های داخل کارت */
      dragging = true; moved = false; pid = e.pointerId;
      startCard = e.target.closest?.(".ph") || null;
      startX = lastX = e.clientX; startPos = targetPos; lastT = performance.now(); vel = 0;
      stage.classList.add("is-dragging");
      stage.setPointerCapture?.(pid);
    });

    stage.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > DRAG_TAP) moved = true;
      if (!moved) return;
      const now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
      let p = startPos - (dx / unit()) * DIR;
      /* مقاومت لاستیکی در دو انتها */
      if (p < 0) p = p * 0.35;
      if (p > m - 1) p = (m - 1) + (p - (m - 1)) * 0.35;
      targetPos = p;
      pos = p;                 /* هنگام درگ مستقیم، بدون اینرسی */
      kickLoop();
      apply(pos);
    }, { passive: true });

    const endDrag = (e) => {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      try { stage.releasePointerCapture?.(pid); } catch {}
      if (!moved && e && e.type === "pointerup" && startCard) {
        /* کلیک واقعی: فعال → لایت‌باکس ؛ کناری → فعالش کن */
        const id = +startCard.dataset.pid;
        const idx = list.findIndex((p) => p.id === id);
        if (idx === slot) openLightbox(slot);
        else if (idx >= 0) goTo(idx);
        startCard = null;
        targetPos = slot;
        return;
      }
      startCard = null;
      const fling = -vel * DIR * 14;
      targetPos = Math.round(targetPos + clamp(fling, -1, 1));
      targetPos = clamp(targetPos, 0, m - 1);
      slot = targetPos;
      kickLoop();
      updateMeta();
      markCurrentThumb();
      warm(slot);
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("lostpointercapture", () => { if (dragging) endDrag(); });

    /* جلوگیری از کلیک اتفاقی بعد از درگ (در صورت bubble شدن click) */
    stage.addEventListener("click", (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);

    /* اسکرول افقی تاچ‌پد */
    let wheelLock = false;
    stage.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
      e.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      goTo(slot + (e.deltaX > 0 ? -DIR : DIR));
      setTimeout(() => (wheelLock = false), 420);
    }, { passive: false });

    /* کیبورد (چرخه‌ی بی‌نهایت) */
    stage.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(slot + (DIR === -1 ? 1 : -1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goTo(slot + (DIR === -1 ? -1 : 1)); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(slot); }
      else if (e.key === "Home") { e.preventDefault(); goTo(0); }
      else if (e.key === "End")  { e.preventDefault(); goTo(m - 1); }
    });

    /* بازاندازه: فقط از طریق ResizeObserver روی صحنه (خودش debounce ذاتی دارد) */
    let rT = 0;
    const reMeasure = () => {
      clearTimeout(rT);
      rT = setTimeout(() => { stageW = 0; measure(); apply(pos); updateMeta(); }, 90);
    };
    if ("ResizeObserver" in window) new ResizeObserver(reMeasure).observe(stage);
    else window.addEventListener("resize", reMeasure);

    /* ---- گرید بندانگشتی با تعویق واقعی و «نمایش بیشتر» ---- */
    /* یک بار وجود پوشه‌ی بندانگشتی‌ها بررسی می‌شود؛ بدون پوشه اصلاً سراغش نمی‌رویم تا کنسول 404 نگیرد */
    let thumbsOk = null; /* null = در حال بررسی */
    try {
      fetch(photos[0].thumbSrc, { method: "HEAD" })
        .then((r) => { thumbsOk = r.ok; })
        .catch(() => { thumbsOk = false; });
    } catch { thumbsOk = false; }

    const loadThumbSrc = (img) => {
      if (thumbsOk === true) img.src = img.dataset.thumb;
      else if (thumbsOk === false) img.src = img.dataset.full;
      else {
        const iv = setInterval(() => {
          if (thumbsOk !== null) { clearInterval(iv); loadThumbSrc(img); }
        }, 120);
        setTimeout(() => { clearInterval(iv); thumbsOk = thumbsOk !== null; loadThumbSrc(img); }, 2500);
      }
    };

    let thumbShown = 0;
    let thumbIO = null;
    if ("IntersectionObserver" in window) {
      thumbIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const img = en.target;
          thumbIO.unobserve(img);
          loadThumbSrc(img);   /* اول نسخه‌ی سبک (در صورت وجود)؛ onerror → نسخه‌ی اصلی */
        });
      }, { rootMargin: "650px" });
    }

    function renderThumbs(reset) {
      if (!grid) return;
      if (!m) {
        grid.innerHTML = '<p class="thumbs__empty">عکسی برای نمایش نیست.</p>';
        moreBox.hidden = true;
        return;
      }
      if (reset) { grid.innerHTML = ""; thumbShown = 0; }
      const from = thumbShown;
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
          <img class="thumb__img" data-thumb="${p.thumbSrc}" data-full="${p.src}" alt="${p.alt}" loading="lazy" decoding="async" draggable="false">
          <span class="thumb__num">${fa(p.id)}</span>`;
        const img = b.querySelector("img");
        img.addEventListener("load", () => b.classList.add("is-loaded"), { once: true });
        img.addEventListener("error", function fb() {
          /* نسخه‌ی کوچک موجود نبود → نسخه‌ی اصلی؛ آن هم نبود → حذف از چرخه */
          const full = new URL(p.src, location.href).href;
          if (img.src !== full) img.src = p.src;
          else { img.removeEventListener("error", fb); handlePhotoError(p); }
        });
        b.addEventListener("click", () => {
          window.scrollTo({ top: $("#gallery").offsetTop, behavior: REDUCED ? "auto" : "smooth" });
          goToPhoto(p.id);
          markCurrentThumb();
        });
        if (thumbIO) thumbIO.observe(img); else img.src = p.src;
        frag.appendChild(b);
      }
      grid.appendChild(frag);
      thumbShown = to;
      moreBox.hidden = thumbShown >= m;
      markCurrentThumb();
    }
    moreBtn.addEventListener("click", () => renderThumbs(false));

    function markCurrentThumb() {
      if (!m) return;
      const cur = list[slot] && list[slot].id;
      $$(".thumb", grid).forEach((b) => b.classList.toggle("is-current", +b.dataset.pid === cur));
    }

    /* بازسازی لیست (بعد از حذف عکس‌های خطادار) */
    function refreshList() {
      const prev = list[slot] || null;
      list = photos.filter((p) => !p.errored);
      m = list.length;
      const idx = prev ? list.indexOf(prev) : -1;
      slot = idx >= 0 ? idx : clamp(slot, 0, Math.max(0, m - 1));
      pos = targetPos = slot;
      stageW = 0;
      measure();
      if (m) {
        apply(pos);
        updateMeta();
        warm(slot);
      }
      renderThumbs(true);
    }

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
    let pinchStart = null, panStart = null;
    let lastTap = { t: 0, x: 0, y: 0 };

    function applyZoom(animate) {
      if (!REDUCED && animate) lbImg.style.transition = "transform .45s cubic-bezier(.22,1,.36,1), opacity .3s";
      else lbImg.style.transition = "opacity .3s";
      lbImg.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      lbImg.classList.toggle("is-zoomed", scale > 1.02);
      requestAnimationFrame(() => { lbImg.style.transition = ""; });
    }
    function clampPan() {
      const w = lbImg.offsetWidth || 0, h = lbImg.offsetHeight || 0;
      tx = clamp(tx, -(Math.max(0, (w * scale - w) / 2 + 40)), Math.max(0, (w * scale - w) / 2 + 40));
      ty = clamp(ty, -(Math.max(0, (h * scale - h) / 2 + 40)), Math.max(0, (h * scale - h) / 2 + 40));
    }
    function resetZoom() { scale = 1; tx = 0; ty = 0; pointers.clear(); pinchStart = null; panStart = null; }

    function fillLightbox(i, dir = 0) {
      if (!m) return;
      lbSlot = ((i % m) + m) % m;
      const p = list[lbSlot];
      const doSwap = () => {
        resetZoom();
        lbImg.style.setProperty("--swx", dir * (DIR === -1 ? -26 : 26) + "px");
        applyZoom(false);
        lbImg.src = p.src;
        lbImg.alt = p.alt;
        lbCount.textContent = `${fa(lbSlot + 1)} از ${fa(m)}`;
        lbDl.href = p.src;
        lbDl.setAttribute("download", p.fileName);
        lbImg.classList.remove("is-switching");
        /* پیش‌بارگذاری عکس بعدی */
        const nxt = list[(lbSlot + 1) % m];
        if (nxt) { const im = new Image(); im.src = nxt.src; }
      };
      if (dir !== 0 && !REDUCED && lbImg.src) {
        lbImg.classList.add("is-switching");
        setTimeout(doSwap, 180);
      } else doSwap();
      if (lbOpen) goTo(lbSlot, { fromUser: false });
    }

    function openLightbox(i) {
      if (!m) return;
      lastFocus = document.activeElement;
      fillLightbox(i, 0);
      lbOpen = true;
      lb.hidden = false;
      lockBody();
      requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add("is-open")));
      $(".lightbox__btn--close")?.focus({ preventScroll: true });
      goTo(lbSlot, { fromUser: false });
    }

    function closeLightbox() {
      if (!lbOpen) return;
      lbOpen = false;
      lb.classList.remove("is-open");
      unlockBody();
      setTimeout(() => {
        lb.hidden = true;
        lbImg.removeAttribute("src");          /* درخواست اضافی قطع */
        lbImg.style.transform = "";
        resetZoom();
      }, REDUCED ? 0 : 420);
      lastFocus?.focus?.({ preventScroll: true });
      stage.focus({ preventScroll: true });
    }

    $$("[data-lb-close]").forEach((b) => b.addEventListener("click", closeLightbox));
    $("#lb-prev").addEventListener("click", () => fillLightbox(lbSlot - 1, -1));
    $("#lb-next").addEventListener("click", () => fillLightbox(lbSlot + 1, 1));
    lbDl.addEventListener("click", () => toast("دانلود شروع شد ✓"));

    /* اشتراک‌گذاری (Web Share + جایگزین کپی لینک) */
    $("#lb-share").addEventListener("click", async () => {
      const p = list[lbSlot];
      if (!p) return;
      const url = new URL(p.src, location.href).href;
      const data = {
        title: `عکس ${fa(p.id)} — پرنس بیرجند (PERANS FUTSAL CLUB)`,
        text: "عکس‌های تیم پرنس بیرجند در مسابقات کشوری قم؛ عکاس: مجتبی میدانی (آقای میم)",
        url,
      };
      try {
        if (navigator.share) { await navigator.share(data); return; }
        if (await copyText(url)) toast("لینک عکس کپی شد ✓");
        else toast("اشتراک‌گذاری در این مرورگر ممکن نیست");
      } catch (err) {
        if (err && err.name === "AbortError") return;
        if (await copyText(url)) toast("لینک عکس کپی شد ✓");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (!lbOpen) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft")  fillLightbox(lbSlot + (DIR === -1 ? 1 : -1), DIR === -1 ? 1 : -1);
      else if (e.key === "ArrowRight") fillLightbox(lbSlot + (DIR === -1 ? -1 : 1), DIR === -1 ? -1 : 1);
    });

    /* ژست‌ها: سوایپ / دابل‌تپ / پینچ / پن (همه با pointer events و روی صحنه) */
    const zoomAtPoint = (x, y) => {
      const r = lbStage.getBoundingClientRect();
      scale = 2.4;
      tx = -((x - (r.left + r.width / 2)) * 0.5);
      ty = -((y - (r.top + r.height / 2)) * 0.5);
      clampPan();
      applyZoom(true);
    };

    lbStage.addEventListener("pointerdown", (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lbStage.setPointerCapture?.(e.pointerId);
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStart = {
          dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
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
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
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

    const endLbPointer = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      try { lbStage.releasePointerCapture?.(e.pointerId); } catch {}
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0 && panStart) {
        const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
        const wasTap = !panStart.moved;
        panStart = null;
        if (wasTap && e.pointerType !== "mouse") {
          /* دابل‌تپ لمسی: زوم ↔ برگشت */
          const now = performance.now();
          const isDouble = now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40;
          lastTap = { t: now, x: e.clientX, y: e.clientY };
          if (isDouble) {
            if (scale > 1.02) { resetZoom(); applyZoom(true); }
            else zoomAtPoint(e.clientX, e.clientY);
          }
        } else if (scale <= 1.02) {
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            fillLightbox(lbSlot + (dx < 0 ? -DIR : DIR), dx < 0 ? -DIR : DIR);   /* سوایپ افقی */
          } else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) {
            closeLightbox();                                                     /* کشیدن به پایین */
          }
        } else if (scale <= 1.04) { resetZoom(); applyZoom(true); }
      }
    };
    lbStage.addEventListener("pointerup", endLbPointer);
    lbStage.addEventListener("pointercancel", endLbPointer);

    /* دابل‌کلیک روی «صحنه» (به‌خاطر setPointerCapture رویداد به صحنه برمی‌گردد) */
    lbStage.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (scale > 1.02) { resetZoom(); applyZoom(true); return; }
      zoomAtPoint(e.clientX, e.clientY);
    });

    /* ---- دانلود همه: پشت‌سرهم + نمایش پیشرفت + قفل دکمه ---- */
    const dlAllBtn = $("#download-all");
    let dlAllBusy = false;
    dlAllBtn.addEventListener("click", () => {
      if (dlAllBusy) return;
      const okPhotos = photos.filter((p) => !p.errored);
      if (!okPhotos.length) { toast("عکسی برای دانلود نیست"); return; }
      dlAllBusy = true;
      dlAllBtn.disabled = true;
      const total = okPhotos.length;
      okPhotos.forEach((p, i) => {
        setTimeout(() => {
          downloadFile(p);
          toast(`دانلود ${fa(i + 1)} از ${fa(total)}…`, 0);         /* پیشرفت */
          if (i === total - 1) {
            setTimeout(() => {
              toastLangDone(total);
              dlAllBusy = false;
              dlAllBtn.disabled = false;
            }, 700);
          }
        }, i * DOWNLOAD_ALL_DELAY);
      });
    });
    function toastLangDone(total) {
      toast(`دانلود همه‌ی عکس‌ها شروع شد ✓ (${fa(total)} عکس)`);
    }

    /* ---- شروع ---- */
    list = photos.filter((p) => !p.errored);
    m = list.length;
    measure();
    if (m) {
      apply(0);
      updateMeta();
      warm(0);
    }
    renderThumbs(true);

    /* ورود اولیه‌ی سینمایی کارت‌ها (وقتی کاروسل دیده شد) */
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

  /* ---------- کپی آیدی (CTA و کارت تماس) ---------- */
  function initCopyButtons() {
    const id = "@" + RUBIKA.id;

    const ctaCopy = $("#cta-copy");
    const ctaCopyText = $("#cta-copy-text");
    if (ctaCopy) ctaCopy.addEventListener("click", async () => {
      const ok = await copyText(RUBIKA.id);
      if (ok) {
        ctaCopy.classList.add("is-done");
        ctaCopyText.textContent = "کپی شد ✓";
        toast(`آیدی ${id} کپی شد ✓`);
        setTimeout(() => { ctaCopy.classList.remove("is-done"); ctaCopyText.textContent = "کپی آیدی"; }, 2200);
      } else toast("کپی ممکن نشد؛ آیدی را دستی بنویسید");
    });

    const contactCopy = $("#contact-copy");
    if (contactCopy) contactCopy.addEventListener("click", async () => {
      const ok = await copyText(RUBIKA.id);
      if (ok) {
        contactCopy.classList.add("is-done");
        toast(`آیدی ${id} کپی شد ✓`);
        setTimeout(() => contactCopy.classList.remove("is-done"), 2200);
      } else toast("کپی ممکن نشد؛ آیدی را دستی بنویسید");
    });
  }

  /* ---------- هم‌گام‌سازی لینک‌های روبیکا و متن آیدی (دوپایه: در HTML هم هست) ---------- */
  function syncRubika() {
    $$('a[href^="https://rubika.ir/"]').forEach((a) => {
      a.href = RUBIKA.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
    const idText = "@" + RUBIKA.id;
    const ctaId = $("#cta-id"); if (ctaId) ctaId.textContent = idText;
    const conId = $("#contact-id"); if (conId) conId.textContent = idText;
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

  /* ---------- شناسایی افت فریم در ثانیه‌های اول → فقط تزئینات غیرضروری کم می‌شود ---------- */
  function initFpsGuard() {
    if (REDUCED || LITE) return;
    document.addEventListener("loader:done", () => {
      const samples = [];
      let frames = 0, winStart = performance.now(), last = winStart;
      const watch = (now) => {
        frames++;
        if (now - winStart >= 1000) {
          samples.push(frames);
          frames = 0;
          winStart = now;
          if (samples.length >= 3) {
            const median = samples.slice().sort((a, b) => a - b)[1];
            if (median < 46) document.documentElement.classList.add("fsave");
            return;   /* پایان پایش */
          }
        }
        last = now;
        if (performance.now() - winStart < 4000 + (samples.length * 0)) requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    }, { once: true });
  }

  /* ---------- صفحه‌ی بارگذاری با پیشرفت واقعی ---------- */
  function initLoader(logoReadyPromise) {
    const loader = $("#loader");
    const fill = $("#loader-fill");
    const pct = $("#loader-pct");
    if (!loader) { document.dispatchEvent(new CustomEvent("loader:done")); return; }

    lockBody();
    const t0 = performance.now();
    const MIN = REDUCED ? 300 : 1200;
    const MAX = 6000;

    /* دارایی‌های واقعی لودینگ: فونت + لوگو + عکس هیرو + ۶ عکس اول */
    const firstPhotos = Math.min(6, PHOTO_COUNT);
    const TOTAL = 2 + firstPhotos;   /* fonts+logo→۲ گروه، به‌علاوه‌ی عکس‌های اول */
    let doneCount = 0;
    let target = 6, shown = 0, done = false, raf = 0;

    const tickDone = () => {
      doneCount++;
      target = Math.min(100, 6 + (doneCount / TOTAL) * 94);
    };

    /* فونت */
    (document.fonts?.ready || Promise.resolve()).then(tickDone, tickDone);
    /* لوگو (هر دو فایل، خطا هم «تمام» حساب می‌شود) */
    Promise.resolve(logoReadyPromise).then(tickDone, tickDone);
    setTimeout(tickDone, 3200); /* سقف زمانی لوگو */
    /* عکس‌های اول کاروسل */
    photos.slice(0, firstPhotos).forEach((p) => {
      const im = new Image();
      im.onload = tickDone;
      im.onerror = tickDone;
      im.src = p.src;
    });

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      fill.style.width = "100%";
      pct.textContent = fa(100) + "٪";
      loader.classList.add("is-done");
      setTimeout(() => {
        loader.classList.add("is-out");
        unlockBody();
        document.body.classList.remove("is-loading");
        document.dispatchEvent(new CustomEvent("loader:done"));
        setTimeout(() => loader.remove(), 1400);
      }, REDUCED ? 40 : 360);
    };

    let last = t0, reached = 0;
    const tick = (now) => {
      const elapsed = now - t0;
      const dt = Math.min(80, now - last); last = now;
      if (target >= 100 && !reached) reached = now;
      const ceiling = target < 100 ? Math.min(target, 94) : 100;
      const k = target >= 100 ? 7 : 2.2;
      shown += (ceiling - shown) * (1 - Math.exp(-k * dt / 1000));
      if (target < 100) shown = Math.min(shown + dt / 1100, ceiling);  /* همیشه جلو، هرگز عقب نمی‌رود */
      const v = Math.round(shown);
      fill.style.width = v + "%";
      pct.textContent = fa(v) + "٪";
      const settled = shown > 99.2 || (reached && now - reached > 600);
      if (target >= 100 && settled && elapsed >= MIN) { finish(); return; }
      if (elapsed >= MAX) { finish(); return; }                        /* سقف اطمینان: گیر نکند */
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  /* ---------- اجرا ---------- */
  function boot() {
    syncRubika();
    const logoReady = initLogos();
    renderStats();
    initReveal();
    if (revealStart) {
      const startFn = revealStart;
      document.addEventListener("loader:done", startFn, { once: true });
      if (document.readyState === "complete") setTimeout(startFn, 6500);
    }
    initAnimPausing();
    initHero();
    initGallery();
    initNav();
    initTilt();
    initMagnetic();
    initCopyButtons();
    initFooterYear();
    initFpsGuard();
    initLoader(logoReady);
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
