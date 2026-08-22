/**
 * INLPM — site behaviour.
 * No framework, no jQuery, no Bootstrap, no Swiper, no AOS.
 * Everything here degrades: if this file never loads, the page still
 * renders and every link still works.
 */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supportsIO = "IntersectionObserver" in window;

  /* --- Scroll reveals ---------------------------------------------------
     .js arms the hidden state in CSS and is only ever set here, so a
     failed script can never leave the page blank. */
  var revealTargets = $$("[data-reveal]");

  if (revealTargets.length) {
    if (reduceMotion || !supportsIO) {
      revealTargets.forEach(function (el) { el.classList.add("is-revealed"); });
    } else {
      document.documentElement.classList.add("js");

      revealTargets.forEach(function (el) {
        var d = el.getAttribute("data-reveal-delay");
        if (d) el.style.setProperty("--reveal-delay", d + "ms");
      });

      var revealObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-revealed");
          obs.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });

      revealTargets.forEach(function (el) { revealObs.observe(el); });
    }
  }

  /* --- Header state ----------------------------------------------------- */
  var header = $(".site-header");
  if (header && !header.classList.contains("header-solid")) {
    var setHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    setHeader();
    window.addEventListener("scroll", setHeader, { passive: true });
  }

  /* --- Mobile navigation ------------------------------------------------ */
  var nav = $(".nav");
  var navToggle = $(".nav-toggle");

  var closeNav = function () {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.innerHTML = '<i class="bi bi-list"></i>';
    }
  };

  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.innerHTML = open
        ? '<i class="bi bi-x-lg" style="font-size:1.35rem"></i>'
        : '<i class="bi bi-list"></i>';
    });

    $$(".nav a").forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* --- Smooth scroll clearing the fixed header -------------------------- */
  var headerH = function () { return header ? header.offsetHeight : 0; };

  $$('a[href^="#"]').forEach(function (link) {
    var hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    link.addEventListener("click", function (e) {
      var target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      closeNav();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - headerH(),
        behavior: reduceMotion ? "auto" : "smooth"
      });
      history.replaceState(null, "", hash);
    });
  });

  /* --- Scrollspy -------------------------------------------------------- */
  var spyLinks = $$(".nav a[href^='#']").filter(function (a) {
    return document.getElementById(a.getAttribute("href").slice(1));
  });

  if (spyLinks.length && supportsIO) {
    var byId = {};
    spyLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });

    var seen = Object.create(null);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      spyLinks.forEach(function (a) { a.classList.remove("active"); });
      var current = Object.keys(byId).filter(function (id) { return seen[id]; })[0];
      if (current) byId[current].classList.add("active");
    }, { rootMargin: "-30% 0px -60% 0px" });

    Object.keys(byId).forEach(function (id) {
      spy.observe(document.getElementById(id));
    });
  }

  /* --- Back to top ------------------------------------------------------ */
  var toTop = $(".to-top");
  if (toTop) {
    var setTop = function () {
      toTop.classList.toggle("is-visible", window.scrollY > 500);
    };
    setTop();
    window.addEventListener("scroll", setTop, { passive: true });
  }

  /* --- Tabs (ARIA tabs pattern) ----------------------------------------- */
  $$("[data-tabs]").forEach(function (group) {
    var buttons = $$('[role="tab"]', group);
    if (!buttons.length) return;

    var select = function (button) {
      buttons.forEach(function (b) {
        var on = b === button;
        b.setAttribute("aria-selected", String(on));
        b.setAttribute("tabindex", on ? "0" : "-1");
        var panel = document.getElementById(b.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
    };

    buttons.forEach(function (button, i) {
      button.addEventListener("click", function () { select(button); });
      button.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = buttons[(i + dir + buttons.length) % buttons.length];
        next.focus();
        select(next);
      });
    });

    select(buttons.filter(function (b) {
      return b.getAttribute("aria-selected") === "true";
    })[0] || buttons[0]);
  });

  /* --- Commitment ladder: grow the bars when they scroll in ------------- */
  var ladder = $(".ladder");
  if (ladder) {
    if (reduceMotion || !supportsIO) {
      ladder.classList.add("is-revealed");
    } else {
      var ladderObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          ladder.classList.add("is-revealed");
          obs.disconnect();
        });
      }, { threshold: 0.2 });
      ladderObs.observe(ladder);
    }
  }

  /* --- Count-up statistics ----------------------------------------------
     Every number on the page is one the ministry can actually stand
     behind — years served, programmes run, locations taught, messages
     published. Nothing here is estimated. */
  var counters = $$("[data-count]");
  if (counters.length) {
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      if (isNaN(target)) return;
      var suffix = el.getAttribute("data-count-suffix") || "";

      if (reduceMotion) {
        el.textContent = target + suffix;
        return;
      }

      var dur = 1400;
      var start = null;
      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        // ease-out cubic
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);

      // If rAF never fires (background tab, throttling) don't leave a zero
      setTimeout(function () {
        if (el.textContent === "0" || el.textContent === "0" + suffix) {
          el.textContent = target + suffix;
        }
      }, dur + 600);
    };

    if (!supportsIO) {
      counters.forEach(runCount);
    } else {
      var countObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          runCount(e.target);
          obs.unobserve(e.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countObs.observe(el); });
    }
  }

  /* --- Click-to-load map -------------------------------------------------
     The Google Maps embed is close to a megabyte. On a phone on mobile
     data that is the heaviest thing on the page, so it only loads when
     somebody actually asks for it. */
  var mapBtn = $("[data-map-load]");
  if (mapBtn) {
    mapBtn.addEventListener("click", function () {
      var shell = mapBtn.closest(".map-shell");
      var src = mapBtn.getAttribute("data-map-load");
      if (!shell || !src) return;
      var frame = document.createElement("iframe");
      frame.src = src;
      frame.loading = "lazy";
      frame.title = "Map to New Life Prophetic Ministries, Coimbatore";
      frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      frame.allowFullscreen = true;
      shell.innerHTML = "";
      shell.appendChild(frame);
    });
  }

  /* --- WhatsApp forms ----------------------------------------------------
     Nothing POSTs anywhere — there is no backend. Each form composes a
     WhatsApp message and hands it to wa.me, which is how the ministry
     already takes enquiries. */
  var setError = function (field, message) {
    var input = $("input, textarea, select", field);
    var slot = $(".field-error", field);
    if (!input) return;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }
  };

  var validate = function (field) {
    var input = $("input, textarea, select", field);
    if (!input) return true;
    var value = input.value.trim();

    if (input.required && !value) {
      setError(field, "This one is needed.");
      return false;
    }
    if (input.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(field, "Check the email address.");
      return false;
    }
    if (input.type === "tel" && value && value.replace(/\D/g, "").length < 8) {
      setError(field, "Check the phone number.");
      return false;
    }
    setError(field, "");
    return true;
  };

  $$("form[data-whatsapp]").forEach(function (form) {
    var fields = $$(".field", form);

    fields.forEach(function (field) {
      var input = $("input, textarea, select", field);
      if (!input) return;
      input.addEventListener("blur", function () { validate(field); });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") validate(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var ok = true;
      var firstBad = null;
      fields.forEach(function (field) {
        if (!validate(field)) {
          ok = false;
          if (!firstBad) firstBad = $("input, textarea, select", field);
        }
      });

      if (!ok) {
        if (firstBad) firstBad.focus();
        return;
      }

      var button = $('button[type="submit"]', form);
      if (button) {
        button.disabled = true;
        button.dataset.label = button.innerHTML;
        button.innerHTML = "Opening WhatsApp…";
      }

      var data = new FormData(form);
      var lines = [form.getAttribute("data-intro") || "Hello INLPM,"];

      fields.forEach(function (field) {
        var input = $("input, textarea, select", field);
        var label = $("label", field);
        if (!input || !input.name) return;
        var value = String(data.get(input.name) || "").trim();
        if (!value) return;
        lines.push((label ? label.textContent.trim() + ": " : "") + value);
      });

      var phone = form.getAttribute("data-whatsapp");
      var text = encodeURIComponent(lines.join("\n"));
      var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        window.location.href = "whatsapp://send?phone=" + phone + "&text=" + text;
      } else {
        window.open("https://wa.me/" + phone + "?text=" + text, "_blank", "noopener");
      }

      setTimeout(function () {
        if (button) {
          button.disabled = false;
          button.innerHTML = button.dataset.label;
        }
      }, 2500);
    });
  });

  /* --- Lightbox --------------------------------------------------------- */
  if (typeof GLightbox === "function") {
    GLightbox({ selector: ".glightbox" });
  }
})();
