// tooltip system: hover tooltips on desktop, long-press tooltips on touch devices.
// fully self-contained (no game state) — re-run refreshTooltips() after the DOM
// changes so newly added .tooltip-element nodes get their listeners.

export function refreshTooltips() {
  const tooltip = document.getElementById("tooltip");
  const tooltipTitle = document.getElementById("tooltip-title");
  const tooltipContent = document.getElementById("tooltip-content");
  const tooltipContentDeux = document.getElementById("tooltip-content-deux");
  const tooltipYieldRatio = document.getElementById("tooltip-rendement-ratio");
  const padding = 10;

  let suppressNextTap = false;

  document.addEventListener("touchstart", event => {
    if (!event.target.closest(".tooltip-element")) hideTooltip();
  }, { passive: true });

  document.querySelectorAll(".tooltip-element").forEach(element => {
    element.addEventListener("mouseover", event => {
      showTooltipFor(event.target);
      document.addEventListener("mousemove", updateTooltipPosition);
    });

    element.addEventListener("mouseout", () => {
      hideTooltip();
      document.removeEventListener("mousemove", updateTooltipPosition);
    });

    // touch devices: a long press shows the tooltip, a quick tap keeps its normal action
    let touchTimer = null;

    element.addEventListener("touchstart", event => {
      const touch = event.touches[0];
      const touchPoint = { pageX: touch.clientX, pageY: touch.clientY }; // clientX: the tooltip is position fixed
      touchTimer = setTimeout(() => {
        touchTimer = null;
        suppressNextTap = true;
        showTooltipFor(event.target);
        updateTooltipPosition(touchPoint);
      }, 450);
    }, { passive: true });

    element.addEventListener("touchmove", () => {
      clearTimeout(touchTimer);
      touchTimer = null;
    }, { passive: true });

    element.addEventListener("touchend", event => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      } else if (suppressNextTap) {
        suppressNextTap = false;
        event.preventDefault(); // long press: block the simulated click (no accidental purchase)
      }
    });
  });

  function showTooltipFor(target) {
    const { tooltipTitle: title, tooltipContent: content, tooltipContentDeux: contentDeux, tooltipYieldRatio: rendementRatio } = target.dataset;

    tooltipTitle.innerHTML = title || "";
    tooltipContent.innerHTML = content || "";
    tooltipContentDeux.innerHTML = contentDeux || "";
    tooltipYieldRatio.innerHTML = rendementRatio || "";

    tooltip.classList.add("visible");
  }

  function hideTooltip() {
    tooltip.classList.remove("visible");
    tooltip.classList.add("transparent");
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
