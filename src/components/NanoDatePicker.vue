<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { currentLang } from '../locales.js';
import {
  findSafeSelectMount,
  computeSelectDropdownLayout,
  getPositionedReferenceEl,
} from '../utils/selectPositioning.js';
import {
  MONTH_NAMES,
  WEEKDAY_MONDAY_FIRST,
  parseIsoDate,
  getTodayIso,
  addDaysToIso,
  formatDisplayDate,
  buildCalendarMonthGrid,
} from '../utils/datepicker.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  min: {
    type: String,
    default: '',
  },
  max: {
    type: String,
    default: '',
  },
  minDate: {
    type: String,
    default: '',
  },
  maxDate: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  color: {
    type: String,
    default: 'emerald',
    validator: (v) =>
      [
        'emerald',
        'primary',
        'indigo',
        'cyan',
        'amber',
        'gold',
        'rose',
        'crimson',
        'danger',
        'violet',
        'purple',
        'slate',
      ].includes(v) || (typeof v === 'string' && v.startsWith('#')),
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showPresets: {
    type: Boolean,
    default: true,
  },
  locale: {
    type: String,
    default: '',
  },
  lang: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
});

let ndpUidSeq = 0;

const emit = defineEmits(['update:modelValue', 'change']);

const autoId = `nano-date-picker-${++ndpUidSeq}`;
const resolvedId = computed(() => props.id || autoId);
const resolvedName = computed(() => props.name || resolvedId.value);

const rootRef = ref(null);
const triggerRef = ref(null);
const popoverRef = ref(null);
const isOpen = ref(false);
const teleportTarget = ref('body');
const popoverStyle = ref({});

const effectiveMin = computed(() => props.minDate || props.min || '');
const effectiveMax = computed(() => props.maxDate || props.max || '');

const effectiveLang = computed(() => {
  const explicit = props.locale || props.lang;
  if (explicit === 'pl' || explicit === 'en') return explicit;
  return currentLang?.value === 'en' ? 'en' : 'pl';
});

const todayIso = computed(() => getTodayIso());

const parsedSelected = computed(() => parseIsoDate(props.modelValue));

const initialMonthState = () => {
  const sel = parseIsoDate(props.modelValue) || parseIsoDate(getTodayIso());
  return {
    year: sel.year,
    month: sel.month,
  };
};

const viewYear = ref(initialMonthState().year);
const viewMonth = ref(initialMonthState().month);

watch(
  () => props.modelValue,
  (nextVal) => {
    const parsed = parseIsoDate(nextVal);
    if (parsed) {
      viewYear.value = parsed.year;
      viewMonth.value = parsed.month;
    }
  }
);

const monthTitle = computed(() => {
  const names = MONTH_NAMES[effectiveLang.value] || MONTH_NAMES.pl;
  return `${names[viewMonth.value - 1] || ''} ${viewYear.value}`;
});

const weekdayHeaders = computed(() => {
  return WEEKDAY_MONDAY_FIRST[effectiveLang.value] || WEEKDAY_MONDAY_FIRST.pl;
});

const calendarCells = computed(() => {
  return buildCalendarMonthGrid(viewYear.value, viewMonth.value, {
    selectedIso: parsedSelected.value?.iso || '',
    todayIso: todayIso.value,
    minIso: effectiveMin.value,
    maxIso: effectiveMax.value,
  });
});

const displayLabel = computed(() => {
  if (!parsedSelected.value) return '';
  return `${formatDisplayDate(parsedSelected.value.iso, effectiveLang.value)} (${parsedSelected.value.iso})`;
});

const effectivePlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder;
  return effectiveLang.value === 'en' ? 'Select date (YYYY-MM-DD)' : 'Wybierz datę (RRRR-MM-DD)';
});

