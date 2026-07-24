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
        // Three-tier signals (currently just EDR) carry an explicit
        // "tier" field for a finer-grained display than plain good/warning.
        if (s.tier) {
          const tierClass = { Strong: "is-strong", Moderate: "is-moderate", Weak: "is-weak" }[s.tier] || "is-warning";
          const tierIcon = { Strong: "✔", Moderate: "●", Weak: "✕" }[s.tier] || "⚠";
          return `
            <div class="signal-card ${tierClass}">
              <div class="signal-card-title">
                <span class="signal-icon">${tierIcon}</span>
                <span>${escapeHtml(s.control)}</span>
                <span class="signal-tier-label">${escapeHtml(s.tier)}</span>
              </div>
              <p class="signal-card-message">${escapeHtml(s.message)}</p>
            </div>
          `;
        }

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

  /**
   * Wires up the Identity/Endpoint/Human tabs above the signals grid.
   * Filters the already-fetched signal data client-side — no new
   * network request, just re-rendering the card grid for whichever
   * category is active.
   */
  function insuranceForCategory(data, cat) {
    const filtered = data.insuranceSignals.filter((i) => CONTROL_CATEGORY[i.control] === cat);
    return `
      <p class="demo-subhead">Insurance exposure</p>
      <div class="demo-insurance">${insuranceHtml(filtered)}</div>
    `;
  }

  function initSignalTabs(panel, allSignals, scenario, data, role) {
    const tabs = panel.querySelectorAll(".signal-tab");
    const grid = panel.querySelector("[data-all-signals]");
    const extra = panel.querySelector("[data-signal-tab-extra]");
    const insuranceContainer = panel.querySelector("[data-signal-tab-insurance]");
    if (!tabs.length || !grid) return;

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => {
          const isActive = t === tab;
          t.classList.toggle("is-active", isActive);
          t.setAttribute("aria-selected", String(isActive));
        });
        const cat = tab.dataset.sigcat;
        grid.innerHTML = signalsHtml(allSignals.filter((s) => CONTROL_CATEGORY[s.control] === cat));
        if (extra) {
          extra.innerHTML = cat === "human" ? buildTrainingChart(scenario, data) : "";
        }
        if (insuranceContainer) {
          insuranceContainer.innerHTML = insuranceForCategory(data, cat);
        }
      });
    });
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
    "EDR Adoption Rate": "Deploy EDR to the remaining unprotected endpoints.",
    "EDR Exclusions": "Review EDR exclusion rules and remove any that create bypass paths.",
    "EDR Definition Currency": "Update EDR definitions and enforce a regular update cadence.",
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

  /**
   * Category grouping is display-only — it re-derives category scores
   * from the same per-signal deduction weights already used to compute
   * the overall score, so the three category numbers always sum back
   * to the exact overall score. Nothing new is invented here.
   */
  const CONTROL_CATEGORY = {
    "Legacy Authentication": "identity",
    "Privileged Role MFA": "identity",
    "Excessive Privileged Roles": "identity",
    "Privileged Role Count": "identity",
    "Conditional Access Policies": "identity",
    "Conditional Access Exclusions": "identity",
    "EDR Adoption Rate": "endpoint",
    "EDR Exclusions": "endpoint",
    "EDR Definition Currency": "endpoint",
    "Security Awareness Training": "human",
  };

  const CONTROL_DEDUCTION = {
    "Legacy Authentication": 10,
    "Privileged Role MFA": 25,
    "Excessive Privileged Roles": 10,
    "Conditional Access Policies": 20,
    "Conditional Access Exclusions": 15,
    "EDR Adoption Rate": 15,
    "EDR Exclusions": 10,
    "EDR Definition Currency": 10,
    "Security Awareness Training": 20,
  };

  const CATEGORY_LABELS = {
    identity: "MFA",
    endpoint: "EDR",
    human: "Security Awareness",
  };

  const EDR_TIER_DEDUCTIONS = {
    "EDR Adoption Rate": { Strong: 0, Moderate: 8, Weak: 15 },
    "EDR Exclusions": { Strong: 0, Moderate: 5, Weak: 10 },
    "EDR Definition Currency": { Strong: 0, Moderate: 5, Weak: 10 },
  };

  function computeCategoryScores(signals) {
    const scores = { identity: 100, endpoint: 100, human: 100 };

    signals.forEach((s) => {
      const cat = CONTROL_CATEGORY[s.control];
      if (!cat) return;

      if (EDR_TIER_DEDUCTIONS[s.control]) {
        scores[cat] -= EDR_TIER_DEDUCTIONS[s.control][s.tier] || 0;
      } else if (s.status === "warning") {
        scores[cat] -= CONTROL_DEDUCTION[s.control] || 0;
      }
    });

    Object.keys(scores).forEach((k) => { scores[k] = Math.max(scores[k], 0); });
    return scores;
  }

  function categoryScoreClass(score) {
    if (score >= 80) return "is-good";
    if (score >= 50) return "is-moderate";
    return "is-weak";
  }

  function categoryScoresHtml(signals) {
    const scores = computeCategoryScores(signals);
    return `
      <div class="category-scores">
        ${Object.entries(scores)
          .map(
            ([key, score]) => `
              <div class="category-score-item ${categoryScoreClass(score)}">
                <span class="category-score-value">${score}</span>
                <span class="category-score-label">${CATEGORY_LABELS[key]}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderDemoPanel(panel, data, role, scenario) {
    const rating = data.lossRatio.rating;
    const ratingBadge =
      role === "underwriter"
        ? `${escapeHtml(rating)} · ${escapeHtml(data.lossRatio.range)}`
        : escapeHtml(rating);

    const header = `
      <div class="demo-header">
        <div>
          <p class="demo-tenant-name">${escapeHtml(data.tenantName)}</p>
          <p class="demo-tenant-domain">${escapeHtml(data.tenantDomain)}</p>
        </div>
        <div class="demo-score-row">
          <span class="demo-score">${data.riskScore}<span style="font-size:1rem;color:var(--color-ink-soft);">/100</span></span>
          <span class="demo-rating ${ratingClass(rating)}">${ratingBadge}</span>
        </div>
      </div>
    `;

    const signals = `
      <p class="demo-subhead">Signals</p>
      <div class="signal-tabs" role="tablist" aria-label="Signal category">
        <button class="signal-tab is-active" data-sigcat="identity" role="tab" aria-selected="true">MFA</button>
        <button class="signal-tab" data-sigcat="endpoint" role="tab" aria-selected="false">EDR</button>
        <button class="signal-tab" data-sigcat="human" role="tab" aria-selected="false">Security Awareness</button>
      </div>
      <div class="demo-signals" data-all-signals>${signalsHtml(data.signals.filter((s) => CONTROL_CATEGORY[s.control] === "identity"))}</div>
      <div data-signal-tab-extra></div>
      ${role === "underwriter" ? `<div data-signal-tab-insurance>${insuranceForCategory(data, "identity")}</div>` : ""}
    `;

    let html;

    if (role === "broker") {
      html = `
        ${header}
        ${categoryScoresHtml(data.signals)}
        <div class="demo-summary">
          <p class="demo-summary-label">How this positions you</p>
          <p class="demo-summary-text">${brokerSummary(data)}</p>
        </div>
        ${signals}
      `;
    } else if (role === "organization") {
      html = `
        ${header}
        ${categoryScoresHtml(data.signals)}
        <p class="demo-subhead">What to fix before renewal</p>
        ${organizationActions(data)}
        ${signals}
      `;
    } else {
      // Default: underwriter view — the original, decision-oriented layout.
      html = `
        ${header}
        ${categoryScoresHtml(data.signals)}
        <div class="demo-summary">
          <p class="demo-summary-label">Underwriting read</p>
          <p class="demo-summary-text">${escapeHtml(data.aiSummary)}</p>
        </div>
        ${signals}
      `;
    }

    panel.innerHTML = html;
    initSignalTabs(panel, data.signals, scenario, data, role);
  }

  /**
   * Fixture monthly training-completion data, one series per scenario.
   * Tells the same story as each scenario's Security Awareness Training
   * signal, just over time instead of as a single point-in-time boolean:
   * Strong and Weak both show "good" status (stable, current), Mixed
   * shows "warning" (attested once, nothing since — exactly the
   * recency problem a flat checkbox hides).
   */
  const TRAINING_TREND = {
    strong: [92, 94, 91, 95, 93, 96],
    mixed: [78, 82, 75, 40, 0, 0],
    weak: [85, 88, 90, 87, 91, 89],
  };
  const TRAINING_MONTH_LABELS = ["6mo", "5mo", "4mo", "3mo", "2mo", "Now"];

  function trainingBarColor(value) {
    if (value >= 70) return "var(--color-good)";
    if (value >= 40) return "var(--color-caution)";
    return "var(--color-risk)";
  }

  function buildTrainingChart(scenario, data) {
    const saSignal = data.signals.find((s) => s.control === "Security Awareness Training");
    const isWarning = saSignal && saSignal.status === "warning";

    if (!isWarning) {
      return `
        <p class="demo-subhead">Security Awareness training</p>
        <p class="demo-clean-state">Consistent completion every month for the last 6 months — nothing further to flag here.</p>
      `;
    }

    const values = TRAINING_TREND[scenario];
    if (!values) return "";

    const barWidth = 60;
    const gap = 30;
    const chartTop = 10;
    const baselineY = 110;
    const maxBarHeight = 100;

    const bars = values
      .map((v, i) => {
        const x = 45 + i * (barWidth + gap);
        const barHeight = Math.max((v / 100) * maxBarHeight, 2);
        const y = baselineY - barHeight;
        const color = trainingBarColor(v);
        return `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}" opacity="0.85"></rect>
          <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-family="var(--font-mono)" font-size="12" fill="var(--color-ink-soft)">${v}%</text>
          <text x="${x + barWidth / 2}" y="${baselineY + 20}" text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--color-ink-soft)">${TRAINING_MONTH_LABELS[i]}</text>
        `;
      })
      .join("");

    return `
      <p class="demo-subhead">Security Awareness training — last 6 months</p>
      <div class="training-chart">
        <svg viewBox="0 0 600 145" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Monthly security awareness training completion rate">
          <line x1="30" y1="${baselineY}" x2="570" y2="${baselineY}" stroke="var(--color-line)" stroke-width="1"></line>
          ${bars}
        </svg>
      </div>
    `;
  }

  const ROLE_VALUE_NOTES = {
    underwriter: "You get verified signal, not self-attested claims — decision-grade evidence for this submission.",
    broker: "You get a stronger story to bring to market — positioning and leverage, not just a checklist.",
    organization: "You get a clear list of exactly what to fix before your next renewal — no policy required.",
  };

  function initDemo() {
    const scenarioPicker = document.querySelector(".demo-picker");
    const rolePicker = document.querySelector(".role-picker");
    const panel = document.getElementById("demo-panel");
    const valueNote = document.getElementById("role-value-note");
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

      if (valueNote) {
        valueNote.textContent = ROLE_VALUE_NOTES[currentRole] || "";
      }

      panel.innerHTML = '<p class="demo-loading">Loading scenario…</p>';

      try {
        if (!cache[currentScenario]) {
          const res = await fetch(`assets/demo/pulse_output_${currentScenario}.json`);
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          cache[currentScenario] = await res.json();
        }
        renderDemoPanel(panel, cache[currentScenario], currentRole, currentScenario);
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
