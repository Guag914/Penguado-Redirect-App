function handleScroll() {
  const elements = document.querySelectorAll(".fade-init");
  elements.forEach(el => {
    // Check if element is the navbar or inside it
    if (el.id === "penguado-nav" || el.closest("#penguado-nav")) {
      el.style.opacity = "1";  // ensure navbar stays visible
      return;                   // skip fade logic
    }

    const rect = el.getBoundingClientRect();

    if (rect.top < window.innerHeight - 100 && rect.bottom > -200) {
      el.classList.add("fade-in");
      el.classList.remove("fade-out");
    } else {
      el.classList.remove("fade-in");
      el.classList.add("fade-out");
    }
  });
}

// Attach scroll and load events
document.addEventListener("scroll", handleScroll);
window.addEventListener("load", handleScroll);
