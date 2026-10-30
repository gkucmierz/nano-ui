<script setup>
import { computed } from 'vue';
import KineticRotator from './KineticRotator.vue';
import NanoIcon from './NanoIcon.vue';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import { normalizeAngle } from '../utils/math.js';

const COLOR_MAP = {
  primary: 'var(--nano-accent-primary, #6366f1)',
  indigo: '#6366f1',
  cyan: 'var(--nano-state-active, #00f2fe)',
  purple: '#a855f7',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

const props = defineProps({
  /**
   * Current angle / numeric value (v-model)
   */
  modelValue: {
    type: Number,
    default: 0,
  },
  /**
   * Default angle restored on center reset click or Home key
   */
  defaultValue: {
    type: Number,
    default: 0,
  },
  /**
   * Minimum value
   */
  min: {
    type: Number,
    default: -360,
  },
  /**
   * Maximum value
   */
  max: {
    type: Number,
    default: 360,
  },
  /**
   * Step increment for keyboard arrows and snapping
   */
  step: {
    type: Number,
    default: 1,
  },
  /**
   * Allow continuous 360-degree wrap-around
   */
  wrap: {
    type: Boolean,
    default: true,
  },
  /**
   * Geodesic shortest-path kinematic interpolation
   */
  shortestPath: {
    type: Boolean,
    default: true,
  },
  /**
   * Angular offset in degrees (90 places 0° at 12 o'clock)
   */
  angleOffset: {
    type: Number,
    default: 90,
  },
  /**
   * Outer diameter in pixels
   */
  size: {
    type: Number,
    default: 56,
  },
  /**
   * Kinematic animation duration in ms (0 for instant)
   */
  duration: {
    type: Number,
    default: 300,
  },
  /**
   * Accent color preset ('primary', 'cyan', 'purple', 'emerald', 'amber', 'rose') or custom CSS color
   */
  color: {
    type: String,
    default: 'primary',
  },
  /**
   * Center hub mode: 'reset' (rotate icon button) | 'value' (live readout) | 'none'
   */
  centerMode: {
    type: String,
    default: 'reset',
  },
  /**
   * Unit suffix displayed in 'value' center mode
   */
  unit: {
    type: String,
    default: '°',
  },
  /**
   * Show cardinal/30° tick marks around the dial rim
   */
  showTicks: {
    type: Boolean,
    default: false,
  },
  /**
   * Disable interaction
   */
  disabled: {
    type: Boolean,
    default: false,
  },
  /**
   * Tooltip on the center reset hub button
   */
  resetTooltip: {
    type: String,
    default: '',
  },
  /**
   * Accessible label for the rotary knob
   */
  ariaLabel: {
    type: String,
    default: 'Rotary angle dial',
  },
});

const emit = defineEmits([
  'update:modelValue',
  'change',
  'reset',
  'dragStart',
  'dragEnd',
]);

const resolvedAccent = computed(() => {
  if (!props.color) return COLOR_MAP.primary;
  return COLOR_MAP[props.color] || props.color;
});

const hubSizePx = computed(() => {
  return Math.max(18, Math.round(props.size * 0.44));
});

const iconSizePx = computed(() => {
  return Math.max(11, Math.round(props.size * 0.25));
});

const markerHeightPx = computed(() => {
  return Math.max(6, Math.round(props.size * 0.15));
});

const markerWidthPx = computed(() => {
  return props.size >= 72 ? 4 : 3;
});

const displayValueText = computed(() => {
  const val = props.wrap ? Math.round(normalizeAngle(props.modelValue)) : Math.round(props.modelValue);
  return `${val}${props.unit}`;
});

const clampOrWrap = (nextVal) => {
  const stepVal = props.step > 0 ? Math.round(nextVal / props.step) * props.step : nextVal;
  if (props.wrap) {
    return Math.min(props.max, Math.max(props.min, Number(stepVal.toFixed(2))));
  }
  return Math.min(props.max, Math.max(props.min, Number(stepVal.toFixed(2))));
};

const updateAngle = (val) => {
  if (props.disabled) return;
  const next = clampOrWrap(val);
  emit('update:modelValue', next);
  emit('change', next);
};

const handleReset = () => {
  if (props.disabled) return;
  emit('update:modelValue', props.defaultValue);
  emit('change', props.defaultValue);
  emit('reset', props.defaultValue);
};

const handleKeyDown = (e) => {
  if (props.disabled) return;
  const mult = e.shiftKey ? 15 : 1;
  const delta = (props.step || 1) * mult;

  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault();
    updateAngle(props.modelValue + delta);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault();
    updateAngle(props.modelValue - delta);
  } else if (e.key === 'Home') {
    e.preventDefault();
    handleReset();
  }
};
</script>