const updatePopoverPosition = () => {
  if (!isOpen.value || !triggerRef.value || typeof window === 'undefined') return;
  const { mountEl, viewportEl } = findSafeSelectMount(triggerRef.value, 336);
  const useAncestorMount = Boolean(mountEl && mountEl.nodeType === 1);
  teleportTarget.value = useAncestorMount ? mountEl : 'body';

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const screenRect =
    viewportEl && typeof viewportEl.getBoundingClientRect === 'function'
      ? viewportEl.getBoundingClientRect()
      : {
        top: 0,
        left: 0,
        right: window.innerWidth || 1024,
        bottom: window.innerHeight || 768,
        width: window.innerWidth || 1024,
        height: window.innerHeight || 768,
      };

  const refEl = useAncestorMount ? getPositionedReferenceEl(mountEl) : null;
  const refRect = refEl && typeof refEl.getBoundingClientRect === 'function'
    ? refEl.getBoundingClientRect()
    : { top: 0, left: 0 };
  const scrollLeft = useAncestorMount && refEl ? (refEl.scrollLeft || 0) : 0;
  const scrollTop = useAncestorMount && refEl ? (refEl.scrollTop || 0) : 0;

  const actualH = popoverRef.value?.offsetHeight || (props.showPresets ? 334 : 292);
  const layout = computeSelectDropdownLayout({
    triggerRect,
    screenRect,
    mountRect: refRect,
    mountScrollLeft: scrollLeft,
    mountScrollTop: scrollTop,
    searchable: false,
    optionsCount: 7,
    maxDropdownHeight: actualH,
    actualDropdownHeight: actualH,
    actualChromeHeight: 0,
    optionsScrollHeight: actualH,
    gap: 6,
    edgeMargin: 8,
  });

  const baseWidth = Math.max(288, Math.round(triggerRect.width || 0), Number(layout.minWidth) || 288);
  const clampedWidth = Math.min(316, Math.max(288, baseWidth));

  popoverStyle.value = {
    position: useAncestorMount ? 'absolute' : 'fixed',
    top: `${Math.round(Number(layout.top) || 0)}px`,
    left: `${Math.round(Number(layout.left) || 0)}px`,
    width: `${clampedWidth}px`,
    zIndex: 10050,
  };
};

const openPopover = async () => {
  if (props.disabled) return;
  const sel = parseIsoDate(props.modelValue) || parseIsoDate(getTodayIso());
  viewYear.value = sel.year;
  viewMonth.value = sel.month;
  isOpen.value = true;
  await nextTick();
  updatePopoverPosition();
};

const closePopover = () => {
  isOpen.value = false;
};

const togglePopover = () => {
  if (isOpen.value) {
    closePopover();
  } else {
    openPopover();
  }
};

const shiftMonth = (deltaMonths) => {
  let m = viewMonth.value + deltaMonths;
  let y = viewYear.value;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  viewYear.value = y;
  viewMonth.value = m;
};

const selectIsoDate = (iso, disabled = false) => {
  if (disabled || !iso) return;
  emit('update:modelValue', iso);
  emit('change', iso);
  closePopover();
};

const applyPresetOffset = (daysOffset) => {
  const targetIso = addDaysToIso(getTodayIso(), daysOffset);
  selectIsoDate(targetIso, false);
};

const clearDate = (e) => {
  if (e) e.stopPropagation();
  emit('update:modelValue', '');
  emit('change', '');
  closePopover();
};

const handleOutsidePointerDown = (e) => {
  if (!isOpen.value) return;
  const target = e.target;
  if (rootRef.value && rootRef.value.contains(target)) return;
  if (popoverRef.value && popoverRef.value.contains(target)) return;
  closePopover();
};

const handleKeyDown = (e) => {
  if (!isOpen.value) return;
  if (e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    closePopover();
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleOutsidePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('resize', updatePopoverPosition);
    window.removeEventListener('scroll', updatePopoverPosition, true);
  }
});
</script>

