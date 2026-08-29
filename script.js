/* ==========================================================================
   REPLUS — shared interaction layer
   ========================================================================== */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("is-ready");
    initCursor();          // once — lives outside <main>
    initHeader();          // once — lives outside <main>
    initMobileNav();       // once — lives outside <main>
    initPageTransitions(); // once — sets up delegated nav + overlay
    initMainWidgets();     // first run for whatever <main> starts with
  });

  /* Everything that only exists inside <main> gets re-run after every
     AJAX page swap. Nothing here binds to <header>/<footer>/mobile-nav,
     so it's safe to call repeatedly without double-binding anything. */
  function initMainWidgets() {
    destroyPlusFields();
    initPlusFields();
    initReveal();
    initHomeDemo();
    initFlipCards();
    initContactForm();
    initFaq();
    initDownloadPhone();
    initQr();
  }

  /* ---------------- custom cursor ---------------- */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    document.body.classList.add("has-cursor");

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    const plus = document.createElement("span");
    plus.className = "cursor-plus";
    plus.textContent = "+";
    ring.appendChild(plus);
    document.body.append(dot, ring);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    const hoverables = "a, button, input, textarea, .interactive, [data-cursor-hover]";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverables)) document.body.classList.add("cursor-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverables)) document.body.classList.remove("cursor-hover");
    });
  }

  /* ---------------- ambient plus-field canvas ---------------- */
  class PlusField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.gap = parseInt(canvas.dataset.gap || "46", 10);
      this.dark = canvas.dataset.tone === "dark";
      this.points = [];
      this.pointer = { x: -9999, y: -9999, active: false };
      this._raf = null;

      this._onResize = () => this.resize();
      this.resize();
      window.addEventListener("resize", this._onResize);

      if (finePointer) {
        this._onMove = (e) => {
          const r = canvas.getBoundingClientRect();
          this.pointer.x = e.clientX - r.left;
          this.pointer.y = e.clientY - r.top;
          this.pointer.active = true;
        };
        this._onLeave = () => { this.pointer.active = false; };
        canvas.parentElement.addEventListener("mousemove", this._onMove);
        canvas.parentElement.addEventListener("mouseleave", this._onLeave);
      }

      this.t = 0;
      if (!reduceMotion) this._raf = requestAnimationFrame(() => this.tick());
      else this.draw();
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.w = rect.width; this.h = rect.height;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.canvas.style.width = this.w + "px";
      this.canvas.style.height = this.h + "px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.points = [];
      const cols = Math.ceil(this.w / this.gap) + 1;
      const rows = Math.ceil(this.h / this.gap) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          this.points.push({
            x: i * this.gap,
            y: j * this.gap,
            seed: Math.random() * Math.PI * 2,
          });
        }
      }
      this.draw();
    }
    tick() {
      this.t += 0.016;
      this.draw();
      this._raf = requestAnimationFrame(() => this.tick());
    }
    draw() {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      const baseColor = this.dark ? "255,255,255" : "0,0,0";
      for (const p of this.points) {
        const dx = this.pointer.x - p.x;
        const dy = this.pointer.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 190;
        const influence = this.pointer.active ? Math.max(0, 1 - dist / radius) : 0;
        const drift = reduceMotion ? 0 : Math.sin(this.t * 0.6 + p.seed) * 0.15;
        const angle = influence > 0 ? Math.atan2(dy, dx) + Math.PI / 2 : drift;
        const scale = 0.55 + influence * 1.1 + (reduceMotion ? 0 : Math.sin(this.t + p.seed) * 0.05);
        const size = 5 + scale * 4;
        const alpha = this.dark
          ? 0.08 + influence * 0.5
          : 0.07 + influence * 0.45;
        const color = influence > 0.08
          ? `rgba(30,144,255,${Math.min(0.85, alpha + influence * 0.3)})`
          : `rgba(${baseColor},${alpha})`;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-size / 2, 0);
        ctx.lineTo(size / 2, 0);
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(0, size / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    destroy() {
      window.removeEventListener("resize", this._onResize);
      if (this._onMove) this.canvas.parentElement?.removeEventListener("mousemove", this._onMove);
      if (this._onLeave) this.canvas.parentElement?.removeEventListener("mouseleave", this._onLeave);
      if (this._raf) cancelAnimationFrame(this._raf);
    }
  }

  let plusFieldInstances = [];
  function initPlusFields() {
    document.querySelectorAll(".plus-field").forEach((c) => {
      plusFieldInstances.push(new PlusField(c));
    });
  }
  function destroyPlusFields() {
    plusFieldInstances.forEach((f) => f.destroy());
    plusFieldInstances = [];
  }

  /* ---------------- header scroll state ---------------- */
  function initHeader() {
    const onScroll = () => {
      // Query fresh every time — the header node itself gets swapped
      // during AJAX navigation, so a cached reference would go stale.
      const header = document.querySelector(".site-header");
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.__refreshHeaderScroll = onScroll;
  }

  /* ---------------- mobile nav ---------------- */
  function initMobileNav() {
    // Delegated on document: the .menu-toggle button lives inside <header>,
    // which gets its content replaced on every AJAX navigation, so a direct
    // listener on the button itself would be destroyed after one click.
    document.addEventListener("click", (e) => {
      const toggle = e.target.closest(".menu-toggle");
      if (toggle) {
        const open = document.body.classList.toggle("menu-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        return;
      }
      // Close the mobile menu when any link inside it is tapped
      if (e.target.closest("#mobileNav a")) {
        document.body.classList.remove("menu-open");
      }
    });
  }

  /* ---------------- page transitions (AJAX, no full reload) ---------------- */
  function initPageTransitions() {
    let overlay = document.getElementById("page-transition-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "page-transition-overlay";
      overlay.innerHTML = '<span class="page-transition-spinner"></span>';
      document.body.appendChild(overlay);

      const style = document.createElement("style");
      style.textContent = `
        #page-transition-overlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.6);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity .25s ease;
        }
        #page-transition-overlay.is-active {
          opacity: 1;
          visibility: visible;
          pointer-events: all;
        }
        .page-transition-spinner {
          width: 40px; height: 40px;
          border: 3px solid #1e90ff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: page-transition-spin .7s linear infinite;
        }
        @keyframes page-transition-spin { to { transform: rotate(360deg); } }
        body.is-transitioning > *:not(#page-transition-overlay) {
          filter: blur(4px);
          transition: filter .25s ease;
        }
      `;
      document.head.appendChild(style);
    }

    let busy = false;

    // ONE delegated listener on document. Works for every link, including
    // ones inside content swapped in later — never needs re-attaching.
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target.closest("a[href]");
      if (!a) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url;
      try { url = new URL(href, window.location.href); } catch (_) { return; }

      if (url.origin !== window.location.origin) return;
      if (!url.pathname.endsWith(".html")) return;
      if (url.href.split("#")[0] === window.location.href.split("#")[0]) { e.preventDefault(); return; }

      e.preventDefault();
      if (reduceMotion) { window.location.href = url.href; return; }
      if (busy) return;
      navigate(url.href, true);
    });

    window.addEventListener("popstate", () => {
      navigate(window.location.href, false);
    });

    function ensureScriptsLoaded(doc) {
      // Some pages (e.g. download.html) depend on a library <script src>
      // that sits outside <main>. Since we only splice in <main>, that tag
      // never reaches the live document on its own — load it here first.
      const wanted = Array.from(doc.querySelectorAll("script[src]")).map((s) => s.src);
      const have = new Set(Array.from(document.querySelectorAll("script[src]")).map((s) => s.src));
      const missing = wanted.filter((src) => !have.has(src));

      return Promise.all(
        missing.map(
          (src) =>
            new Promise((resolve) => {
              const s = document.createElement("script");
              s.src = src;
              s.onload = resolve;
              s.onerror = resolve; // don't block navigation if a library fails
              document.body.appendChild(s);
            })
        )
      );
    }

    function navigate(url, pushState) {
      busy = true;
      overlay.classList.add("is-active");
      document.body.classList.add("is-transitioning");

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const newMain = doc.querySelector("main");
          const oldMain = document.querySelector("main");
          if (!newMain || !oldMain) throw new Error("Missing <main>");

          const newHeader = doc.querySelector("header");
          const oldHeader = document.querySelector("header");
          const newMobileNav = doc.getElementById("mobileNav");
          const oldMobileNav = document.getElementById("mobileNav");

          return ensureScriptsLoaded(doc).then(() => {
            oldMain.innerHTML = newMain.innerHTML;

            // Swap the header's content so the destination page's own
            // active-link highlighting (aria-current) and any per-page
            // header differences come through. Keep the outer <header>
            // element itself and force the shared class on so a page
            // whose source is missing it doesn't lose the fixed-position
            // styling or scroll behavior.
            if (newHeader && oldHeader) {
              oldHeader.innerHTML = newHeader.innerHTML;
              oldHeader.classList.add("site-header");
            }
            if (newMobileNav && oldMobileNav) {
              oldMobileNav.innerHTML = newMobileNav.innerHTML;
            }

            document.title = doc.title;

            if (pushState) window.history.pushState({}, "", url);
            window.scrollTo(0, 0);

            // Header was just replaced — re-check its scrolled state
            // immediately instead of waiting for the next scroll event.
            if (window.__refreshHeaderScroll) window.__refreshHeaderScroll();

            initMainWidgets();
          });
        })
        .catch((err) => {
          console.error("[page transition] falling back to full load:", err);
          window.location.href = url;
        })
        .finally(() => {
          overlay.classList.remove("is-active");
          document.body.classList.remove("is-transitioning");
          busy = false;
        });
    }
  }

  /* ---------------- scroll reveal ---------------- */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => io.observe(el));
  }

  /* ---------------- home: live "replus" demo ---------------- */
  function initHomeDemo() {
    const btn = document.querySelector("[data-replus-btn]");
    if (!btn) return;
    const countEl = document.querySelector("[data-replus-count]");
    let count = parseInt(countEl.textContent, 10);
    btn.addEventListener("click", () => {
      const active = btn.classList.toggle("active");
      count += active ? 1 : -1;
      countEl.textContent = count;
      btn.querySelector(".label").textContent = active ? "Replus'd" : "Replus";
      if (active && !reduceMotion) spawnBurst(btn);
    });
  }
  function spawnBurst(btn) {
    const burst = document.createElement("div");
    burst.className = "burst";
    const rect = btn.getBoundingClientRect();
    const parentRect = btn.closest(".demo-card").getBoundingClientRect();
    burst.style.left = (rect.left - parentRect.left + 18) + "px";
    burst.style.top = (rect.top - parentRect.top) + "px";
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span");
      s.textContent = "+";
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
      const dist = 30 + Math.random() * 26;
      s.style.setProperty("--tx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--ty", -Math.abs(Math.sin(angle) * dist) - 10 + "px");
      burst.appendChild(s);
    }
    btn.closest(".demo-card").appendChild(burst);
    setTimeout(() => burst.remove(), 850);
  }

  /* ---------------- team: flip cards (touch support) ---------------- */
  function initFlipCards() {
    document.querySelectorAll(".flip-card").forEach((card) => {
      card.addEventListener("click", () => {
        if (!finePointer) card.classList.toggle("is-flipped");
      });
    });
  }

  /* ---------------- contact: form validation ---------------- */
  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const status = document.getElementById("formStatus");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      const name = form.querySelector("#name");
      const email = form.querySelector("#email");
      const message = form.querySelector("#message");

      valid = validateField(name, name.value.trim().length > 1, "Tell us your name.") && valid;
      valid = validateField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), "Enter a valid email.") && valid;
      valid = validateField(message, message.value.trim().length > 8, "A few more words would help.") && valid;

      if (!valid) return;

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.textContent = "Sending…";
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.textContent = "Message queued";
        status.classList.add("is-shown");
        status.innerHTML = '<span class="dot"></span> Thanks — this is a front-end demo, so nothing was actually sent. Connect a form endpoint to go live.';
        form.reset();
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send message";
        }, 2200);
      }, 700);
    });

    form.querySelectorAll("input, textarea").forEach((el) => {
      el.addEventListener("input", () => el.closest(".field").classList.remove("has-error"));
    });
  }
  function validateField(el, isValid, message) {
    const field = el.closest(".field");
    field.classList.toggle("has-error", !isValid);
    const err = field.querySelector(".field-error");
    if (err) err.textContent = message;
    return isValid;
  }

  /* ---------------- contact: faq accordion ---------------- */
  function initFaq() {
    document.querySelectorAll(".faq-item").forEach((item) => {
      const q = item.querySelector(".faq-q");
      const a = item.querySelector(".faq-a");
      q.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        item.closest(".faq").querySelectorAll(".faq-item").forEach((other) => {
          other.classList.remove("is-open");
          other.querySelector(".faq-a").style.maxHeight = 0;
        });
        if (!isOpen) {
          item.classList.add("is-open");
          a.style.maxHeight = a.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------------- download: phone screen carousel ---------------- */
  function initDownloadPhone() {
    const slides = document.querySelectorAll(".screen-slide");
    const dots = document.querySelectorAll(".phone-dot");
    if (!slides.length) return;
    let i = 0;
    function show(idx) {
      slides.forEach((s, n) => s.classList.toggle("is-active", n === idx));
      dots.forEach((d, n) => d.classList.toggle("is-active", n === idx));
      i = idx;
    }
    dots.forEach((d, n) => d.addEventListener("click", () => { show(n); resetTimer(); }));
    show(0);
    let timer;
    function resetTimer() {
      clearInterval(timer);
      if (reduceMotion) return;
      timer = setInterval(() => show((i + 1) % slides.length), 3200);
    }
    resetTimer();
  }

  /* ---------------- download: real QR code ---------------- */
  function initQr() {
    const el = document.getElementById("qrcode");
    if (!el || typeof QRCode === "undefined") return;
    el.innerHTML = "";
    new QRCode(el, {
      text: "https://replus.one/download",
      width: 108,
      height: 108,
      colorDark: "#000000",
      colorLight: "#ffffff",
    });
  }
})();
