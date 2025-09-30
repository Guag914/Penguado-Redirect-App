// Penguado Template Script

// Animate dividers when scrolled into view
document.addEventListener("scroll", () => {
  const dividers = document.querySelectorAll(".divider");
  dividers.forEach(divider => {
    const rect = divider.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      divider.style.opacity = "1";
      divider.style.transform = "translateY(0)";
    }
  });
});

// Example button interaction
document.querySelectorAll(".button.html").forEach(btn => {
  btn.addEventListener("click", () => {
    alert("Penguado button clicked!");
  });
});
