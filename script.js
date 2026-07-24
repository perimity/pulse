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
   * Submit the "Join the waitlist" form to a Google Apps Script Web App,
   * which appends the email to a Google Sheet you own. Body is sent as a
   * plain string (not application/json) on purpose — that keeps the
   * request in the CORS "simple request" category so the browser doesn't
   * send a preflight OPTIONS request, which Apps Script Web Apps don't
   * handle. mode: "no-cors" means we can't read the response back (Google
   * doesn't send CORS headers on Apps Script responses), so we can't truly
   * confirm success client-side — we optimistically show a thank-you state
   * and rely on checking the Sheet directly to verify submissions arrive.
   */
  function initAccessForm() {
    const form = document.getElementById("access-form");
    if (!form) return;

    // Replace with the Web App URL from Deploy > New deployment in Apps Script.
    const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxPaRBngzyd_WYvNpyAbi_6Jmj42ZfncwoY7aNBVPfZcnuPImHNv-TINB_L-6Do1G4AUA/exec";

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const email = form.elements.email.value.trim();
      const submitBtn = form.querySelector("button[type=submit]");
      const originalLabel = submitBtn.textContent;

      submitBtn.disabled = true;
      submitBtn.textContent = "Joining…";

      fetch(SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ email }),
      })
        .catch((err) => {
          // no-cors means most failures are invisible to JS anyway; this
          // only catches network-level failures (e.g. offline).
          console.error("Pulse waitlist: submission failed", err);
        })
        .finally(() => {
          form.innerHTML = '<p class="cta-success">You\'re on the list — we\'ll be in touch.</p>';
        });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setFooterYear();
    initScrollReveal();
    initAccessForm();
    initDemo();
  });

  // ---------------------------------------------------------------------
  // Demo: scenario + role pickers
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

  function signalsHtml(signals) {
    return signals
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
  }

  function insuranceHtml(insuranceSignals) {
    return insuranceSignals
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
  }

  /**
   * Turns a warning signal's message into a plain "what to fix" action,
   * for the Organization view. Keyed by control name so it works across
   * any scenario without depending on exact wording.
   */
  const REMEDIATION_MAP = {
    "Legacy Authentication": "Disable legacy authentication protocols across the tenant.",
    "Privileged Role MFA": "Require MFA for every privileged role, not just some.",
    "Excessive Privileged Roles": "Reduce the number of standing privileged role assignments.",
    "Conditional Access Policies": "Implement conditional access policies to govern sign-in risk.",
    "Conditional Access Exclusions": "Review and tighten conditional access exclusions to close bypass paths.",
    "Security Awareness Training": "Stand up a documented, dated security awareness training program.",
  };

  /** Builds the Broker-framed summary: leads with strengths, flags gaps as what to fix before marketing the risk. */
  function brokerSummary(data) {
    const warnings = data.signals.filter((s) => s.status === "warning");
    const goods = data.signals.filter((s) => s.status === "good");

    if (warnings.length === 0) {
      return "Every control checks out here — a clean story to bring to market, likely to draw broad carrier interest without much back-and-forth.";
    }

    const strengths = goods.slice(0, 2).map((s) => s.control).join(", ");
    const gaps = warnings.map((s) => s.control).join(", ");
    const strengthsPart = strengths
      ? `This account leads with strong ${strengths} — a solid foundation to market with. `
      : "";

    return `${strengthsPart}Before shopping this risk, it's worth addressing: ${gaps}. Gaps like this are often what separates a single quote from a competitive field.`;
  }

  /** Builds the Organization-framed action list from warning signals. */
  function organizationActions(data) {
    const warnings = data.signals.filter((s) => s.status === "warning");

    if (warnings.length === 0) {
      return '<p class="demo-clean-state">Nice work — every control checked here is in good shape. Keep it that way heading into renewal.</p>';
    }

    const items = warnings
      .map((s, i) => {
        const action = REMEDIATION_MAP[s.control] || s.message;
        return `
          <div class="action-item">
            <span class="action-item-marker">${i + 1}</span>
            <p class="action-item-text">${escapeHtml(action)}</p>
          </div>
        `;
      })
      .join("");

    return `<div class="demo-actions">${items}</div>`;
  }

  function renderDemoPanel(panel, data, role) {
    const header = `
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
    `;

    const signals = `
      <p class="demo-subhead">Signals</p>
      <div class="demo-signals">${signalsHtml(data.signals)}</div>
    `;

    if (role === "broker") {
      panel.innerHTML = `
        ${header}
        <div class="demo-summary">
          <p class="demo-summary-label">How this positions you</p>
          <p class="demo-summary-text">${brokerSummary(data)}</p>
        </div>
        ${signals}
      `;
      return;
    }

    if (role === "organization") {
      panel.innerHTML = `
        ${header}
        <p class="demo-subhead">What to fix before renewal</p>
        ${organizationActions(data)}
        ${signals}
      `;
      return;
    }

    // Default: underwriter view — the original, decision-oriented layout.
    panel.innerHTML = `
      ${header}
      <div class="demo-summary">
        <p class="demo-summary-label">Underwriting read</p>
        <p class="demo-summary-text">${escapeHtml(data.aiSummary)}</p>
      </div>
      ${signals}
      <p class="demo-subhead">Insurance exposure</p>
      <div class="demo-insurance">${insuranceHtml(data.insuranceSignals)}</div>
    `;
  }

  function initDemo() {
    const scenarioPicker = document.querySelector(".demo-picker");
    const rolePicker = document.querySelector(".role-picker");
    const panel = document.getElementById("demo-panel");
    if (!scenarioPicker || !rolePicker || !panel) return;

    const scenarioTabs = Array.from(scenarioPicker.querySelectorAll(".demo-tab"));
    const roleTabs = Array.from(rolePicker.querySelectorAll(".role-tab"));
    const cache = {};

    let currentScenario = "strong";
    let currentRole = "underwriter";

    async function render() {
      scenarioTabs.forEach((t) => {
        const isActive = t.dataset.scenario === currentScenario;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", String(isActive));
      });
      roleTabs.forEach((t) => {
        const isActive = t.dataset.role === currentRole;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", String(isActive));
      });

      panel.innerHTML = '<p class="demo-loading">Loading scenario…</p>';

      try {
        if (!cache[currentScenario]) {
          const res = await fetch(`assets/demo/pulse_output_${currentScenario}.json`);
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          cache[currentScenario] = await res.json();
        }
        renderDemoPanel(panel, cache[currentScenario], currentRole);
      } catch (err) {
        panel.innerHTML =
          '<p class="demo-error">Couldn\'t load this scenario right now. Please try again in a moment.</p>';
        console.error("Pulse demo: failed to load scenario", currentScenario, err);
      }
    }

    scenarioTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        currentScenario = tab.dataset.scenario;
        render();
      });
    });

    roleTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        currentRole = tab.dataset.role;
        render();
      });
    });

    render();
  }
})();