<template>
  <div
    ref="rootRef"
    class="nano-date-picker"
    :class="[
      `is-${size}`,
      `theme-${color}`,
      { 'is-open': isOpen, 'is-disabled': disabled }
    ]"
  >
    <button
      :id="resolvedId"
      ref="triggerRef"
      :name="resolvedName"
      type="button"
      class="ndp-trigger"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :aria-label="ariaLabel || displayLabel || effectivePlaceholder"
      @click="togglePopover"
    >
      <span class="ndp-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <line x1="5" y1="1.5" x2="5" y2="4" />
          <line x1="11" y1="1.5" x2="11" y2="4" />
          <line x1="2" y1="6.5" x2="14" y2="6.5" />
        </svg>
      </span>

      <span v-if="displayLabel" class="ndp-value">{{ displayLabel }}</span>
      <span v-else class="ndp-placeholder">{{ effectivePlaceholder }}</span>

      <span
        v-if="clearable && parsedSelected && !disabled"
        role="button"
        tabindex="0"
        class="ndp-clear"
        :aria-label="effectiveLang === 'en' ? 'Clear date' : 'Wyczyść datę'"
        @click.stop="clearDate"
        @keydown.enter.stop.prevent="clearDate"
      >
        ✕
      </span>
    </button>

    <Teleport :to="teleportTarget">
      <div
        v-if="isOpen"
        ref="popoverRef"
        class="ndp-popover"
        :class="[`theme-${color}`]"
        :style="popoverStyle"
        role="dialog"
        aria-modal="false"
      >
        <div class="ndp-header">
          <div class="ndp-nav-group">
            <button
              type="button"
              class="ndp-nav-btn"
              :aria-label="effectiveLang === 'en' ? 'Previous year' : 'Poprzedni rok'"
              @click="shiftMonth(-12)"
            >
              «
            </button>
            <button
              type="button"
              class="ndp-nav-btn"
              :aria-label="effectiveLang === 'en' ? 'Previous month' : 'Poprzedni miesiąc'"
              @click="shiftMonth(-1)"
            >
              ‹
            </button>
          </div>

          <div class="ndp-month-label">{{ monthTitle }}</div>

          <div class="ndp-nav-group">
            <button
              type="button"
              class="ndp-nav-btn"
              :aria-label="effectiveLang === 'en' ? 'Next month' : 'Następny miesiąc'"
              @click="shiftMonth(1)"
            >
              ›
            </button>
            <button
              type="button"
              class="ndp-nav-btn"
              :aria-label="effectiveLang === 'en' ? 'Next year' : 'Następny rok'"
              @click="shiftMonth(12)"
            >
              »
            </button>
          </div>
        </div>

        <div class="ndp-weekdays">
          <span
            v-for="(wd, idx) in weekdayHeaders"
            :key="wd"
            class="ndp-weekday"
            :class="{ 'is-weekend': idx >= 5 }"
          >
            {{ wd }}
          </span>
        </div>

        <div class="ndp-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.iso"
            type="button"
            class="ndp-day"
            :class="{
              'is-outside': !cell.isCurrentMonth,
              'is-today': cell.isToday,
              'is-selected': cell.isSelected,
              'is-disabled': cell.isDisabled,
              'is-weekend': cell.isWeekend
            }"
            :disabled="cell.isDisabled"
            @click="selectIsoDate(cell.iso, cell.isDisabled)"
          >
            {{ cell.day }}
          </button>
        </div>

        <div v-if="showPresets" class="ndp-footer">
          <button type="button" class="ndp-preset-btn" @click="applyPresetOffset(0)">
            {{ effectiveLang === 'en' ? 'Today' : 'Dziś' }}
          </button>
          <button type="button" class="ndp-preset-btn" @click="applyPresetOffset(30)">
            +30d
          </button>
          <button type="button" class="ndp-preset-btn" @click="applyPresetOffset(90)">
            +90d
          </button>
          <button
            v-if="clearable && parsedSelected"
            type="button"
            class="ndp-preset-btn is-muted"
            @click="clearDate"
          >
            {{ effectiveLang === 'en' ? 'Clear' : 'Wyczyść' }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.nano-date-picker {
  --ndp-accent: #10b981;
  --ndp-accent-soft: rgba(16, 185, 129, 0.16);
  --ndp-bg: var(--nano-datepicker-bg, var(--nano-bg-muted, var(--bg-elevated, #0f172a)));
  --ndp-hover-bg: var(--nano-datepicker-hover-bg, var(--nano-bg-card, var(--bg-card, #18181b)));
  --ndp-border: var(--nano-datepicker-border, var(--nano-border-card, var(--border-subtle, #334155)));
  --ndp-text: var(--nano-text-main, var(--text-main, #f1f5f9));
  --ndp-muted: var(--nano-text-muted, var(--text-muted, #94a3b8));
  position: relative;
  display: inline-flex;
  min-width: 248px;
  user-select: none;
  -webkit-user-select: none;
}

.nano-date-picker.theme-primary,
.ndp-popover.theme-primary,
.nano-date-picker.theme-indigo,
.ndp-popover.theme-indigo {
  --ndp-accent: #6366f1;
  --ndp-accent-soft: rgba(99, 102, 241, 0.16);
}

.nano-date-picker.theme-cyan,
.ndp-popover.theme-cyan {
  --ndp-accent: #06b6d4;
  --ndp-accent-soft: rgba(6, 182, 212, 0.16);
}

.nano-date-picker.theme-amber,
.ndp-popover.theme-amber,
.nano-date-picker.theme-gold,
.ndp-popover.theme-gold {
  --ndp-accent: #f59e0b;
  --ndp-accent-soft: rgba(245, 158, 11, 0.16);
}

.nano-date-picker.theme-rose,
.ndp-popover.theme-rose,
.nano-date-picker.theme-crimson,
.ndp-popover.theme-crimson,
.nano-date-picker.theme-danger,
.ndp-popover.theme-danger {
  --ndp-accent: #f43f5e;
  --ndp-accent-soft: rgba(244, 63, 94, 0.16);
}

.nano-date-picker.theme-violet,
.ndp-popover.theme-violet,
.nano-date-picker.theme-purple,
.ndp-popover.theme-purple {
  --ndp-accent: #a855f7;
  --ndp-accent-soft: rgba(168, 85, 247, 0.16);
}

.nano-date-picker.theme-slate,
.ndp-popover.theme-slate {
  --ndp-accent: #64748b;
  --ndp-accent-soft: rgba(100, 116, 139, 0.16);
}

.ndp-trigger {
  width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 9px;
  border: 1px solid var(--ndp-border);
  background: var(--ndp-bg);
  color: var(--ndp-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.81rem;
  line-height: 1.25;
  cursor: pointer;
  outline: none !important;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.nano-date-picker.is-sm .ndp-trigger {
  padding: 5px 9px;
  font-size: 0.77rem;
  min-height: 32px;
}

.nano-date-picker.is-md .ndp-trigger {
  min-height: 36px;
}

.nano-date-picker.is-lg .ndp-trigger {
  padding: 9px 13px;
  font-size: 0.86rem;
  min-height: 40px;
}

.ndp-trigger:hover:not(:disabled),
.nano-date-picker.is-open .ndp-trigger {
  border-color: var(--ndp-accent);
  background: var(--ndp-hover-bg);
}

.nano-date-picker.is-open .ndp-trigger {
  box-shadow: 0 0 0 2px var(--ndp-accent-soft);
}

.ndp-icon {
  display: inline-flex;
  align-items: center;
  color: var(--ndp-accent);
  flex-shrink: 0;
}

.ndp-value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

.ndp-placeholder {
  flex: 1;
  text-align: left;
  color: var(--ndp-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ndp-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.68rem;
  color: var(--ndp-muted);
  background: rgba(148, 163, 184, 0.16);
}

.ndp-clear:hover {
  color: var(--ndp-text);
  background: rgba(148, 163, 184, 0.28);
}

.ndp-popover {
  --ndp-accent: #10b981;
  --ndp-accent-soft: rgba(16, 185, 129, 0.18);
  background: var(--nano-datepicker-popover-bg, var(--nano-bg-sidebar, var(--bg-card, #0f172a)));
  color: var(--nano-text-main, var(--text-main, #f1f5f9));
  border: 1px solid var(--nano-datepicker-border, var(--nano-border-card, var(--border-subtle, #334155)));
  border-radius: 12px;
  padding: 12px;
  box-shadow: var(--nano-datepicker-shadow, 0 16px 36px rgba(0, 0, 0, 0.35));
  user-select: none;
  -webkit-user-select: none;
}

.ndp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 10px;
}

.ndp-nav-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ndp-nav-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--nano-datepicker-border, var(--nano-border-card, var(--border-subtle, #334155)));
  background: var(--nano-datepicker-bg, var(--nano-bg-muted, var(--bg-elevated, #1e293b)));
  color: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  cursor: pointer;
  outline: none !important;
}

.ndp-nav-btn:hover {
  border-color: var(--ndp-accent);
  color: var(--ndp-accent);
}

.ndp-month-label {
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.ndp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
  text-align: center;
}

.ndp-weekday {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nano-text-muted, var(--text-muted, #94a3b8));
  padding: 3px 0;
}

.ndp-weekday.is-weekend {
  color: var(--ndp-accent);
}

.ndp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.ndp-day {
  height: 32px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
  font-weight: 600;
  display: grid;
  place-items: center;
  cursor: pointer;
  outline: none !important;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.ndp-day:hover:not(:disabled) {
  background: var(--ndp-accent-soft);
  border-color: var(--ndp-accent);
}

.ndp-day.is-outside {
  opacity: 0.35;
}

.ndp-day.is-today {
  border-color: var(--ndp-accent);
  font-weight: 800;
}

.ndp-day.is-selected {
  background: var(--ndp-accent) !important;
  color: #ffffff !important;
  font-weight: 800;
}

.ndp-day.is-disabled {
  opacity: 0.22;
  cursor: not-allowed;
}

.ndp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--nano-datepicker-border, var(--nano-border-subtle, var(--border-subtle, #334155)));
}

.ndp-preset-btn {
  flex: 1;
  padding: 5px 6px;
  border-radius: 6px;
  border: 1px solid var(--nano-datepicker-border, var(--nano-border-card, var(--border-subtle, #334155)));
  background: var(--nano-datepicker-bg, var(--nano-bg-muted, var(--bg-elevated, #1e293b)));
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  outline: none !important;
}

.ndp-preset-btn:hover {
  border-color: var(--ndp-accent);
  background: var(--ndp-accent-soft);
}
</style>
