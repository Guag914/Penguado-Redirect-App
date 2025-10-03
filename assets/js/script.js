function handleScroll() {
  const elements = document.querySelectorAll("*:not(.penguado-nav):not(.penguado-nav *)");
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100 && rect.bottom > 0) {
      el.classList.add("fade-in");
      el.classList.remove("fade-out");
    } else {
      el.classList.remove("fade-in");
      el.classList.add("fade-out");
    }
  });
}

document.addEventListener("scroll", handleScroll);
window.addEventListener("load", handleScroll);
