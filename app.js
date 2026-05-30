/**
 * Genesis Incubation Centre — interactions
 * Supabase: wire auth in initLoginForm() when ready.
 */

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const $ = (sel, root = document) => root.querySelector(sel);

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const rafThrottle = (fn) => {
  let id = 0;
  let args;
  return (...a) => {
    args = a;
    if (id) return;
    id = requestAnimationFrame(() => {
      id = 0;
      fn(...args);
    });
  };
};

/* Theme (toggle lives in sidebar only) */
function initTheme() {
  const root = document.documentElement;
  const label = $("[data-theme-label]");

  const apply = (theme, animate = true) => {
    const t = theme === "light" ? "light" : "dark";
    if (animate && !prefersReducedMotion()) {
      root.classList.add("theme-anim");
      setTimeout(() => root.classList.remove("theme-anim"), 450);
    }
    root.setAttribute("data-theme", t);
    if (label) label.textContent = t === "dark" ? "Dark" : "Light";
    try {
      localStorage.setItem("gic_theme", t);
    } catch (_) { }
  };

  let initial = "dark";
  try {
    const saved = localStorage.getItem("gic_theme");
    if (saved === "light" || saved === "dark") initial = saved;
  } catch (_) { }
  apply(initial, false);

  $("[data-theme-toggle]")?.addEventListener("click", () => {
    const cur = root.getAttribute("data-theme") || "dark";
    apply(cur === "dark" ? "light" : "dark");
  });
}

/* Fullscreen nav */
function initNav() {
  const shell = $("[data-nav-shell]");
  const openBtn = $("[data-nav-open]");
  if (!shell || !openBtn) return;

  let lastFocus = null;
  const setOpen = (open) => {
    shell.classList.toggle("is-open", open);
    shell.setAttribute("aria-hidden", open ? "false" : "true");
    openBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      lastFocus = document.activeElement;
      shell.querySelector("a, button")?.focus({ preventScroll: true });
    } else if (lastFocus?.focus) {
      lastFocus.focus({ preventScroll: true });
    }
  };

  openBtn.addEventListener("click", () => setOpen(true));
  $$("[data-nav-close]").forEach((el) => el.addEventListener("click", () => setOpen(false)));
  $$("[data-nav-link]").forEach((el) => el.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shell.classList.contains("is-open")) setOpen(false);
  });
}

/* Header */
function initHeader() {
  const header = $("[data-header]");
  if (!header) return;
  let lastY = window.scrollY;

  const onScroll = rafThrottle(() => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 16);
    if (y > 100 && y > lastY + 6) header.classList.add("is-hidden");
    else if (y < lastY - 6 || y < 60) header.classList.remove("is-hidden");
    lastY = y;
  });

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* Reveal */
function initReveal() {
  $$("[data-reveal-group]").forEach((g) => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          g.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(g);
  });

  const singles = $$("[data-reveal]");
  if (prefersReducedMotion()) {
    singles.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
  );
  singles.forEach((el) => io.observe(el));
}

