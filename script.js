// Pulse landing page — small, dependency-free interaction layer.
// Each concern is a standalone function so pieces can be added/removed independently.

(function () {
  "use strict";

  /** Keep the footer copyright year current without a build step. */
  function setFooterYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /**
   * Fade + rise sections into view as they enter the viewport.
   * No-ops gracefully if IntersectionObserver isn't available.
   */
  function initScrollReveal() {
    const targets = document.querySelectorAll(
      ".problem, .pipeline, .demo, .audience, .cta-band"
    );
    if (!targets.length) return;

    targets.forEach((el) => el.classList.add("reveal"));

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /**
   * Turn the "Request access" form into a pre-filled mailto link.
   * The form's native `action="mailto:..."` is left in place as a fallback
   * for the rare case JS doesn't run — this just makes the common case
   * (JS enabled) produce a cleaner, subject-and-body-filled email.
   */
  function initAccessForm() {
    const form = document.getElementById("access-form");
    if (!form) return;

    const DEST = "cjacobs@perimity.io";

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const email = form.elements.email.value.trim();
      const subject = "Pulse waitlist signup";
      const body = `Requested by: ${email}`;

      const mailtoUrl =
        `mailto:${DEST}` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;

      window.location.href = mailtoUrl;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setFooterYear();
    initScrollReveal();
    initAccessForm();
    initDemo();
  });

  // ---------------------------------------------------------------------
  // Demo: scenario picker
  // ---------------------------------------------------------------------

  /** Minimal HTML-escaping for text pulled from the fetched JSON. */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /** Map a loss-ratio rating to the CSS class that colors its badge. */
  function ratingClass(rating) {
    const map = {
      Favorable: "rating-favorable",
      Moderate: "rating-moderate",
      Elevated: "rating-elevated",
      Adverse: "rating-adverse",
    };
    return map[rating] || "rating-moderate";
  }

  function renderDemoPanel(panel, data) {
    const signalsHtml = data.signals
      .map((s) => {
        const isGood = s.status === "good";
        return `
          <div class="signal-card ${isGood ? "is-good" : "is-warning"}">
            <div class="signal-card-title">
              <span class="signal-icon">${isGood ? "✔" : "⚠"}</span>
              <span>${escapeHtml(s.control)}</span>
            </div>
            <p class="signal-card-message">${escapeHtml(s.message)}</p>
          </div>
        `;
      })
      .join("");

    const insuranceHtml = data.insuranceSignals
      .map(
        (i) => `
          <div class="insurance-card">
            <p class="insurance-card-title">${escapeHtml(i.control)}</p>
            <p class="insurance-card-meta"><b>Risk:</b> ${escapeHtml(i.riskCategory)}</p>
            <p class="insurance-card-meta"><b>Exposure:</b> ${escapeHtml(i.claimExposure.join(", "))}</p>
          </div>
        `
      )
      .join("");

    panel.innerHTML = `
      <div class="demo-header">
        <div>
          <p class="demo-tenant-name">${escapeHtml(data.tenantName)}</p>
          <p class="demo-tenant-domain">${escapeHtml(data.tenantDomain)}</p>
        </div>
        <div class="demo-score-row">
          <span class="demo-score">${data.riskScore}<span style="font-size:1rem;color:var(--color-ink-soft);">/100</span></span>
          <span class="demo-rating ${ratingClass(data.lossRatio.rating)}">${escapeHtml(data.lossRatio.rating)} · ${escapeHtml(data.lossRatio.range)}</span>
        </div>
      </div>

      <div class="demo-summary">
        <p class="demo-summary-label">Underwriting read</p>
        <p class="demo-summary-text">${escapeHtml(data.aiSummary)}</p>
      </div>

      <p class="demo-subhead">Signals</p>
      <div class="demo-signals">${signalsHtml}</div>

      <p class="demo-subhead">Insurance exposure</p>
      <div class="demo-insurance">${insuranceHtml}</div>
    `;
  }

  function initDemo() {
    const picker = document.querySelector(".demo-picker");
    const panel = document.getElementById("demo-panel");
    if (!picker || !panel) return;

    const tabs = Array.from(picker.querySelectorAll(".demo-tab"));
    const cache = {};

    async function loadScenario(scenario) {
      tabs.forEach((t) => {
        const isActive = t.dataset.scenario === scenario;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", String(isActive));
      });

      panel.innerHTML = '<p class="demo-loading">Loading scenario…</p>';

      try {
        if (!cache[scenario]) {
          const res = await fetch(`assets/demo/pulse_output_${scenario}.json`);
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          cache[scenario] = await res.json();
        }
        renderDemoPanel(panel, cache[scenario]);
      } catch (err) {
        panel.innerHTML =
          '<p class="demo-error">Couldn\'t load this scenario right now. Please try again in a moment.</p>';
        console.error("Pulse demo: failed to load scenario", scenario, err);
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => loadScenario(tab.dataset.scenario));
    });

    // Load a default scenario on first render.
    loadScenario("strong");
  }
})();
