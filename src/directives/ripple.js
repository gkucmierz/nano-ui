const handleRippleClick = (e, el, binding) => {
  if (binding && binding.value === false) {
    return;
  }
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const circle = document.createElement('span');
  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${x - radius}px`;
  circle.style.top = `${y - radius}px`;
  circle.classList.add('ripple');

  // Allow custom color via directive value string
  if (binding && binding.value && typeof binding.value === 'string') {
    circle.style.backgroundColor = binding.value;
  }

  // Native browser event: cleans up automatically when CSS animation ends (100% SSoT in CSS)
  circle.addEventListener('animationend', () => circle.remove(), { once: true });

  el.appendChild(circle);
};

const Ripple = {
  mounted(el, binding) {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el._rippleBinding = binding;
    el._rippleHandler = (e) => handleRippleClick(e, el, el._rippleBinding);
    el.addEventListener('click', el._rippleHandler);
  },
  updated(el, binding) {
    el._rippleBinding = binding;
  },
  unmounted(el) {
    if (el._rippleHandler) {
      el.removeEventListener('click', el._rippleHandler);
      delete el._rippleHandler;
      delete el._rippleBinding;
    }
  },
};

export default Ripple;
