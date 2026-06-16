// golden-apple particle burst effect. pure DOM/animation, no game state.

function createParticle(x, y) {
  const particle = document.createElement('particle');
  document.body.appendChild(particle);

  let size = Math.floor(Math.random() * 15 + 10);
  let destinationX = (Math.random() - 0.5) * 150;
  let destinationY = (Math.random() - 0.5) * 150;
  let rotation = Math.random() * 520;
  let delay = Math.random() * 100;

  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.backgroundImage = 'url("assets/shop/golden-apple/golden-apple_1.webp")';

  const animation = particle.animate(
    [
      {
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(0deg)`,
        opacity: 1
      },
      {
        transform: `translate(-50%, -50%) translate(${x + destinationX}px, ${y + destinationY}px) rotate(${rotation}deg)`,
        opacity: 0
      }
    ],
    {
      duration: Math.random() * 800 + 500,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      delay: delay
    }
  );

  animation.onfinish = () => particle.remove();
}

// burst of particles around a clicked golden apple
export function pop(apple) {
  // decorative burst only: skip entirely under reduced motion (the apple's
  // bonus is granted separately by the caller, so nothing functional is lost)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const amount = 30;

  const rect = apple.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  if (x === 0 && y === 0) {
    for (let i = 0; i < amount; i++) {
      createParticle(x, y);
    }
  } else {
    for (let i = 0; i < amount; i++) {
      createParticle(x, y + window.scrollY);
    }
  }
}