/* Counters */
function initCounters() {
  const nodes = $$("[data-counter]");
  const run = (el) => {
    const to = Number(el.dataset.to || 0);
    const t0 = performance.now();
    const dur = 900;
    const tick = (t) => {
      const p = clamp01((t - t0) / dur);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = String(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (prefersReducedMotion()) {
    nodes.forEach((el) => (el.textContent = el.dataset.to || "0"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    },
    { threshold: 0.35 },
  );
  nodes.forEach((el) => io.observe(el));
}

/* Hero parallax (subtle) */
function initParallax() {
  const img = $("[data-parallax-img]");
  if (!img || prefersReducedMotion()) return;

  const onScroll = rafThrottle(() => {
    const y = window.scrollY;
    img.style.transform = `translate3d(0, ${y * 0.12}px, 0) scale(1.06)`;
  });
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* Process track — highlight active card on scroll */
function initProcess() {
  const track = $("[data-process-track]");
  const cards = $$("[data-process-step]", track || document);
  const bar = $("[data-process-bar]");
  const label = $("[data-process-label]");
  const titles = ["Brief & align", "Build & test", "Review", "Pilot"];

  if (!track || !cards.length) return;

  const setActive = (idx) => {
    cards.forEach((c, i) => c.classList.toggle("is-active", i === idx));
    if (bar) bar.style.width = `${((idx + 1) / cards.length) * 100}%`;
    if (label) label.textContent = titles[idx] ?? "";
  };

  if (prefersReducedMotion()) {
    setActive(0);
    return;
  }

  const onScroll = rafThrottle(() => {
    const rect = track.getBoundingClientRect();
    const center = window.innerWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;
      const dist = Math.abs(cardCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  });

  track.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  track.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (track.scrollWidth <= track.clientWidth + 2) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    },
    { passive: false },
  );
}

/* Contact form — full validation, loading, success/error
 * Future: replace simulateSubmit() body with Supabase insert.
 */
function initContactForm() {
  const form = $("[data-contact-form]");
  if (!form) return;

  const btn = form.querySelector("[data-contact-submit]");
  const msgEl = form.querySelector("[data-contact-msg]");
  if (!btn) return;

  const originalText = btn.textContent;

  /* --- helpers --- */
  const showMsg = (text, type) => {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = "contact-msg contact-msg-" + type;
  };

  const clearMsg = () => {
    if (!msgEl) return;
    msgEl.textContent = "";
    msgEl.className = "contact-msg";
  };

  const setLoading = (on) => {
    btn.disabled = on;
    btn.textContent = on ? "Sending…" : originalText;
  };

  const clearErrors = () => {
    form.querySelectorAll(".field.has-error").forEach((f) =>
      f.classList.remove("has-error")
    );
  };

  const markError = (input) => {
    const field = input.closest(".field");
    if (field) field.classList.add("has-error");
  };

  /* --- validate --- */
  const validate = () => {
    clearErrors();
    const name = form.elements.name?.value?.trim();
    const dept = form.elements.department?.value?.trim();
    const msg = form.elements.message?.value?.trim();
    let valid = true;
    const missing = [];

    if (!name) { markError(form.elements.name); missing.push("Name"); valid = false; }
    if (!dept) { markError(form.elements.department); missing.push("Department"); valid = false; }
    if (!msg)  { markError(form.elements.message); missing.push("Project summary"); valid = false; }

    if (!valid) {
      showMsg("Please fill in: " + missing.join(", ") + ".", "error");
    }
    return valid ? { name, department: dept, message: msg } : null;
  };

  /* --- submit (swap this body for Supabase later) --- */
  const simulateSubmit = async (data) => {
    /* Future Supabase:
     * const { error } = await supabase
     *   .from('contact_submissions')
     *   .insert([{ name: data.name, department: data.department, message: data.message }]);
     * if (error) throw new Error(error.message);
     */
    await new Promise((r) => setTimeout(r, 1200));
  };

  /* --- clear field errors on input --- */
  ["name", "department", "message"].forEach((n) => {
    const el = form.elements[n];
    if (el) {
      el.addEventListener("input", () => {
        const field = el.closest(".field");
        if (field) field.classList.remove("has-error");
        clearMsg();
      });
    }
  });

  /* --- handle submit --- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    const data = validate();
    if (!data) return;

    setLoading(true);
    try {
      await simulateSubmit(data);
      showMsg("Thank you! We\u2019ve received your submission and will be in touch soon.", "success");
      form.reset();
      clearErrors();
    } catch (err) {
      showMsg(err.message || "Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  });
}

function initYear() {
  const el = $("[data-year]");
  if (el) el.textContent = String(new Date().getFullYear());
}

function init() {
  initTheme();
  initNav();
  initHeader();
  initReveal();
  initCounters();
  initParallax();
  initProcess();
  initContactForm();
  initYear();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
