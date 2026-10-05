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


  /* --- Intro ------------------------------------------------------------
     The sword is drawn, then the commission appears. Runs once per session.
     .has-intro is set by an inline script in <head>, so without JavaScript
     the overlay never exists and the site is served whole.

     On sound: browsers refuse to play audio before the visitor has
     interacted with the page, so this cannot make noise on a cold load no
     matter how it is written. The control below is honest about that — it
     is off by default, remembers the choice, and the sound is synthesised
     with the Web Audio API rather than downloaded, so it costs nothing and
     licenses nothing. */
  var intro = $(".intro");
  if (intro && document.documentElement.classList.contains("has-intro")) {
    var SOUND_KEY = "inlpm-sound";
    var soundBtn = $(".intro-sound", intro);
    var skipBtn = $(".intro-skip", intro);
    var wantsSound = false;
    try { wantsSound = localStorage.getItem(SOUND_KEY) === "on"; } catch (e) {}

    var setSoundLabel = function () {
      if (!soundBtn) return;
      soundBtn.innerHTML =
        '<i class="bi bi-volume-' + (wantsSound ? "up" : "mute") + '-fill"></i>' +
        "<span>Sound " + (wantsSound ? "on" : "off") + "</span>";
      soundBtn.setAttribute("aria-pressed", String(wantsSound));
    };
    setSoundLabel();

    /* A blade leaving a scabbard: a bright metallic scrape that rises and
       falls away, over a low swell for weight. */
    var playSword = function () {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      var t = ctx.currentTime + 0.02;

      // Metallic scrape — filtered noise with a sweeping resonant band
      var len = Math.floor(ctx.sampleRate * 0.9);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);

      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 7;
      band.frequency.setValueAtTime(900, t);
      band.frequency.exponentialRampToValueAtTime(5200, t + 0.22);
      band.frequency.exponentialRampToValueAtTime(1400, t + 0.75);

      var ring = ctx.createBiquadFilter();
      ring.type = "peaking";
      ring.frequency.value = 3200;
      ring.gain.value = 9;

      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.32, t + 0.05);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

      noise.connect(band); band.connect(ring); ring.connect(ng); ng.connect(ctx.destination);

      // Low swell underneath
      var sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(48, t);
      sub.frequency.exponentialRampToValueAtTime(32, t + 1.2);
      var sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.exponentialRampToValueAtTime(0.16, t + 0.3);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      sub.connect(sg); sg.connect(ctx.destination);

      noise.start(t); noise.stop(t + 0.95);
      sub.start(t); sub.stop(t + 1.45);
      setTimeout(function () { if (ctx.close) ctx.close(); }, 2200);
    };

    var dismiss = function () {
      document.documentElement.classList.remove("has-intro");
      intro.remove();
      try { sessionStorage.setItem("inlpm-intro", "seen"); } catch (e) {}
    };

    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        wantsSound = !wantsSound;
        try { localStorage.setItem(SOUND_KEY, wantsSound ? "on" : "off"); } catch (e) {}
        setSoundLabel();
        // The click itself is the gesture that unlocks audio
        if (wantsSound) playSword();
      });
    }

    if (skipBtn) skipBtn.addEventListener("click", dismiss);
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape" && document.body.contains(intro)) {
        dismiss();
        document.removeEventListener("keydown", onEsc);
      }
    });

    // Timed to land with the glint
    if (wantsSound) setTimeout(playSword, 800);

    // Matches the CSS fade-out, plus a beat
    setTimeout(dismiss, 4400);
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

    /* A link like gallery.html#g-tir should open that tab, not the first
       one — the homepage place cards deep-link straight into a location. */
    var fromHash = null;
    if (window.location.hash) {
      var wanted = window.location.hash.slice(1);
      fromHash = buttons.filter(function (b) { return b.id === wanted; })[0] || null;
    }

    select(
      fromHash ||
      buttons.filter(function (b) {
        return b.getAttribute("aria-selected") === "true";
      })[0] ||
      buttons[0]
    );

    if (fromHash) {
      // Bring the panel into view under the fixed header
      setTimeout(function () {
        var top = group.getBoundingClientRect().top + window.scrollY - headerH() - 16;
        window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      }, 60);
    }
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

  /* The prayer form has data-whatsapp too, for its fallback, but it owns its
     own submit handler below — binding this one as well would send twice. */
  $$("form[data-whatsapp]:not(.js-prayer)").forEach(function (form) {
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

  /* --- Prayer request ---------------------------------------------------
     Two modes, chosen by data-endpoint:

       empty  -> compose a WhatsApp message, exactly as the other forms do.
                 This is the fallback, so the form keeps working before the
                 Worker exists and if it ever goes down.
       set    -> POST to the Worker, which relays into the team's Telegram
                 group. The visitor needs no app at all.

     The endpoint is read from the markup rather than hard-coded so the
     switch is a one-line HTML change, not a JS edit. */
  var prayer = $("form.js-prayer");
  if (prayer) {
    var endpoint = (prayer.getAttribute("data-endpoint") || "").trim();
    var note = $(".js-prayer-note", prayer);

    if (endpoint && note) {
      note.textContent =
        "The prayer team is notified straight away. Nothing is shown publicly.";
    }

    var fields = $$(".field", prayer);

    var gather = function () {
      var data = new FormData(prayer);
      var val = function (k) { return String(data.get(k) || "").trim(); };
      var anon = val("private") === "Yes";
      return {
        name: anon ? "(name withheld)" : val("name"),
        phone: val("phone"),
        about: val("about"),
        when: val("when"),
        need: val("need"),
        anonymous: anon
      };
    };

    var showSent = function () {
      var box = document.createElement("div");
      box.className = "form-sent";
      box.setAttribute("role", "status");
      box.innerHTML =
        '<i class="bi bi-check2-circle"></i>' +
        "<h3>Your request has reached the team</h3>" +
        "<p>They will pray over it, and someone will reply to you. " +
        "If it is urgent, you can also call the ministry.</p>";
      prayer.replaceWith(box);
      box.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    };

    prayer.addEventListener("submit", function (e) {
      e.preventDefault();

      var ok = true, firstBad = null;
      fields.forEach(function (f) {
        if (!validate(f)) {
          ok = false;
          if (!firstBad) firstBad = $("input, textarea, select", f);
        }
      });
      if (!ok) { if (firstBad) firstBad.focus(); return; }

      var button = $('button[type="submit"]', prayer);
      var restore = function () {
        if (!button) return;
        button.disabled = false;
        button.innerHTML = button.dataset.label;
      };
      if (button) {
        button.dataset.label = button.innerHTML;
        button.disabled = true;
        button.innerHTML = "Sending…";
      }

      var req = gather();

      if (!endpoint) {
        // WhatsApp fallback
        var lines = [
          prayer.getAttribute("data-intro") || "Prayer request:",
          "Name: " + req.name,
          "Phone: " + req.phone,
          "About: " + req.about,
          "How soon: " + req.when,
          "",
          req.need
        ];
        var phone = prayer.getAttribute("data-whatsapp");
        var text = encodeURIComponent(lines.join("\n"));
        var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) window.location.href = "whatsapp://send?phone=" + phone + "&text=" + text;
        else window.open("https://wa.me/" + phone + "?text=" + text, "_blank", "noopener");
        setTimeout(restore, 2500);
        return;
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req)
      })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          showSent();
        })
        .catch(function () {
          // Never lose a request because the relay is down — hand it to WhatsApp
          restore();
          if (note) {
            note.textContent =
              "We could not reach the team automatically. Opening WhatsApp so your request still gets through.";
          }
          var fb = [
            "Prayer request from the INLPM website:",
            "Name: " + req.name, "Phone: " + req.phone,
            "About: " + req.about, "How soon: " + req.when, "", req.need
          ].join("\n");
          window.open(
            "https://wa.me/" + prayer.getAttribute("data-whatsapp") +
            "?text=" + encodeURIComponent(fb),
            "_blank", "noopener"
          );
        });
    });
  }

  /* --- Simeon ------------------------------------------------------------
     A scripted assistant for the questions that have one correct answer:
     when we meet, where we are, how long a school runs. Deliberately not
     generative — a model could get the service time wrong, and this cannot.

     Anything pastoral is not answered here. It is handed to the prayer
     form or to a person on WhatsApp.

     Injects itself, so it appears on every page that loads this file. */
  (function () {
    if (document.querySelector(".simeon-launch")) return;

    var WA = "917708915274";
    var home = /\/(index\.html)?$/.test(location.pathname) ? "" : "index.html";

    var FACTS = {
      service:
        "<b>Sunday worship is 9:00 – 11:00 AM.</b><br>" +
        "The prayer meeting day is still being arranged, and the next School of " +
        "Prophets intake is not fixed yet — ask on WhatsApp and the office will tell you.",
      where:
        "We meet at <b>Second Floor, Murugan Bajaj Showroom, Vadamadurai, Coimbatore</b>." +
        '<br><a href="https://www.google.com/maps/search/?api=1&query=Murugan+Bajaj+Showroom+Vadamadurai+Coimbatore" target="_blank" rel="noopener">Open in Maps</a>',
      first:
        "Come a few minutes early and somebody will show you where to sit. " +
        "There is no dress code. Most of the meeting is in Tamil, with English alongside. " +
        "At the end you can come forward for prayer or stay in your seat — both are normal.",
      schools:
        "<b>School of Prophets</b> — 12 weeks<br>" +
        "<b>School of Healing</b> — 12 weeks<br>" +
        "<b>School of Power</b> — ongoing<br>" +
        "<b>Raising Young Leaders</b> — 15 weeks<br>" +
        "<b>Transforming Our Lives with Jesus</b> — 40 days<br>" +
        "<b>Empowering Our Lives with Jesus</b> — 10 days" +
        '<br><br><a href="' + home + '#schools">See the schools</a>',
      books:
        '<a href="22.html">As You Think, You Become</a> — fifty thoughts, free to read here.<br>' +
        '<a href="landc.html">You Are More Than a Human</a><br>' +
        "<i>Keys of Successful Life</i> — Tamil and English.",
      messages:
        "There are twenty-one messages on the site, and more on the channel." +
        '<br><a href="' + home + '#messages">Watch here</a> &middot; ' +
        '<a href="https://www.youtube.com/@prophetvinothkumar" target="_blank" rel="noopener">YouTube</a>',
      contact:
        "Phone or WhatsApp <b>+91 77089 15274</b>" +
        '<br><a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">Message on WhatsApp</a>' +
        '<br><a href="mailto:inlpm.ministries@gmail.com">inlpm.ministries@gmail.com</a>',
      prayer:
        "I don't answer prayer requests myself — the prayer team reads every one " +
        "and prays over it, and somebody replies to you personally." +
        '<br><br><a href="' + home + '#prayer">Send a prayer request</a>'
    };

    var CHIPS = [
      ["When do you meet?", "service"],
      ["Where are you?", "where"],
      ["My first visit", "first"],
      ["The schools", "schools"],
      ["Books", "books"],
      ["Messages", "messages"],
      ["Prayer request", "prayer"],
      ["Talk to someone", "contact"]
    ];

    // Keyword matching, longest intent first so "prayer meeting" beats "prayer"
    var MATCH = [
      ["service", /\b(service|sunday|time|timing|when|worship|meeting time|what time|hours)\b/i],
      ["where",   /\b(where|address|location|direction|map|reach|place|how to come)\b/i],
      ["first",   /\b(first|new|visit|expect|dress|wear|language|tamil|english)\b/i],
      ["schools", /\b(school|class|course|training|prophet|healing|power|join|enrol|enroll|admission|intake)\b/i],
      ["books",   /\b(book|read|think|become|human|keys)\b/i],
      ["messages",/\b(message|sermon|video|youtube|watch|preach)\b/i],
      ["prayer",  /\b(pray|prayer|request|need|sick|healing for|help me)\b/i],
      ["contact", /\b(contact|phone|call|number|whatsapp|email|talk|speak|someone)\b/i]
    ];

    var launch = document.createElement("button");
    launch.className = "simeon-launch";
    launch.type = "button";
    launch.setAttribute("aria-expanded", "false");
    launch.innerHTML = '<i class="bi bi-chat-heart-fill"></i> Ask Simeon';

    var panel = document.createElement("div");
    panel.className = "simeon-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Ask Simeon");
    panel.innerHTML =
      '<div class="simeon-head">' +
        '<img src="assets/img/brand/crest-mark.png?v=25" alt="">' +
        "<span><strong>Simeon</strong><span>INLPM &middot; here to help you find things</span></span>" +
        '<button class="simeon-close" type="button" aria-label="Close"><i class="bi bi-x-lg"></i></button>' +
      "</div>" +
      '<div class="simeon-log" role="log" aria-live="polite"></div>' +
      '<div class="simeon-chips"></div>' +
      '<form class="simeon-form">' +
        '<input type="text" aria-label="Ask a question" placeholder="Ask about times, place, schools…">' +
        '<button type="submit" aria-label="Send"><i class="bi bi-arrow-right"></i></button>' +
      "</form>";

    document.body.appendChild(launch);
    document.body.appendChild(panel);

    var log = $(".simeon-log", panel);
    var chips = $(".simeon-chips", panel);
    var form = $(".simeon-form", panel);
    var input = $("input", form);

    var say = function (html, who) {
      var m = document.createElement("div");
      m.className = "simeon-msg from-" + who;
      m.innerHTML = html;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    };

    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "simeon-chip";
      b.type = "button";
      b.textContent = c[0];
      b.addEventListener("click", function () {
        say(c[0], "you");
        setTimeout(function () { say(FACTS[c[1]], "bot"); }, 220);
      });
      chips.appendChild(b);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      say(q.replace(/[<>]/g, ""), "you");
      input.value = "";

      var key = null;
      for (var i = 0; i < MATCH.length; i++) {
        if (MATCH[i][1].test(q)) { key = MATCH[i][0]; break; }
      }
      setTimeout(function () {
        if (key) {
          say(FACTS[key], "bot");
        } else {
          say(
            "I only know the practical things — when we meet, where we are, the " +
            "schools, the books. For anything else the office will answer properly." +
            '<br><a href="https://wa.me/' + WA + '?text=' +
            encodeURIComponent(q) + '" target="_blank" rel="noopener">Ask on WhatsApp</a>',
            "bot"
          );
        }
      }, 220);
    });

    var open = function () {
      panel.hidden = false;
      launch.setAttribute("aria-expanded", "true");
      launch.style.display = "none";
      if (!log.children.length) {
        say(
          "Peace to you. I'm Simeon. I can tell you when we meet, where to find " +
          "us, and what the schools involve.<br><br>For prayer, I'll pass you " +
          "to the team — they read every request themselves.",
          "bot"
        );
      }
      input.focus();
    };

    var close = function () {
      panel.hidden = true;
      launch.style.display = "";
      launch.setAttribute("aria-expanded", "false");
      launch.focus();
    };

    launch.addEventListener("click", open);
    $(".simeon-close", panel).addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close();
    });
  })();

  /* --- Lightbox --------------------------------------------------------- */
  if (typeof GLightbox === "function") {
    GLightbox({ selector: ".glightbox" });
  }
})();
