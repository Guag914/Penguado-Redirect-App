let lastScrollY = window.scrollY;

document.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  const direction = (currentScrollY > lastScrollY) ? "down" : "up";

  // Fade in all elements
  document.querySelectorAll("body *").forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // element is in viewport

      // reset animation so it can replay
      el.style.animation = "none";
      void el.offsetWidth; // force reflow

      if (direction === "down") {
        el.style.removeProperty("animation"); // uses *.show -> fadeIn
      } else {
        el.style.animation = "fadeInUp 1s ease forwards";
      }

      el.classList.add("show");
    } else {
      // remove show to allow re-triggering when re-entering
      el.classList.remove("show");
      el.style.removeProperty("animation");
    }
  });

  lastScrollY = currentScrollY;

  // Divider logic (keep your existing)
  const dividers = document.querySelectorAll(".divider");
  dividers.forEach(divider => {
    const rect = divider.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      divider.style.opacity = "1";
      divider.style.transform = "translateY(0)";
    }
  });
});

// Example button interaction (unchanged)
document.querySelectorAll(".button.html").forEach(btn => {
  btn.addEventListener("click", () => {
    alert("Penguado button clicked!");
  });
});
