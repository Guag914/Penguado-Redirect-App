function handleScroll() {
  const elements = document.querySelectorAll("*"); // universal, matches everything
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100 && rect.bottom > 0) {
      el.classList.add("fade-in");
    } else {
      el.classList.remove("fade-in"); // remove so it re-triggers when scrolled back
    }
  });
}

document.addEventListener("scroll", handleScroll);
window.addEventListener("load", handleScroll); // run on page load
