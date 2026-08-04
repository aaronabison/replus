/* ==========================================================================
   REPLUS — shared interaction layer
   ========================================================================== */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("is-ready");
    initCursor();
    initPlusFields();
    initHeader();
    initMobileNav();
    initPageTransitions();
    initReveal();
    initHomeDemo();
    initFlipCards();
    initContactForm();
    initFaq();
    initDownloadPhone();
    initQr();
  });

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
      this.resize();
      window.addEventListener("resize", () => this.resize());
      if (finePointer) {
        canvas.parentElement.addEventListener("mousemove", (e) => {
          const r = canvas.getBoundingClientRect();
          this.pointer.x = e.clientX - r.left;
          this.pointer.y = e.clientY - r.top;
          this.pointer.active = true;
        });
        canvas.parentElement.addEventListener("mouseleave", () => { this.pointer.active = false; });
      }
      this.t = 0;
      if (!reduceMotion) requestAnimationFrame(() => this.tick());
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
      requestAnimationFrame(() => this.tick());
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
  }
  function initPlusFields() {
    document.querySelectorAll(".plus-field").forEach((c) => new PlusField(c));
  }

  /* ---------------- header scroll state ---------------- */
  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- mobile nav ---------------- */
  function initMobileNav() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.getElementById("mobileNav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => document.body.classList.remove("menu-open"));
    });
  }

  /* ---------------- page transitions ---------------- */
  function initPageTransitions() {
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || a.target === "_blank") return;
      if (!href.endsWith(".html")) return;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (reduceMotion) { window.location.href = href; return; }
        document.body.classList.add("is-leaving");
        setTimeout(() => { window.location.href = href; }, 300);
      });
    });
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
    new QRCode(el, {
      text: "https://replus.app/download",
      width: 108,
      height: 108,
      colorDark: "#000000",
      colorLight: "#ffffff",
    });
  }
})();
