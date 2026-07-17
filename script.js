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
      ".problem, .pipeline, .audience, .cta-band"
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
  });
})();
