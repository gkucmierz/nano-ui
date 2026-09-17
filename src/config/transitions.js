/**
 * Nano UI - Motion & Transition Single Source of Truth (SSoT)
 *
 * All animation durations, easing curves, and logical component transition
 * definitions are centralized here to maintain consistent, predictable UI motion.
 */

export const durations = {
  instant: 100,
  fast: 150,
  normal: 200,
  toggle: 250,
  slow: 300,
  ripple: 600
};

export const easings = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  linear: 'linear'
};

export const transitions = {
  // Micro-interactions (buttons, links, copy icons, badges)
  interactive: {
    duration: durations.fast,
    ease: easings.standard,
    css: `${durations.fast}ms ${easings.standard}`
  },

  // Toggle & Switch controls (slider track, circle knob, indeterminate pill morph)
  toggle: {
    duration: durations.toggle,
    ease: easings.standard,
    css: `${durations.toggle}ms ${easings.standard}`
  },

  // Overlays & Floating tooltips
  tooltip: {
    duration: durations.normal,
    ease: easings.smooth,
    css: `${durations.normal}ms ${easings.smooth}`
  },

  // Layout & Sticky Mutating Header
  header: {
    duration: durations.normal,
    ease: easings.smooth,
    css: `${durations.normal}ms ${easings.smooth}`
  },

  // Data visualization (3D slices, leader lines, labels)
  chart: {
    duration: durations.toggle,
    ease: easings.standard,
    css: `${durations.toggle}ms ${easings.standard}`
  },

  // Modals & Dialogs
  modal: {
    backdrop: {
      duration: durations.toggle,
      ease: easings.easeOut,
      css: `${durations.toggle}ms ${easings.easeOut}`
    },
    enter: {
      duration: durations.slow,
      ease: easings.spring,
      css: `${durations.slow}ms ${easings.spring}`
    },
    leave: {
      duration: durations.normal,
      ease: easings.easeIn,
      css: `${durations.normal}ms ${easings.easeIn}`
    }
  },

  // Ripple effect (directive animation & removal timer)
  ripple: {
    duration: durations.ripple,
    ease: easings.linear,
    css: `${durations.ripple}ms ${easings.linear}`
  }
};

/**
 * CSS custom properties mapping for global `:root` injection or stylesheet consumption.
 */
export const transitionVariables = {
  '--nano-duration-fast': `${durations.fast}ms`,
  '--nano-duration': `${durations.normal}ms`,
  '--nano-duration-toggle': `${durations.toggle}ms`,
  '--nano-duration-slow': `${durations.slow}ms`,
  '--nano-duration-ripple': `${durations.ripple}ms`,

  '--nano-ease-standard': easings.standard,
  '--nano-ease-smooth': easings.smooth,
  '--nano-ease-spring': easings.spring,

  '--nano-transition-interactive': transitions.interactive.css,
  '--nano-transition-toggle': transitions.toggle.css,
  '--nano-transition-tooltip': transitions.tooltip.css,
  '--nano-transition-header': transitions.header.css,
  '--nano-transition-chart': transitions.chart.css,
  '--nano-transition-modal-backdrop': transitions.modal.backdrop.css,
  '--nano-transition-modal-enter': transitions.modal.enter.css,
  '--nano-transition-modal-leave': transitions.modal.leave.css,
  '--nano-transition-ripple': transitions.ripple.css
};

export default transitions;
