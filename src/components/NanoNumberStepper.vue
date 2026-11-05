<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { clamp, countStepDecimals } from '../utils/math.js'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  },
  /**
   * 'stacked': Both Up/Down buttons stacked on the right (50% height each)
   * 'split': Glued Decrement (-) on the left and Increment (+) on the right
   */
  variant: {
    type: String,
    default: 'stacked',
    validator: (v) => ['stacked', 'split'].includes(v)
  },
  min: {
    type: Number,
    default: -Infinity
  },
  max: {
    type: Number,
    default: Infinity
  },
  step: {
    type: Number,
    default: 1
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  /**
   * Semantic color preset (matching Nano UI buttons) or custom CSS color:
   * 'primary' | 'success' | 'danger' | 'active' | 'secondary' | 'ghost'
   * (also supports 'warn' | 'info' | 'purple' or any raw CSS color/var)
   */
  color: {
    type: String,
    default: 'secondary'
  },
  width: {
    type: [String, Number],
    default: undefined
  },
  align: {
    type: String,
    default: 'left'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  wheelStep: {
    type: Boolean,
    default: true
  },
  prefix: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  },
  decrementLabel: {
    type: String,
    default: ''
  },
  incrementLabel: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: 'Numeric value'
  },
  decrementAriaLabel: {
    type: String,
    default: 'Decrease value'
  },
  incrementAriaLabel: {
    type: String,
    default: 'Increase value'
  },
  id: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  }
})

let stepperUidSeq = 0

const emit = defineEmits(['update:modelValue', 'change'])

const autoId = `nano-stepper-${++stepperUidSeq}`
const resolvedId = computed(() => props.id || autoId)
const resolvedName = computed(() => props.name || resolvedId.value)

const inputRef = ref(null)
const isFocused = ref(false)
let holdTimeout = null
let holdInterval = null

const stepDecimals = computed(() => countStepDecimals(props.step))

const clampAndRound = (raw) => {
  const num = Number(raw)
  if (!Number.isFinite(num)) return props.modelValue
  const clamped = clamp(num, props.min, props.max)
  const dec = stepDecimals.value
  return dec > 0 ? Number(clamped.toFixed(dec)) : Math.round(clamped)
}

const displayValue = computed(() => {
  return Number.isFinite(props.modelValue) ? props.modelValue : 0
})

const isAtMin = computed(() => Number.isFinite(props.min) && props.modelValue <= props.min)
const isAtMax = computed(() => Number.isFinite(props.max) && props.modelValue >= props.max)

const PRESET_COLORS = new Set([
  'primary',
  'success',
  'danger',
  'active',
  'secondary',
  'ghost',
  'warn',
  'info',
  'purple'
])

const presetColorClass = computed(() => {
  const c = (props.color || 'secondary').trim()
  return PRESET_COLORS.has(c) ? `color-${c}` : 'color-custom'
})

const rootStyle = computed(() => {
  const style = {}
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  const c = (props.color || '').trim()
  if (c && !PRESET_COLORS.has(c)) {
    style['--nano-stepper-color'] = c
  }
  return Object.keys(style).length ? style : undefined
})

const commitValue = (nextVal) => {
  const clean = clampAndRound(nextVal)
  if (clean !== props.modelValue) {
    emit('update:modelValue', clean)
    emit('change', clean)
  }
}

const stepBy = (multiplier = 1) => {
  if (props.disabled) return
  const base = Number.isFinite(props.modelValue) ? props.modelValue : 0
  const delta = (Number(props.step) || 1) * multiplier
  commitValue(base + delta)
}

const focus = () => {
  inputRef.value?.focus()
}

defineExpose({
  stepBy,
  clampAndSnap: clampAndRound,
  focus
})

const startAutoStep = (direction) => {
  if (props.disabled) return
  stopAutoStep()
  stepBy(direction)
  holdTimeout = setTimeout(() => {
    holdInterval = setInterval(() => {
      stepBy(direction)
    }, 65)
  }, 380)
}

