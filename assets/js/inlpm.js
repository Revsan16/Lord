/**
 * INLPM — site behaviour.
 * Replaces the Dewi template's main.js. Tabs are handled here rather than by
 * Bootstrap, so the Bootstrap CSS and JS bundles are no longer loaded at all.
 */
(function () {
  "use strict";

  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Scroll reveals --------------------------------------------------
     .js is what arms the hidden state in CSS, so it is set here rather than
     in the stylesheet: if this script never runs, the page still renders. */
  var revealTargets = $$("[data-reveal]");

  if (revealTargets.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach(function (el) {
        el.classList.add("is-revealed");
      });
    } else {
      document.documentElement.classList.add("js");

      revealTargets.forEach(function (el) {
        var delay = el.getAttribute("data-reveal-delay");
        if (delay) el.style.setProperty("--reveal-delay", delay + "ms");
      });

      var revealObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
      );

      revealTargets.forEach(function (el) {
        revealObserver.observe(el);
      });
    }
  }

  /* --- Header: solid background once you leave the hero ---------------- */
  var header = $(".site-header");
  if (header) {
    var setHeaderState = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 60);
    };
    setHeaderState();
    window.addEventListener("scroll", setHeaderState, { passive: true });
  }

  /* --- Mobile navigation ---------------------------------------------- */
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

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.innerHTML = open
        ? '<i class="bi bi-x"></i>'
        : '<i class="bi bi-list"></i>';
    });

    // Close when a link is taken, and on Escape
    $$(".nav a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* --- Smooth scroll that clears the fixed header ---------------------- */
  var headerHeight = function () {
    return header ? header.offsetHeight : 0;
  };

  $$('a[href^="#"]').forEach(function (link) {
    var hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    link.addEventListener("click", function (e) {
      var target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      closeNav();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - headerHeight(),
        behavior: reduceMotion ? "auto" : "smooth"
      });
      history.replaceState(null, "", hash);
    });
  });

  /* --- Scrollspy: mark the nav link for the section you are reading ---- */
  var spyLinks = $$(".nav a[href^='#']").filter(function (a) {
    return document.getElementById(a.getAttribute("href").slice(1));
  });

  if (spyLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    spyLinks.forEach(function (a) {
      byId[a.getAttribute("href").slice(1)] = a;
    });

    var visible = new Set();
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        spyLinks.forEach(function (a) {
          a.classList.remove("active");
        });

        // Highest section currently on screen wins
        var current = Object.keys(byId).filter(function (id) {
          return visible.has(id);
        })[0];
        if (current) byId[current].classList.add("active");
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    Object.keys(byId).forEach(function (id) {
      spy.observe(document.getElementById(id));
    });
  }

  /* --- Back to top ----------------------------------------------------- */
  var toTop = $(".to-top");
  if (toTop) {
    var setTopState = function () {
      toTop.classList.toggle("is-visible", window.scrollY > 400);
    };
    setTopState();
    window.addEventListener("scroll", setTopState, { passive: true });
  }

  /* --- Tabs ------------------------------------------------------------ */
  $$("[data-tabs]").forEach(function (group) {
    var buttons = $$('[role="tab"]', group);
    if (!buttons.length) return;

    var select = function (button) {
      buttons.forEach(function (b) {
        var selected = b === button;
        b.setAttribute("aria-selected", String(selected));
        b.setAttribute("tabindex", selected ? "0" : "-1");
        var panel = document.getElementById(b.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
    };

    buttons.forEach(function (button, i) {
      button.addEventListener("click", function () {
        select(button);
      });

      // Left/right arrows move between tabs, per the ARIA tabs pattern
      button.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = buttons[(i + dir + buttons.length) % buttons.length];
        next.focus();
        select(next);
      });
    });

    select(
      buttons.filter(function (b) {
        return b.getAttribute("aria-selected") === "true";
      })[0] || buttons[0]
    );
  });

  /* --- The commitment ladder: hold the bars until they scroll in ------- */
  var ladder = $(".ladder");
  if (ladder && "IntersectionObserver" in window && !reduceMotion) {
    var bars = $$(".ladder-bar", ladder);
    bars.forEach(function (bar) {
      bar.style.animationPlayState = "paused";
    });

    var ladderObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          bars.forEach(function (bar, i) {
            bar.style.animationDelay = i * 90 + "ms";
            bar.style.animationPlayState = "running";
          });
          obs.disconnect();
        });
      },
      { threshold: 0.25 }
    );
    ladderObserver.observe(ladder);
  }

  /* --- Contact form -> WhatsApp ---------------------------------------
     The previous version of this declared `const email` twice inside one
     function, which is a SyntaxError. The whole inline script failed to
     parse, so sendMail() was never defined and the form did nothing when
     submitted. Rewritten here with proper encoding of the message body. */
  var contactForm = $(".js-contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = new FormData(contactForm);
      var value = function (key) {
        return String(data.get(key) || "").trim();
      };

      var body = [
        "Hi, this is " + value("name") + " (" + value("email") + ")",
        value("subject"),
        value("message")
      ]
        .filter(Boolean)
        .join("\n\n");

      var phone = contactForm.dataset.whatsapp || "919787111321";
      var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      var url =
        (isMobile ? "whatsapp://send?phone=" : "https://wa.me/") +
        (isMobile ? phone + "&text=" : phone + "?text=") +
        encodeURIComponent(body);

      if (isMobile) window.location.href = url;
      else window.open(url, "_blank", "noopener");
    });
  }

  /* --- Vendor initialisation ------------------------------------------- */
  if (typeof GLightbox === "function") {
    GLightbox({ selector: ".glightbox" });
  }

  if (typeof Swiper === "function") {
    if ($(".testimonials-slider")) {
      new Swiper(".testimonials-slider", {
        speed: 600,
        loop: true,
        autoplay: reduceMotion ? false : { delay: 6000, disableOnInteraction: false },
        slidesPerView: 1,
        pagination: { el: ".testimonials-slider .swiper-pagination", clickable: true }
      });
    }

    if ($(".gallery-slider")) {
      new Swiper(".gallery-slider", {
        speed: 500,
        loop: true,
        autoplay: reduceMotion ? false : { delay: 4500, disableOnInteraction: false },
        spaceBetween: 16,
        pagination: { el: ".gallery-slider .swiper-pagination", clickable: true },
        breakpoints: {
          0: { slidesPerView: 1.15 },
          640: { slidesPerView: 2.4 },
          992: { slidesPerView: 3.4 }
        }
      });
    }

    if ($(".meetings-slider")) {
      new Swiper(".meetings-slider", {
        speed: 600,
        loop: true,
        autoplay: reduceMotion ? false : { delay: 6000, disableOnInteraction: false },
        spaceBetween: 20,
        pagination: { el: ".meetings-slider .swiper-pagination", clickable: true },
        breakpoints: {
          0: { slidesPerView: 1.1 },
          768: { slidesPerView: 2 },
          1200: { slidesPerView: 3 }
        }
      });
    }
  }

})();
