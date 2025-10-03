let lastScrollY = window.scrollY;

document.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  const direction = (currentScrollY > lastScrollY) ? "down" : "up";

  document.querySelectorAll("body *").forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // set animation direction via CSS variable
      el.style.setProperty('--fadeAnim', direction === 'down' ? 'fadeIn' : 'fadeInUp');

      // remove and re-add .show to restart animation
      el.classList.remove('show');
      void el.offsetWidth; // force reflow
      el.classList.add('show');
    } else {
      el.classList.remove('show');
    }
  });

  lastScrollY = currentScrollY;

  // Divider logic (keep existing)
  const dividers = document.querySelectorAll(".divider");
  dividers.forEach(divider => {
    const rect = divider.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      divider.style.opacity = "1";
      divider.style.transform = "translateY(0)";
    }
  });
});