const stopAutoStep = () => {
  if (holdTimeout) {
    clearTimeout(holdTimeout)
    holdTimeout = null
  }
  if (holdInterval) {
    clearInterval(holdInterval)
    holdInterval = null
  }
}

const handleInput = (e) => {
  const raw = e.target.value
  if (raw === '' || raw === '-') return
  const parsed = Number(raw)
  if (Number.isFinite(parsed)) {
    const clean = clampAndRound(parsed)
    emit('update:modelValue', clean)
  }
}

const handleBlur = (e) => {
  isFocused.value = false
  const parsed = Number(e.target.value)
  if (Number.isFinite(parsed)) {
    commitValue(parsed)
  } else if (inputRef.value) {
    inputRef.value.value = String(displayValue.value)
  }
}

const handleWheel = (e) => {
  if (!props.wheelStep || !isFocused.value || props.disabled) return
  e.preventDefault()
  const dir = e.deltaY < 0 ? 1 : -1
  stepBy(e.shiftKey ? dir * 10 : dir)
}

onBeforeUnmount(() => {
  stopAutoStep()
})
</script>

<template>
  <div
    class="nano-number-stepper"
    :class="[
      `is-${variant}`,
      `is-${size}`,
      presetColorClass,
      { 'is-disabled': disabled, 'is-focused': isFocused }
    ]"
    :style="rootStyle"
  >
    <!-- Variant 'split': Left Decrement Button [ - | input | + ] -->
    <button
      v-if="variant === 'split'"
      type="button"
      class="nano-stepper-btn is-left"
      :disabled="disabled || isAtMin"
      :aria-label="decrementAriaLabel"
      @pointerdown.prevent="startAutoStep(-1)"
      @pointerup="stopAutoStep"
      @pointerleave="stopAutoStep"
      @pointercancel="stopAutoStep"
      @keydown.enter.prevent="stepBy(-1)"
      @keydown.space.prevent="stepBy(-1)"
    >
      <span v-if="decrementLabel" class="nano-stepper-text">{{ decrementLabel }}</span>
      <svg v-else viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="2.5" y1="6" x2="9.5" y2="6" />
      </svg>
    </button>

    <span v-if="prefix" class="nano-stepper-affix is-prefix">{{ prefix }}</span>

    <input
      :id="resolvedId"
      ref="inputRef"
      :name="resolvedName"
      type="number"
      class="nano-stepper-input"
      :class="{ 'is-center': variant === 'split' || align === 'center' }"
      :value="displayValue"
      :min="Number.isFinite(min) ? min : undefined"
      :max="Number.isFinite(max) ? max : undefined"
      :step="step"
      :disabled="disabled"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      @focus="isFocused = true"
      @blur="handleBlur"
      @input="handleInput"
      @keydown.up.prevent="stepBy($event.shiftKey ? 10 : 1)"
      @keydown.down.prevent="stepBy($event.shiftKey ? -10 : -1)"
      @wheel="handleWheel"
    />

    <span v-if="suffix" class="nano-stepper-affix is-suffix">{{ suffix }}</span>

    <!-- Variant 'split': Right Increment Button [ - | input | + ] -->
    <button
      v-if="variant === 'split'"
      type="button"
      class="nano-stepper-btn is-right"
      :disabled="disabled || isAtMax"
      :aria-label="incrementAriaLabel"
      @pointerdown.prevent="startAutoStep(1)"
      @pointerup="stopAutoStep"
      @pointerleave="stopAutoStep"
      @pointercancel="stopAutoStep"
      @keydown.enter.prevent="stepBy(1)"
      @keydown.space.prevent="stepBy(1)"
    >
      <span v-if="incrementLabel" class="nano-stepper-text">{{ incrementLabel }}</span>
      <svg v-else viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="6" y1="2.5" x2="6" y2="9.5" />
        <line x1="2.5" y1="6" x2="9.5" y2="6" />
      </svg>
    </button>

    <!-- Variant 'stacked': Right-Side Half-Height Up/Down Buttons [ input | ▲ / ▼ ] -->
    <div v-else class="nano-stepper-stack">
      <button
        type="button"
        class="nano-stepper-half is-up"
        :disabled="disabled || isAtMax"
        :aria-label="incrementAriaLabel"
        @pointerdown.prevent="startAutoStep(1)"
        @pointerup="stopAutoStep"
        @pointerleave="stopAutoStep"
        @pointercancel="stopAutoStep"
        @keydown.enter.prevent="stepBy(1)"
        @keydown.space.prevent="stepBy(1)"
      >
        <svg viewBox="0 0 12 8" width="9" height="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1.5 6.2 6 1.8 10.5 6.2" />
        </svg>
      </button>
      <button
        type="button"
        class="nano-stepper-half is-down"
        :disabled="disabled || isAtMin"
        :aria-label="decrementAriaLabel"
        @pointerdown.prevent="startAutoStep(-1)"
        @pointerup="stopAutoStep"
        @pointerleave="stopAutoStep"
        @pointercancel="stopAutoStep"
        @keydown.enter.prevent="stepBy(-1)"
        @keydown.space.prevent="stepBy(-1)"
      >
        <svg viewBox="0 0 12 8" width="9" height="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1.5 1.8 6 6.2 10.5 1.8" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Semantic Color Presets (matching Nano UI .nano-btn-* variants) */