<template>
  <div
    class="nano-knob"
    :class="{ 'is-disabled': disabled }"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      '--knob-accent': resolvedAccent,
    }"
    role="slider"
    :tabindex="disabled ? -1 : 0"
    :aria-label="ariaLabel"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="Math.round(modelValue)"
    :aria-disabled="disabled"
    @keydown="handleKeyDown"
    @dblclick="handleReset"
  >
    <!-- Optional 12-hour Rim Tick Marks -->
    <svg
      v-if="showTicks"
      class="nano-knob-ticks"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <line
        v-for="idx in 12"
        :key="idx"
        x1="50"
        y1="3"
        x2="50"
        :y2="idx % 3 === 1 ? 10 : 7"
        :class="{ 'is-cardinal': idx % 3 === 1 }"
        :transform="`rotate(${(idx - 1) * 30} 50 50)`"
      />
    </svg>

    <KineticRotator
      :model-value="modelValue"
      :interactive="!disabled"
      :wrap="wrap"
      :min="min"
      :max="max"
      :angle-offset="angleOffset"
      :size="size"
      :duration="duration"
      :shortest-path="shortestPath"
      @update:model-value="updateAngle"
      @drag-start="emit('dragStart', $event)"
      @drag-end="emit('dragEnd', $event)"
    >
      <template #default="{ isDragging }">
        <div
          class="nano-knob-plate"
          :class="{ 'is-dragging': isDragging }"
          :style="{ width: `${size}px`, height: `${size}px` }"
        >
          <div
            class="nano-knob-marker"
            :style="{
              width: `${markerWidthPx}px`,
              height: `${markerHeightPx}px`,
              left: `calc(50% - ${markerWidthPx / 2}px)`,
            }"
          />
        </div>
      </template>
    </KineticRotator>

    <!-- Non-rotating Center Hub (Reset Button or Live Value Readout) -->
    <button
      v-if="centerMode === 'reset'"
      type="button"
      class="nano-knob-hub is-interactive"
      :style="{ width: `${hubSizePx}px`, height: `${hubSizePx}px` }"
      :disabled="disabled"
      v-tooltip="resetTooltip || undefined"
      :aria-label="resetTooltip || `Reset to ${defaultValue}${unit}`"
      @pointerdown.stop
      @mousedown.stop
      @click.stop="handleReset"
    >
      <slot name="center">
        <NanoIcon name="rotate" :size="iconSizePx" />
      </slot>
    </button>

    <div
      v-else-if="centerMode === 'value'"
      class="nano-knob-hub is-value"
      :style="{ width: `${hubSizePx + 6}px`, height: `${hubSizePx + 6}px` }"
      @pointerdown.stop
      @click.stop="handleReset"
    >
      <slot name="center" :value="modelValue" :formatted="displayValueText">
        <span class="nano-knob-readout">{{ displayValueText }}</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.nano-knob {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  outline: none;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: box-shadow var(--nano-transition-interactive, 0.18s ease), opacity 0.18s ease;
}

.nano-knob:hover:not(.is-disabled),
.nano-knob:focus-visible:not(.is-disabled) {
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.2),
    0 0 12px color-mix(in srgb, var(--knob-accent) 38%, transparent);
}

.nano-knob:has(.is-dragging),
.nano-knob:active:not(.is-disabled) {
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.25),
    0 0 18px color-mix(in srgb, var(--knob-accent) 62%, transparent);
}

.nano-knob.is-disabled {
  opacity: 0.42;
  pointer-events: none;
}

.nano-knob-ticks {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  pointer-events: none;
  z-index: 0;
}

.nano-knob-ticks line {
  stroke: var(--nano-border-hover, rgba(148, 163, 184, 0.35));
  stroke-width: 1.5;
  stroke-linecap: round;
}

.nano-knob-ticks line.is-cardinal {
  stroke: var(--knob-accent);
  stroke-width: 2;
  opacity: 0.75;
}

.nano-knob-plate {
  border-radius: 50%;
  background: color-mix(in srgb, var(--nano-bg-card, #18181b) 84%, var(--knob-accent) 16%);
  border: 2px solid var(--nano-border-card, rgba(255, 255, 255, 0.16));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: grab;
  user-select: none;
  touch-action: none;
  box-sizing: border-box;
  transition: border-color var(--nano-transition-interactive, 0.18s ease);
}

.nano-knob:hover .nano-knob-plate,
.nano-knob:focus-visible .nano-knob-plate {
  border-color: var(--knob-accent);
}

.nano-knob-plate:active,
.nano-knob-plate.is-dragging {
  cursor: grabbing;
  border-color: var(--knob-accent);
}

.nano-knob-marker {
  position: absolute;
  top: 3px;
  background: var(--knob-accent);
  border-radius: 2px;
  box-shadow: 0 0 5px var(--knob-accent);
}

.nano-knob-hub {
  position: absolute;
  z-index: 3;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  background: var(--nano-bg-sidebar, #18181b);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--nano-text-main, #f8fafc);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.16));
  box-sizing: border-box;
  transition:
    background var(--nano-transition-interactive, 0.15s ease),
    border-color var(--nano-transition-interactive, 0.15s ease),
    color var(--nano-transition-interactive, 0.15s ease),
    transform 0.15s ease;
}

.nano-knob-hub.is-interactive {
  cursor: pointer;
}

.nano-knob-hub.is-interactive:hover {
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.12));
  border-color: var(--knob-accent);
  color: var(--knob-accent);
  transform: scale(1.06);
}

.nano-knob-hub.is-value {
  cursor: pointer;
}

.nano-knob-readout {
  font-family: var(--nano-font-mono, ui-monospace, monospace);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  color: var(--nano-text-main, #f8fafc);
}
</style>
