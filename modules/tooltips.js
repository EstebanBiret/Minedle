// tooltip system: hover tooltips on desktop, long-press tooltips on touch devices.
// fully self-contained (no game state). uses event delegation wired ONCE, so
// dynamically-added .tooltip-element nodes work without re-binding — calling
// refreshTooltips() again is a safe no-op (it used to leak a listener per call).

let wired = false;

export function refreshTooltips() {
  if (wired) return; // delegated listeners already cover current and future nodes
  wired = true;

  const tooltip = document.getElementById("tooltip");
  const tooltipTitle = document.getElementById("tooltip-title");
  const tooltipContent = document.getElementById("tooltip-content");
  const tooltipContentDeux = document.getElementById("tooltip-content-deux");
  const tooltipYieldRatio = document.getElementById("tooltip-rendement-ratio");
  const padding = 10;

  let suppressNextTap = false;
  let touchTimer = null;
  let visible = false;

  // --- desktop: hover (delegated to document so new nodes are covered) ---
  document.addEventListener("mouseover", event => {
    const el = event.target.closest(".tooltip-element");
    if (el) showTooltipFor(el);
  });

  document.addEventListener("mouseout", event => {
    if (event.target.closest(".tooltip-element")) hideTooltip();
  });

  document.addEventListener("mousemove", event => {
    if (visible) updateTooltipPosition(event);
  });

  // --- keyboard: focusing a tooltip element shows its tooltip (Tab navigation) ---
  document.addEventListener("focusin", event => {
    const el = event.target.closest(".tooltip-element");
    if (!el) return;
    showTooltipFor(el);
    const rect = el.getBoundingClientRect(); // no mouse coords on focus: anchor to the element
    updateTooltipPosition({ pageX: rect.right, pageY: rect.top });
  });

  document.addEventListener("focusout", event => {
    if (event.target.closest(".tooltip-element")) hideTooltip();
  });

  // --- touch: a long press shows the tooltip, a quick tap keeps its normal action ---
  document.addEventListener("touchstart", event => {
    const el = event.target.closest(".tooltip-element");
    if (!el) { hideTooltip(); return; }

    const touch = event.touches[0];
    const touchPoint = { pageX: touch.clientX, pageY: touch.clientY }; // clientX: the tooltip is position fixed
    touchTimer = setTimeout(() => {
      touchTimer = null;
      suppressNextTap = true;
      showTooltipFor(el);
      updateTooltipPosition(touchPoint);
    }, 450);
  }, { passive: true });

  document.addEventListener("touchmove", () => {
    clearTimeout(touchTimer);
    touchTimer = null;
  }, { passive: true });

  document.addEventListener("touchend", event => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    } else if (suppressNextTap) {
      suppressNextTap = false;
      event.preventDefault(); // long press: block the simulated click (no accidental purchase)
    }
  });

  function showTooltipFor(target) {
    const { tooltipTitle: title, tooltipContent: content, tooltipContentDeux: contentDeux, tooltipYieldRatio: rendementRatio } = target.dataset;

    tooltipTitle.textContent = title || "";
    tooltipContent.textContent = content || "";
    tooltipContentDeux.textContent = contentDeux || "";
    tooltipYieldRatio.textContent = rendementRatio || "";

    tooltip.classList.add("visible");
    visible = true;
  }

  function hideTooltip() {
    tooltip.classList.remove("visible");
    tooltip.classList.add("transparent");
    visible = false;
  }

  function updateTooltipPosition(event) {
    const tooltipRect = tooltip.getBoundingClientRect();
    let newX = event.pageX + padding;
    let newY = event.pageY + padding;

    if (newX + tooltipRect.width > window.innerWidth) {
      newX = event.pageX - tooltipRect.width - padding;
    }
    if (newY + tooltipRect.height > window.innerHeight) {
      newY = event.pageY - tooltipRect.height - padding;
    }

    tooltip.style.left = `${newX}px`;
    tooltip.style.top = `${newY}px`;
    tooltip.classList.remove("transparent");
  }
}
