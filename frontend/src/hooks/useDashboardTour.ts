import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "selleasi:tour:dashboard:v1";

export function useDashboardTour() {
  function startTour(force = false) {
    if (!force && localStorage.getItem(STORAGE_KEY)) return;

    // Filter steps to only those whose target element exists in the DOM.
    // Driver.js throws if element is not found — we skip missing steps gracefully.
    const allSteps = [
      {
        element:  "[data-tour='store-switcher']",
        popover: {
          title:       "Your stores",
          description: "Switch between stores or create a new one here. Each store has its own products, orders, and analytics.",
          side:        "bottom" as const,
          align:       "start" as const,
        },
      },
      {
        element:  "[data-tour='create-btn']",
        popover: {
          title:       "Quick create",
          description: "Add a product or view your orders in one click.",
          side:        "bottom" as const,
          align:       "end" as const,
        },
      },
      {
        element:  "[data-tour='nav-dashboard']",
        popover: {
          title:       "Dashboard",
          description: "Your store's key metrics — revenue, orders, and performance at a glance.",
          side:        "right" as const,
        },
      },
      {
        element:  "[data-tour='nav-products']",
        popover: {
          title:       "Products",
          description: "Add, edit, and archive your product listings. Upload images and set prices here.",
          side:        "right" as const,
        },
      },
      {
        element:  "[data-tour='nav-orders']",
        popover: {
          title:       "Orders",
          description: "View and manage all customer orders. Update fulfillment status as items ship.",
          side:        "right" as const,
        },
      },
      {
        element:  "[data-tour='nav-inventory']",
        popover: {
          title:       "Inventory",
          description: "Track stock levels across your warehouse. Set reorder points to avoid running out.",
          side:        "right" as const,
        },
      },
      {
        element:  "[data-tour='nav-analytics']",
        popover: {
          title:       "Analytics",
          description: "Deep dive into revenue trends, product performance, and customer behaviour.",
          side:        "right" as const,
        },
      },
      {
        element:  "[data-tour='nav-payments']",
        popover: {
          title:       "Payments",
          description: "View your payment history and payout schedule.",
          side:        "right" as const,
        },
      },
    ];
    const steps = allSteps.filter(
      (s) => s.element && document.querySelector(s.element)
    );

    if (steps.length === 0) {
      console.warn("[Tour] No tour elements found in DOM. Add data-tour attributes.");
      return;
    }

    const d = driver({
      animate:          true,
      showProgress:     true,
      showButtons:      ["next", "previous", "close"],
      nextBtnText:      "Next →",
      prevBtnText:      "← Back",
      doneBtnText:      "Got it!",
      progressText:     "{{current}} / {{total}}",
      overlayOpacity:   0.55,
      stagePadding:     10,
      stageRadius:      6,
      popoverClass:     "selleasi-tour-popover",
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY, "1");
        d.destroy();
      },
      steps,
    });

    d.drive();
  }

  function resetTour() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { startTour, resetTour };
}