.nano-number-stepper.color-primary {
  --nano-stepper-color: var(--nano-accent-primary, #6366f1);
}

.nano-number-stepper.color-success {
  --nano-stepper-color: var(--nano-status-success, #4ade80);
}

.nano-number-stepper.color-danger {
  --nano-stepper-color: var(--nano-status-danger, #f87171);
}

.nano-number-stepper.color-active {
  --nano-stepper-color: var(--nano-state-active, #00f2fe);
}

.nano-number-stepper.color-warn {
  --nano-stepper-color: var(--nano-status-warn, #facc15);
}

.nano-number-stepper.color-info {
  --nano-stepper-color: var(--nano-status-info, #38bdf8);
}

.nano-number-stepper.color-purple {
  --nano-stepper-color: var(--nano-status-purple, #c084fc);
}

.nano-number-stepper {
  --_accent: var(--nano-stepper-color, var(--nano-state-active, #38bdf8));
  display: inline-flex;
  align-items: stretch;
  background: var(--nano-bg-code, #0b1120);
  border: 1px solid color-mix(
    in srgb,
    var(--nano-stepper-color, var(--nano-border-card, rgba(255, 255, 255, 0.15))) 48%,
    var(--nano-border-card, rgba(255, 255, 255, 0.15))
  );
  border-radius: var(--nano-radius-sm, 7px);
  overflow: hidden;
  box-sizing: border-box;
  height: 32px;
  min-width: 78px;
  user-select: none;
  transition: border-color var(--nano-transition-interactive, 0.15s ease),
              background-color var(--nano-transition-interactive, 0.15s ease),
              box-shadow var(--nano-transition-interactive, 0.15s ease);
}

.nano-number-stepper.color-ghost {
  background: transparent;
  border-color: transparent;
}

.nano-number-stepper.color-ghost:hover:not(.is-disabled):not(.is-focused) {
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.03));
  border-color: var(--nano-border-card, rgba(255, 255, 255, 0.15));
}

.nano-number-stepper.is-sm {
  height: 26px;
  border-radius: var(--nano-radius-xs, 5px);
}

.nano-number-stepper.is-lg {
  height: 40px;
  border-radius: var(--nano-radius-md, 8px);
}

.nano-number-stepper.is-focused {
  border-color: var(--_accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--_accent) 38%, transparent);
}

.nano-number-stepper.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nano-stepper-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent;
  color: var(--nano-text-main, #f8fafc);
  font-family: var(--nano-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 0 8px;
  -moz-appearance: textfield;
  appearance: textfield;
}

.nano-number-stepper.is-sm .nano-stepper-input {
  font-size: 0.73rem;
  padding: 0 6px;
}

.nano-number-stepper.is-lg .nano-stepper-input {
  font-size: 0.92rem;
  padding: 0 11px;
}

.nano-stepper-input.is-center {
  text-align: center;
  padding: 0 4px;
}

.nano-stepper-input::-webkit-inner-spin-button,
.nano-stepper-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.nano-stepper-affix {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--nano-text-muted, #94a3b8);
  padding: 0 6px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.03));
  white-space: nowrap;
}

.nano-stepper-affix.is-prefix {
  border-right: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
}

.nano-stepper-affix.is-suffix {
  border-left: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
}

/* Variant 'split': Left & Right Glued Buttons */
.nano-stepper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 0 7px;
  border: none;
  outline: none !important;
  background: color-mix(
    in srgb,
    var(--nano-stepper-color, var(--nano-bg-muted, rgba(255, 255, 255, 0.04))) 16%,
    var(--nano-bg-muted, rgba(255, 255, 255, 0.04))
  );
  color: var(--nano-stepper-color, var(--nano-text-muted, #94a3b8));
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.nano-number-stepper.is-sm .nano-stepper-btn {
  min-width: 24px;
  padding: 0 5px;
}

.nano-stepper-btn.is-left {
  border-right: 1px solid color-mix(
    in srgb,
    var(--nano-stepper-color, var(--nano-border-subtle, rgba(255, 255, 255, 0.1))) 32%,
    var(--nano-border-subtle, rgba(255, 255, 255, 0.1))
  );
}

.nano-stepper-btn.is-right {
  border-left: 1px solid color-mix(
    in srgb,
    var(--nano-stepper-color, var(--nano-border-subtle, rgba(255, 255, 255, 0.1))) 32%,
    var(--nano-border-subtle, rgba(255, 255, 255, 0.1))
  );
}

.nano-number-stepper.color-ghost .nano-stepper-btn,
.nano-number-stepper.color-ghost .nano-stepper-stack {
  background: transparent;
  border-color: transparent;
}

.nano-number-stepper.color-ghost:hover:not(.is-disabled) .nano-stepper-btn,
.nano-number-stepper.color-ghost:hover:not(.is-disabled) .nano-stepper-stack,
.nano-number-stepper.color-ghost.is-focused .nano-stepper-btn,
.nano-number-stepper.color-ghost.is-focused .nano-stepper-stack {
  border-color: var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
}

.nano-stepper-btn:hover:not(:disabled),
.nano-stepper-half:hover:not(:disabled) {
  background: color-mix(in srgb, var(--_accent) 22%, transparent);
  color: var(--_accent);
}

.nano-stepper-btn:active:not(:disabled),
.nano-stepper-half:active:not(:disabled) {
  background: color-mix(in srgb, var(--_accent) 34%, transparent);
}

.nano-stepper-btn:disabled,
.nano-stepper-half:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.nano-stepper-text {
  font-family: var(--nano-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.72rem;
  font-weight: 700;
}

/* Variant 'stacked': Right-Side 50%/50% Top/Bottom Stack */
.nano-stepper-stack {
  display: flex;
  flex-direction: column;
  width: 23px;
  height: 100%;
  flex-shrink: 0;
  border-left: 1px solid color-mix(
    in srgb,
    var(--nano-stepper-color, var(--nano-border-subtle, rgba(255, 255, 255, 0.1))) 32%,
    var(--nano-border-subtle, rgba(255, 255, 255, 0.1))
  );
  background: color-mix(
    in srgb,
    var(--nano-stepper-color, var(--nano-bg-muted, rgba(255, 255, 255, 0.03))) 14%,
    var(--nano-bg-muted, rgba(255, 255, 255, 0.03))
  );
}

.nano-number-stepper.is-sm .nano-stepper-stack {
  width: 20px;
}

.nano-stepper-half {
  flex: 1 1 50%;
  height: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  border: none;
  outline: none !important;
  background: transparent;
  color: var(--nano-stepper-color, var(--nano-text-muted, #94a3b8));
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.nano-stepper-half.is-up {
  border-bottom: 1px solid color-mix(
    in srgb,
    var(--nano-stepper-color, var(--nano-border-subtle, rgba(255, 255, 255, 0.1))) 32%,
    var(--nano-border-subtle, rgba(255, 255, 255, 0.1))
  );
}
</style>
