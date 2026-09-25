<template>
  <div 
    ref="wrapperRef"
    class="donut-canvas-wrapper" 
    :class="{ 
      'is-expanded': isExpanded,
      'no-transitions': isAnimating || immediate
    }"
    @mousemove="handleWrapperMouseMove"
    @mouseleave="handleWrapperMouseLeave"
  >
    <svg 
      :viewBox="`0 0 ${animVbWidth} ${animVbHeight}`" 
      class="items-svg-chart"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs v-if="normalizedData && normalizedData.length > 0">
        <!-- Glossy top face gradient -->
        <linearGradient 
          v-for="slice in uniqueSlices" 
          :key="'top-grad-' + getSafeId(slice.item.id)" 
          :id="'top-grad-' + getSafeId(slice.item.id)"
          gradientUnits="userSpaceOnUse"
          :x1="slice.topGradX1" :y1="slice.topGradY1" :x2="slice.topGradX2" :y2="slice.topGradY2"
        >
          <stop offset="0%" :stop-color="getBrighterColor(slice.color, 1.15)" />
          <stop offset="100%" :stop-color="getDarkerColor(slice.color, 0.85)" />
        </linearGradient>

        <!-- 3D Outer Wall vertical gradient -->
        <linearGradient 
          v-for="slice in uniqueSlices" 
          :key="'outer-grad-' + getSafeId(slice.item.id)" 
          :id="'outer-grad-' + getSafeId(slice.item.id)"
          gradientUnits="userSpaceOnUse"
          x1="0" :y1="slice.wallY1" x2="0" :y2="slice.wallY2"
        >
          <stop offset="0%" :stop-color="getDarkerColor(slice.color, 0.75)" />
          <stop offset="100%" :stop-color="getDarkerColor(slice.color, 0.5)" />
        </linearGradient>

        <!-- 3D Inner Wall vertical gradient -->
        <linearGradient 
          v-for="slice in uniqueSlices" 
          :key="'inner-grad-' + getSafeId(slice.item.id)" 
          :id="'inner-grad-' + getSafeId(slice.item.id)"
          gradientUnits="userSpaceOnUse"
          x1="0" :y1="slice.wallY1" x2="0" :y2="slice.wallY2"
        >
          <stop offset="0%" :stop-color="getDarkerColor(slice.color, 0.6)" />
          <stop offset="100%" :stop-color="getDarkerColor(slice.color, 0.4)" />
        </linearGradient>
      </defs>

      <!-- Centered text for empty state -->
      <g v-if="!normalizedData || normalizedData.length === 0">
        <text 
          :x="isExpanded ? 380 : 60" 
          :y="isExpanded ? 160 : 60" 
          fill="#64748b" 
          font-size="12" 
          font-family="system-ui, -apple-system, sans-serif"
          text-anchor="middle" 
          dominant-baseline="middle"
        >
          {{ emptyText || 'No data' }}
        </text>
      </g>

      <!-- Donut Slices (walls and top faces grouped for perfect Z-indexing) -->
      <g v-else>
        <!-- 3D MODE: 9-Layer Painter's Algorithm Architecture -->
        <template v-if="props.is3D">
          <!-- 1. Back Outer Walls -->
          <g 
            v-for="slice in backSlices" 
            :key="'slice-back-outer-' + slice.item.id + '-' + slice.midAngle"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== slice.item.id 
            }"
            :style="getSliceStyle(slice)"
            :data-testid="'slice-' + slice.item.id"
            :data-slice-id="slice.item.id"
            data-half="back"
            :data-sub-index="slice.subIndex"
          >
            <path 
              v-if="isExpanded && slice.outerWallPath" 
              :d="slice.outerWallPath" 
              :fill="`url(#outer-grad-${getSafeId(slice.item.id)})`" 
              data-wall="outer-wall"
              data-half="back"
            />
            <path 
              v-if="isExpanded && slice.outerWallStrokePath" 
              :d="slice.outerWallStrokePath" 
              fill="none"
              :stroke="`url(#outer-grad-${getSafeId(slice.item.id)})`" 
              stroke-width="0.8"
              stroke-linejoin="round"
              data-wall="outer-wall-stroke"
              data-half="back"
            />
          </g>

          <!-- 2. Back Cut Walls (sorted by angle order / depth cutY ascending) -->
          <g 
            v-for="cut in backCutWallsSorted" 
            :key="'cut-back-' + cut.id"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === cut.slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== cut.slice.item.id 
            }"
            :style="getSliceStyle(cut.slice)"
            :data-testid="'slice-' + cut.slice.item.id"
            :data-slice-id="cut.slice.item.id"
            :data-cut-type="cut.type"
            data-layer="cut-wall"
            data-half="back"
            :data-sub-index="cut.slice.subIndex"
          >
            <path 
              v-if="isExpanded && shouldRenderCut(cut) && cut.path"
              :d="cut.path" 
              :fill="cut.fill" 
              :data-wall="cut.type"
              data-half="back"
            />
          </g>

          <!-- 3. Back Inner Walls (drawn after back cut walls so cuts never clip inner walls) -->
          <g 
            v-for="slice in backSlices" 
            :key="'slice-back-inner-' + slice.item.id + '-' + slice.midAngle"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== slice.item.id 
            }"
            :style="getSliceStyle(slice)"
            :data-testid="'slice-' + slice.item.id"
            :data-slice-id="slice.item.id"
            data-half="back"
            :data-sub-index="slice.subIndex"
          >
            <path 
              v-if="isExpanded && slice.innerWallPath" 
              :d="slice.innerWallPath" 
              :fill="`url(#inner-grad-${getSafeId(slice.item.id)})`" 
              data-wall="inner-wall"
              data-half="back"
            />
            <path 
              v-if="isExpanded && slice.innerWallStrokePath" 
              :d="slice.innerWallStrokePath" 
              fill="none"
              :stroke="`url(#inner-grad-${getSafeId(slice.item.id)})`" 
              stroke-width="0.8"
              stroke-linejoin="round"
              data-wall="inner-wall-stroke"
              data-half="back"
            />
          </g>

          <!-- 4. Back Top Upper Half of Surface -->
          <g 
            v-for="slice in backSlices" 
            :key="'slice-back-top-' + slice.item.id + '-' + slice.midAngle"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== slice.item.id 
            }"
            :style="getSliceStyle(slice)"
            :data-testid="'slice-' + slice.item.id"
            :data-slice-id="slice.item.id"
            data-half="back"
            :data-sub-index="slice.subIndex"
          >
            <path 
              :d="slice.topPath" 
              :fill="`url(#top-grad-${getSafeId(slice.item.id)})`" 
              data-wall="top-face"
              data-half="back"
            />
            <path 
              v-if="slice.topStrokePath"
              :d="slice.topStrokePath" 
              fill="none"
              :stroke="`url(#top-grad-${getSafeId(slice.item.id)})`" 
              stroke-width="0.8"
              stroke-linejoin="round"
              data-wall="top-face-stroke"
              data-half="back"
            />
            <path 
              v-if="slice.topStrokePath"
              :d="slice.topStrokePath" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.16)" 
              :stroke-width="isExpanded ? 0.8 : 0.5" 
              stroke-linejoin="round"
              data-wall="top-face-highlight"
              data-half="back"
            />
          </g>

          <!-- 5. Center Hole Text / Label (sandwiched between back and front halves) -->
          <g 
            v-if="props.showCenterText" 
            :transform="`translate(${animCx}, ${centerTextY})`" 
            class="center-text-group"
            :style="{ opacity: (isolateHovered && effectiveActiveId) ? 0 : 1 }"
          >
            <text 
              x="0" 
              y="-3" 
              class="center-text-value"
              :font-size="animFontSizeValue" 
              font-weight="bold" 
              font-family="'JetBrains Mono', monospace" 
              text-anchor="middle" 
              dominant-baseline="middle"
            >
              {{ displayCenterValue }}
            </text>
            <text 
              x="0" 
              y="10" 
              class="center-text-label"
              :font-size="animFontSizeLabel" 
              font-family="system-ui, -apple-system, sans-serif" 
              font-weight="600"
              text-anchor="middle" 
              dominant-baseline="middle"
            >
              {{ displayCenterLabel }}
            </text>
          </g>

          <!-- 6. Front Inner Walls -->
          <g 
            v-for="slice in frontSlices" 
            :key="'slice-front-inner-' + slice.item.id + '-' + slice.midAngle"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== slice.item.id 
            }"
            :style="getSliceStyle(slice)"
            :data-testid="'slice-' + slice.item.id"
            :data-slice-id="slice.item.id"
            data-half="front"
            :data-sub-index="slice.subIndex"
          >
            <path 
              v-if="isExpanded && slice.innerWallPath" 
              :d="slice.innerWallPath" 
              :fill="`url(#inner-grad-${getSafeId(slice.item.id)})`" 
              data-wall="inner-wall"
              data-half="front"
            />
            <path 
              v-if="isExpanded && slice.innerWallStrokePath" 
              :d="slice.innerWallStrokePath" 
              fill="none"
              :stroke="`url(#inner-grad-${getSafeId(slice.item.id)})`" 
              stroke-width="0.8"
              stroke-linejoin="round"
              data-wall="inner-wall-stroke"
              data-half="front"
            />
          </g>

          <!-- 7. Front Cut Walls (sorted by angle order / depth cutY ascending) -->
          <g 
            v-for="cut in frontCutWallsSorted" 
            :key="'cut-front-' + cut.id"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === cut.slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== cut.slice.item.id 
            }"
            :style="getSliceStyle(cut.slice)"
            :data-testid="'slice-' + cut.slice.item.id"
            :data-slice-id="cut.slice.item.id"
            :data-cut-type="cut.type"
            data-layer="cut-wall"
            data-half="front"
            :data-sub-index="cut.slice.subIndex"
          >
            <path 
              v-if="isExpanded && shouldRenderCut(cut) && cut.path"
              :d="cut.path" 
              :fill="cut.fill" 
              :data-wall="cut.type"
              data-half="front"
            />
          </g>

          <!-- 8. Front Outer Walls -->
          <g 
            v-for="slice in frontSlices" 
            :key="'slice-front-outer-' + slice.item.id + '-' + slice.midAngle"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== slice.item.id 
            }"
            :style="getSliceStyle(slice)"
            :data-testid="'slice-' + slice.item.id"
            :data-slice-id="slice.item.id"
            data-half="front"
            :data-sub-index="slice.subIndex"
          >
            <path 
              v-if="isExpanded && slice.outerWallPath" 
              :d="slice.outerWallPath" 
              :fill="`url(#outer-grad-${getSafeId(slice.item.id)})`" 
              data-wall="outer-wall"
              data-half="front"
            />
            <path 
              v-if="isExpanded && slice.outerWallStrokePath" 
              :d="slice.outerWallStrokePath" 
              fill="none"
              :stroke="`url(#outer-grad-${getSafeId(slice.item.id)})`" 
              stroke-width="0.8"
              stroke-linejoin="round"
              data-wall="outer-wall-stroke"
              data-half="front"
            />
          </g>

          <!-- 9. Front Top Upper Half of Surface -->
          <g 
            v-for="slice in frontSlices" 
            :key="'slice-front-top-' + slice.item.id + '-' + slice.midAngle"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== slice.item.id 
            }"
            :style="getSliceStyle(slice)"
            :data-testid="'slice-' + slice.item.id"
            :data-slice-id="slice.item.id"
            data-half="front"
            :data-sub-index="slice.subIndex"
          >
            <path 
              :d="slice.topPath" 
              :fill="`url(#top-grad-${getSafeId(slice.item.id)})`" 
              data-wall="top-face"
              data-half="front"
            />
            <path 
              v-if="slice.topStrokePath"
              :d="slice.topStrokePath" 
              fill="none"
              :stroke="`url(#top-grad-${getSafeId(slice.item.id)})`" 
              stroke-width="0.8"
              stroke-linejoin="round"
              data-wall="top-face-stroke"
              data-half="front"
            />
            <path 
              v-if="slice.topStrokePath"
              :d="slice.topStrokePath" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.16)" 
              :stroke-width="isExpanded ? 0.8 : 0.5" 
              stroke-linejoin="round"
              data-wall="top-face-highlight"
              data-half="front"
            />
          </g>
        </template>


        <!-- 2D FLAT MODE: All slices rendered first, center label strictly on top of all elements -->
        <template v-else>
          <g 
            v-for="slice in sortedSlices" 
            :key="'slice-sub-2d-' + slice.item.id + '-' + slice.midAngle"
            class="slice-group-3d"
            :class="{ 
              'is-hovered': effectiveActiveId === slice.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== slice.item.id 
            }"
            :style="getSliceStyle(slice)"
          >
            <!-- Top Face in 2D -->
            <path 
              :d="slice.topPath" 
              :fill="`url(#top-grad-${getSafeId(slice.item.id)})`" 
            />

            <!-- Top Face Outline -->
            <path 
              v-if="slice.topStrokePath"
              :d="slice.topStrokePath" 
              fill="none"
              :stroke="`url(#top-grad-${getSafeId(slice.item.id)})`" 
              stroke-width="0.8"
              stroke-linejoin="round"
            />

            <!-- Top Face White Highlight Outline -->
            <path 
              v-if="slice.topStrokePath"
              :d="slice.topStrokePath" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.16)" 
              :stroke-width="isExpanded ? 0.8 : 0.5" 
              stroke-linejoin="round"
            />
          </g>

          <!-- Center Hole Text details (Strictly on top of all 2D slices) -->
          <g v-if="props.showCenterText" :transform="`translate(${animCx}, ${animCy})`" class="center-text-group">
            <text 
              x="0" 
              y="-3" 
              class="center-text-value"
              :font-size="animFontSizeValue" 
              font-weight="bold" 
              font-family="'JetBrains Mono', monospace" 
              text-anchor="middle" 
              dominant-baseline="middle"
            >
              {{ displayCenterValue }}
            </text>
            <text 
              x="0" 
              y="10" 
              class="center-text-label"
              :font-size="animFontSizeLabel" 
              font-family="system-ui, -apple-system, sans-serif" 
              font-weight="600"
              text-anchor="middle" 
              dominant-baseline="middle"
            >
              {{ displayCenterLabel }}
            </text>
          </g>
        </template>

        <!-- Transparent Static Hover Triggers to prevent hover feedback loops -->
        <g 
          v-for="slice in uniqueSlices" 
          :key="'hover-trigger-' + slice.item.id"
          class="hover-trigger-group"
          :style="{ cursor: (props.selectable && !isSingleSlice) ? 'pointer' : 'default' }"
          @mouseenter="handleHoverStart(slice.item.id)"
          @mouseleave="handleHoverEnd(slice.item.id)"
          @click="handleSliceClick(slice.item.id, $event)"
          @mousemove="handleSliceMouseMove(slice.item.id, $event)"
        >
          <!-- Transparent Top Face -->
          <path 
            :d="slice.hoverPath || slice.originalTopPath" 
            fill="transparent"
          />
          <!-- Transparent Outer Wall -->
          <path 
            v-if="slice.originalOuterWallPath" 
            :d="slice.originalOuterWallPath" 
            fill="transparent"
          />
        </g>

        <!-- Leader Lines & Text Labels (only in expanded view) -->
        <g class="labels-layer" :style="{ opacity: labelOpacity, pointerEvents: labelOpacity > 0.01 ? 'auto' : 'none' }">
          <!-- Left Labels -->
          <g 
            v-for="(label, idx) in leftLabels" 
            :key="'label-left-' + label.item.id"
            class="label-group"
            :class="{ 
              'is-hovered': effectiveActiveId === label.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== label.item.id 
            }"
            @mouseenter="handleHoverStart(label.item.id)"
            @mouseleave="handleHoverEnd(label.item.id)"
            @click="handleSliceClick(label.item.id, $event)"
            @mousemove="handleSliceMouseMove(label.item.id, $event)"
            :style="getLabelGroupStyle(label)"
          >
            <path 
              :d="getLeaderLinePath(label)" 
              fill="none" 
              :stroke="label.color" 
              :stroke-width="leaderStrokeWidth" 
            />
            <text 
              x="85" 
              :y="label.finalY" 
              :fill="label.color" 
              :font-size="resolvedLabelFontSize" 
              font-weight="600" 
              font-family="system-ui, -apple-system, sans-serif" 
              text-anchor="end" 
              dominant-baseline="middle"
              :style="getLabelTextStyle(label)"
            >
              {{ truncateText(label.item.name, 24) }} {{ formatValue(label.item.value) }} {{ label.item.unit || '' }} ({{ label.item.percentage }}%)
            </text>
          </g>

          <!-- Right Labels -->
          <g 
            v-for="(label, idx) in rightLabels" 
            :key="'label-right-' + label.item.id"
            class="label-group"
            :class="{ 
              'is-hovered': effectiveActiveId === label.item.id,
              'is-dimmed': effectiveActiveId !== null && effectiveActiveId !== label.item.id 
            }"
            @mouseenter="handleHoverStart(label.item.id)"
            @mouseleave="handleHoverEnd(label.item.id)"
            @click="handleSliceClick(label.item.id, $event)"
            @mousemove="handleSliceMouseMove(label.item.id, $event)"
            :style="getLabelGroupStyle(label)"
          >
            <path 
              :d="getLeaderLinePath(label)" 
              fill="none" 
              :stroke="label.color" 
              :stroke-width="leaderStrokeWidth" 
            />
            <text 
              x="675" 
              :y="label.finalY" 
              :fill="label.color" 
              :font-size="resolvedLabelFontSize" 
              font-weight="600" 
              font-family="system-ui, -apple-system, sans-serif" 
              text-anchor="start" 
              dominant-baseline="middle"
              :style="getLabelTextStyle(label)"
            >
              {{ truncateText(label.item.name, 24) }} {{ formatValue(label.item.value) }} {{ label.item.unit || '' }} ({{ label.item.percentage }}%)
            </text>
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { normalizeAngle, shortestAngleDiff } from '../utils/math.js'
import { createKineticTransition } from '../utils/kinetics.js'
import {
  splitAngleIntervals,
  getNeighborSliceIds,
  resolvePartitionCutVisibility,
  calculateCutY,
  sortCutWallsByDepth,
  getOptimalRotationAngle,
} from '../utils/chart-walls.js'


const props = defineProps({
  // Array of: { id, name, value, percentage, color, unit }
  data: {
    type: Array,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  hoveredItemId: {
    type: [String, Number],
    default: null
  },
  centerValue: {
    type: [String, Number],
    default: ''
  },
  centerLabel: {
    type: String,
    default: ''
  },
  emptyText: {
    type: String,
    default: ''
  },
  currentLowFxMode: {
    type: Boolean,
    default: false
  },
  immediate: {
    type: Boolean,
    default: false
  },
  immediateRotation: {
    type: Boolean,
    default: false
  },
  rotationAngle: {
    type: Number,
    default: -90
  },
  rotationTimingMode: {
    type: String,
    default: 'fixed',
    validator: (v) => ['fixed', 'proportional'].includes(v)
  },
  rotationModular: {
    type: Boolean,
    default: false
  },
  rotationDuration: {
    type: Number,
    default: undefined
  },
  autoRotate: {
    type: Boolean,
    default: false
  },
  slopeRatio: {
    type: Number,
    default: 0.5
  },
  // Data aggregation options
  aggregateOthers: {
    type: Boolean,
    default: false
  },
  othersThreshold: {
    type: Number,
    default: 0.01 // 1%
  },
  othersLabel: {
    type: String,
    default: 'Other'
  },
  othersColor: {
    type: String,
    default: '#64748b'
  },
  valueDecimals: {
    type: Number,
    default: undefined
  },
  selectedItemId: {
    type: [String, Number],
    default: null
  },
  selectable: {
    type: Boolean,
    default: false
  },
  is3D: {
    type: Boolean,
    default: true
  },
  showLabels: {
    type: Boolean,
    default: true
  },
  thickness: {
    type: Number,
    default: 0.5,
    validator: (val) => val >= 0 && val <= 1
  },
  showCenterText: {
    type: Boolean,
    default: true
  },
  centerValueFormatter: {
    type: Function,
    default: null
  },
  animationDuration: {
    type: Number,
    default: 350
  },
  labelSize: {
    type: String,
    default: 'md',
    validator: (val) => ['sm', 'md', 'lg', 'xl'].includes(val)
  },
  labelFontSize: {
    type: [Number, String],
    default: undefined
  },
  centerTextZ: {
    type: Number,
    default: 0.0,
    validator: (val) => val >= 0 && val <= 1
  }
})

const emit = defineEmits(['update:hoveredItemId', 'update:selectedItemId'])

const SIZE_MAP = {
  sm: 11,
  md: 13,
  lg: 15,
  xl: 17
}

const resolvedLabelFontSize = computed(() => {
  if (typeof props.labelFontSize === 'number') {
    return props.labelFontSize
  }
  if (typeof props.labelFontSize === 'string') {
    const parsed = parseFloat(props.labelFontSize)
    if (!isNaN(parsed) && parsed > 0) return parsed
    if (SIZE_MAP[props.labelFontSize]) return SIZE_MAP[props.labelFontSize]
  }
  return SIZE_MAP[props.labelSize] || 13
})

const leaderStrokeWidth = computed(() => {
  return resolvedLabelFontSize.value >= 15 ? 1.4 : 1.2
})

let currentAnimationId = null
const activeHoveredId = ref(null)
const suppressedHoverId = ref(null)
let lastClickPos = { x: 0, y: 0 }

const localSelectedId = ref(null)

const selectedId = computed({
  get() {
    return props.selectedItemId !== undefined && props.selectedItemId !== null
      ? props.selectedItemId
      : localSelectedId.value
  },
  set(val) {
    localSelectedId.value = val
    emit('update:selectedItemId', val)
  }
})

const effectiveActiveId = computed(() => {
  if (isSingleSlice.value) return null
  if (activeHoveredId.value !== null && activeHoveredId.value !== suppressedHoverId.value) {
    return activeHoveredId.value
  }
  return props.selectable ? selectedId.value : null
})

let clickedItemThisTick = false

const handleSliceClick = (id, event) => {
  if (!props.selectable || isSingleSlice.value) return
  clickedItemThisTick = true
  if (selectedId.value === id) {
    // Deselect: retract back to rest position immediately and suppress hover
    selectedId.value = null
    activeHoveredId.value = null
    suppressedHoverId.value = id
    if (event) {
      lastClickPos = { x: event.clientX || 0, y: event.clientY || 0 }
    }
  } else {
    suppressedHoverId.value = null
    selectedId.value = id
  }
}

const handleHoverStart = (id) => {
  if (isSingleSlice.value) return
  if (suppressedHoverId.value === id) return
  activeHoveredId.value = id
}

const handleHoverEnd = (id) => {
  if (activeHoveredId.value === id) {
    activeHoveredId.value = null
  }
  if (suppressedHoverId.value === id) {
    suppressedHoverId.value = null
  }
}

const handleSliceMouseMove = (id, event) => {
  if (isSingleSlice.value) return
  if (suppressedHoverId.value === id) {
    if (event) {
      const dist = Math.hypot(event.clientX - lastClickPos.x, event.clientY - lastClickPos.y)
      if (dist >= 3) {
        // Deliberate movement detected: unsuppress and re-engage hover!
        suppressedHoverId.value = null
        activeHoveredId.value = id
      }
    } else {
      suppressedHoverId.value = null
      activeHoveredId.value = id
    }
  }
}

const handleWrapperMouseMove = (event) => {
  if (suppressedHoverId.value !== null && event) {
    const dist = Math.hypot(event.clientX - lastClickPos.x, event.clientY - lastClickPos.y)
    if (dist >= 3) {
      suppressedHoverId.value = null
    }
  }
}

const handleWrapperMouseLeave = () => {
  activeHoveredId.value = null
  suppressedHoverId.value = null
}

const wrapperRef = ref(null)

const handleDocumentClick = (event) => {
  if (!props.selectable) return
  if (clickedItemThisTick) {
    clickedItemThisTick = false
    return
  }
  if (wrapperRef.value && wrapperRef.value.contains(event.target)) {
    selectedId.value = null
    suppressedHoverId.value = null
  }
}
const animatedItems = ref([])
const isSingleSlice = computed(() => {
  const list = props.data || []
  return list.filter(item => item.value > 0.001).length <= 1
})

const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1']

const getDarkerColor = (colorStr, factor = 0.6) => {
  if (!colorStr) return '#000000'
  let r = 0, g = 0, b = 0, a = 1
  
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  } else if (colorStr.startsWith('rgb')) {
    const parts = colorStr.match(/\d+(\.\d+)?/g)
    if (parts) {
      r = parseInt(parts[0])
      g = parseInt(parts[1])
      b = parseInt(parts[2])
      if (parts[3]) a = parseFloat(parts[3])
    }
  } else {
    return colorStr
  }
  
  r = Math.floor(r * factor)
  g = Math.floor(g * factor)
  b = Math.floor(b * factor)
  
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const getBrighterColor = (colorStr, factor = 1.2) => {
  if (!colorStr) return '#ffffff'
  let r = 0, g = 0, b = 0, a = 1
  
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  } else if (colorStr.startsWith('rgb')) {
    const parts = colorStr.match(/\d+(\.\d+)?/g)
    if (parts) {
      r = parseInt(parts[0])
      g = parseInt(parts[1])
      b = parseInt(parts[2])
      if (parts[3]) a = parseFloat(parts[3])
    }
  } else {
    return colorStr
  }
  
  r = Math.min(255, Math.floor(r * factor))
  g = Math.min(255, Math.floor(g * factor))
  b = Math.min(255, Math.floor(b * factor))
  
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const getItemColor = (item, index) => {
  if (item.color) return item.color
  return colors[index % colors.length]
}

const resolveCollisions = (labels, centerY, height, sizeMultiplier) => {
  if (labels.length === 0) return
  
  labels.sort((a, b) => a.desiredY - b.desiredY)
  
  const minSpacing = Math.max(14, Math.round(resolvedLabelFontSize.value * 1.35))
  
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].finalY < labels[i-1].finalY + minSpacing) {
      labels[i].finalY = labels[i-1].finalY + minSpacing
    }
  }
  
  const halfFont = resolvedLabelFontSize.value / 2
  const maxY = height - halfFont - 6
  if (labels[labels.length - 1].finalY > maxY) {
    labels[labels.length - 1].finalY = maxY
    for (let i = labels.length - 2; i >= 0; i--) {
      if (labels[i].finalY > labels[i+1].finalY - minSpacing) {
        labels[i].finalY = labels[i+1].finalY - minSpacing
      }
    }
  }
  
  const minY = halfFont + 6
  if (labels[0].finalY < minY) {
    labels[0].finalY = minY
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].finalY < labels[i-1].finalY + minSpacing) {
        labels[i].finalY = labels[i-1].finalY + minSpacing
      }
    }
  }
}

const formatValue = (val) => {
  if (typeof val !== 'number') return val
  if (props.valueDecimals !== undefined && props.valueDecimals !== null) {
    return val.toFixed(props.valueDecimals)
  }
  return Number(val.toFixed(10))
}

const truncateText = (str, len = 15) => {
  if (!str) return ''
  return str.length > len ? str.slice(0, len - 1) + '…' : str
}

const getSafeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '_')

// Normalized and aggregated input data structure
const normalizedData = computed(() => {
  const rawData = props.data || []
  if (rawData.length === 0) return []

  const total = rawData.reduce((sum, item) => sum + (item.value || 0), 0)

  if (!props.aggregateOthers) {
    return rawData.map(item => {
      const val = item.value || 0
      const pct = total > 0 ? Math.round((val / total) * 100) : 0
      return {
        ...item,
        percentage: pct
      }
    })
  }

  if (total === 0) {
    return rawData.map(item => ({
      ...item,
      percentage: 0
    }))
  }

  const maxOthersValue = total * props.othersThreshold

  // Sort by value ascending to greedily aggregate smallest items up to threshold budget
  const indexed = rawData.map((item, idx) => ({ ...item, _origIdx: idx }))
  indexed.sort((a, b) => (a.value || 0) - (b.value || 0))

  const otherIndices = new Set()
  let othersValue = 0

  for (const item of indexed) {
    const val = item.value || 0
    if (othersValue + val <= maxOthersValue && otherIndices.size < rawData.length - 1) {
      othersValue += val
      otherIndices.add(item._origIdx)
    } else {
      break
    }
  }

  const mainSlices = rawData
    .filter((_, idx) => !otherIndices.has(idx))
    .map(item => ({ ...item }))

  if (othersValue > 0) {
    const existingOtherIndex = mainSlices.findIndex(item => item.id === 'other' || item.name.toLowerCase() === props.othersLabel.toLowerCase())
    if (existingOtherIndex !== -1) {
      mainSlices[existingOtherIndex].value += othersValue
    } else {
      mainSlices.push({
        id: 'other',
        name: props.othersLabel,
        value: othersValue,
        color: props.othersColor,
        unit: rawData[0]?.unit || 'x'
      })
    }
  }

  // Re-calculate percentages for all slices
  const newTotal = mainSlices.reduce((sum, item) => sum + (item.value || 0), 0)
  return mainSlices.map(item => {
    const val = item.value || 0
    const pct = newTotal > 0 ? Math.round((val / newTotal) * 100) : 0
    return {
      ...item,
      percentage: pct
    }
  })
})

const totalValue = computed(() => {
  return animatedItems.value.reduce((sum, item) => sum + item.value, 0)
})

const displayCenterValue = computed(() => {
  if (props.centerValue !== undefined && props.centerValue !== '') {
    return props.centerValue
  }
  const hovered = sortedSlices.value.find(s => s.item.id === effectiveActiveId.value)
  if (hovered) {
    if (props.centerValueFormatter) {
      return props.centerValueFormatter(hovered.item.value, hovered.item)
    }
    return formatValue(hovered.item.value)
  }
  if (props.centerValueFormatter) {
    return props.centerValueFormatter(totalValue.value, null)
  }
  return props.valueDecimals !== undefined ? formatValue(totalValue.value) : Math.round(totalValue.value)
})

const displayCenterLabel = computed(() => {
  const hovered = sortedSlices.value.find(s => s.item.id === effectiveActiveId.value)
  if (hovered) {
    return truncateText(hovered.item.name, 12).toUpperCase()
  }
  return (props.centerLabel || '').toUpperCase()
})

const updateAnimatedData = (newData, immediate = false) => {
  const currentMap = new Map(animatedItems.value.map(item => [item.id, item]))
  const newMap = new Map(newData.map(item => [item.id, item]))

  const nextList = []

  newData.forEach(item => {
    const existing = currentMap.get(item.id)
    if (existing) {
      nextList.push({
        id: item.id,
        name: item.name,
        value: immediate ? item.value : existing.value,
        startValue: existing.value,
        targetValue: item.value,
        startPercentage: existing.percentage || 0,
        targetPercentage: item.percentage || 0,
        percentage: immediate ? (item.percentage || 0) : (existing.percentage || 0),
        color: item.color,
        unit: item.unit
      })
    } else {
      nextList.push({
        id: item.id,
        name: item.name,
        value: 0,
        startValue: 0,
        targetValue: item.value,
        startPercentage: 0,
        targetPercentage: item.percentage || 0,
        percentage: immediate ? (item.percentage || 0) : 0,
        color: item.color,
        unit: item.unit
      })
    }
  })

  animatedItems.value.forEach(item => {
    if (!newMap.has(item.id)) {
      nextList.push({
        id: item.id,
        name: item.name,
        value: immediate ? 0 : item.value,
        startValue: item.value,
        targetValue: 0,
        startPercentage: item.percentage || 0,
        targetPercentage: 0,
        percentage: immediate ? 0 : (item.percentage || 0),
        color: item.color,
        unit: item.unit
      })
    }
  })

  animatedItems.value = nextList

  if (immediate) {
    animatedItems.value = animatedItems.value.filter(item => item.targetValue > 0)
  }
}

const activeRotationAngle = computed(() => {
  if (props.autoRotate && normalizedData.value && normalizedData.value.length > 0) {
    const optimal = getOptimalRotationAngle(normalizedData.value, props.rotationAngle)
    return (props.rotationModular || props.autoRotate) ? normalizeAngle(optimal) : optimal
  }
  return props.rotationModular ? normalizeAngle(props.rotationAngle) : props.rotationAngle
})

const animatedRotationAngle = ref(activeRotationAngle.value)

const rotationKinetic = createKineticTransition({
  initialValue: activeRotationAngle.value,
  duration: props.rotationDuration ?? props.animationDuration ?? 350,
  timingMode: props.rotationTimingMode || 'fixed',
  modular: props.rotationModular || props.autoRotate || false,
  onUpdate: ({ value }) => {
    animatedRotationAngle.value = value
  },
  onSettled: ({ value }) => {
    animatedRotationAngle.value = value
  },
})
const isAnimating = ref(false)

const is3DMode = props.is3D
const animCx = ref(props.isExpanded ? 380 : 60)
const animCy = ref(props.isExpanded ? 160 : 60)
const animRx = ref(props.isExpanded ? 180 : 48)
const animRy = ref(props.isExpanded 
  ? (is3DMode ? 180 * props.slopeRatio : 180) 
  : (is3DMode ? 48 * props.slopeRatio : 48)
)
const animIrx = ref(props.isExpanded 
  ? 180 * (1 - props.thickness) 
  : 48 * (1 - props.thickness)
)
const animIry = ref(props.isExpanded 
  ? (is3DMode ? 180 * (1 - props.thickness) * props.slopeRatio : 180 * (1 - props.thickness)) 
  : (is3DMode ? 48 * (1 - props.thickness) * props.slopeRatio : 48 * (1 - props.thickness))
)

const initialBaseDepth = (props.isExpanded && is3DMode) ? 32 : 0
const initialDepth = (is3DMode && props.slopeRatio > 0.5)
  ? initialBaseDepth * (2 - 2 * props.slopeRatio) 
  : initialBaseDepth

const animDepth = ref(initialDepth)
const animVbWidth = ref(props.isExpanded ? 760 : 120)
const animVbHeight = ref(props.isExpanded ? 320 : 120)
const labelOpacity = ref((props.isExpanded && props.showLabels) ? 1 : 0)

const animFontSizeValue = computed(() => {
  const minRx = 48
  const maxRx = 180
  const minFs = 13
  const maxFs = 19
  const ratio = (animRx.value - minRx) / (maxRx - minRx)
  const clampedRatio = Math.max(0, Math.min(1, ratio))
  return minFs + (maxFs - minFs) * clampedRatio
})

const animFontSizeLabel = computed(() => {
  const minRx = 48
  const maxRx = 180
  const minFs = 7
  const maxFs = 8.5
  const ratio = (animRx.value - minRx) / (maxRx - minRx)
  const clampedRatio = Math.max(0, Math.min(1, ratio))
  return minFs + (maxFs - minFs) * clampedRatio
})

const drawCenterYComputed = computed(() => {
  return animCy.value - animDepth.value / 2
})

const centerTextY = computed(() => {
  const depth = animDepth.value
  const topY = drawCenterYComputed.value
  const zRatio = props.centerTextZ !== undefined && props.centerTextZ !== null ? props.centerTextZ : 0.0
  return topY + depth * zRatio
})

const sortedSlices = computed(() => {
  const itemsList = animatedItems.value
  const totalVal = totalValue.value
  if (totalVal === 0) return []

  const list = []
  let currentAngle = (animatedRotationAngle.value * Math.PI) / 180

  const cx = animCx.value
  const cy = animCy.value
  const rx = animRx.value
  const ry = animRy.value
  const irx = animIrx.value
  const iry = animIry.value
  const depth = animDepth.value
  const drawCenterY = drawCenterYComputed.value

  const activeSlices = itemsList.filter(item => item.value > 0.001)
  if (activeSlices.length === 1) {
    const item = activeSlices[0]
    const index = itemsList.indexOf(item)
    const color = getItemColor(item, index)

    // Complete donut ring paths
    const fullTopPath = `M ${cx - rx} ${drawCenterY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${drawCenterY} A ${rx} ${ry} 0 0 1 ${cx - rx} ${drawCenterY} M ${cx - irx} ${drawCenterY} A ${irx} ${iry} 0 0 0 ${cx + irx} ${drawCenterY} A ${irx} ${iry} 0 0 0 ${cx - irx} ${drawCenterY} Z`

    let fullOuterWallPath = ''
    let fullInnerWallPath = ''
    if (depth > 0) {
      // Front half of outer wall
      fullOuterWallPath = `M ${cx + rx} ${drawCenterY} A ${rx} ${ry} 0 0 1 ${cx - rx} ${drawCenterY} L ${cx - rx} ${drawCenterY + depth} A ${rx} ${ry} 0 0 0 ${cx + rx} ${drawCenterY + depth} Z`
      // Back half of inner wall (visible inside the hole)
      fullInnerWallPath = `M ${cx - irx} ${drawCenterY} A ${irx} ${iry} 0 0 1 ${cx + irx} ${drawCenterY} L ${cx + irx} ${drawCenterY + depth} A ${irx} ${iry} 0 0 0 ${cx - irx} ${drawCenterY + depth} Z`
    }

    // Half paths for splitting
    // Back Half: from angle PI to 2PI (180deg to 360deg)
    const backTopPath = `M ${cx - rx} ${drawCenterY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${drawCenterY} L ${cx + irx} ${drawCenterY} A ${irx} ${iry} 0 0 0 ${cx - irx} ${drawCenterY} Z`
    const backTopStrokePath = `M ${cx - rx} ${drawCenterY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${drawCenterY} M ${cx + irx} ${drawCenterY} A ${irx} ${iry} 0 0 0 ${cx - irx} ${drawCenterY}`
    const backInnerWallPath = fullInnerWallPath

    // Front Half: from angle 0 to PI (0deg to 180deg)
    const frontTopPath = `M ${cx + rx} ${drawCenterY} A ${rx} ${ry} 0 0 1 ${cx - rx} ${drawCenterY} L ${cx - irx} ${drawCenterY} A ${irx} ${iry} 0 0 0 ${cx + irx} ${drawCenterY} Z`
    const frontTopStrokePath = `M ${cx + rx} ${drawCenterY} A ${rx} ${ry} 0 0 1 ${cx - rx} ${drawCenterY} M ${cx - irx} ${drawCenterY} A ${irx} ${iry} 0 0 0 ${cx + irx} ${drawCenterY}`
    const frontOuterWallPath = fullOuterWallPath

    const originalMidAngle = (animatedRotationAngle.value * Math.PI) / 180 + Math.PI

    const x0 = cx + rx * Math.cos(originalMidAngle)
    const y0 = drawCenterY + ry * Math.sin(originalMidAngle)
    const x1 = cx + (rx + 25) * Math.cos(originalMidAngle)
    const y1 = drawCenterY + (ry + 35 * props.slopeRatio) * Math.sin(originalMidAngle)

    const midX = cx + ((rx + irx) / 2) * Math.cos(originalMidAngle)
    const midY_local = drawCenterY + ((ry + iry) / 2) * Math.sin(originalMidAngle)
    const w = rx - irx
    const h = ry - iry

    // Return two slices (Back-half and Front-half)
    return [
      {
        item,
        index,
        color,
        isSingleSlice: true,
        half: 'back',
        subIndex: 0,
        isStartEdge: false,
        isEndEdge: false,
        midAngle: 3 * Math.PI / 2, // 270 degrees
        originalMidAngle,
        originalTopPath: backTopPath,
        fullTopPath,
        hoverPath: fullTopPath,
        originalOuterWallPath: fullOuterWallPath,
        originalInnerWallPath: backInnerWallPath,
        topStrokePath: backTopStrokePath,
        outerWallStrokePath: '',
        innerWallStrokePath: backInnerWallPath,
        midY: drawCenterY - ry,
        topPath: backTopPath,
        outerWallPath: '',
        innerWallPath: backInnerWallPath,
        startCutPath: '',
        endCutPath: '',
        startCutAngle: null,
        endCutAngle: null,
        startCutY: 0,
        endCutY: 0,
        x0,
        y0,
        x1,
        y1,
        topGradX1: midX - w / 2,
        topGradY1: midY_local - h / 2,
        topGradX2: midX + w / 2,
        topGradY2: midY_local + h / 2,
        wallY1: drawCenterY,
        wallY2: drawCenterY + depth
      },
      {
        item,
        index,
        color,
        isSingleSlice: true,
        half: 'front',
        subIndex: 1,
        isStartEdge: false,
        isEndEdge: false,
        midAngle: Math.PI / 2, // 90 degrees
        originalMidAngle,
        originalTopPath: frontTopPath,
        fullTopPath,
        hoverPath: fullTopPath,
        originalOuterWallPath: fullOuterWallPath,
        originalInnerWallPath: '',
        topStrokePath: frontTopStrokePath,
        outerWallStrokePath: frontOuterWallPath,
        innerWallStrokePath: '',
        midY: drawCenterY + ry,
        topPath: frontTopPath,
        outerWallPath: frontOuterWallPath,
        innerWallPath: '',
        startCutPath: '',
        endCutPath: '',
        startCutAngle: null,
        endCutAngle: null,
        startCutY: 0,
        endCutY: 0,
        x0,

        y0,
        x1,
        y1,
        topGradX1: midX - w / 2,
        topGradY1: midY_local - h / 2,
        topGradX2: midX + w / 2,
        topGradY2: midY_local + h / 2,
        wallY1: drawCenterY,
        wallY2: drawCenterY + depth
      }
    ]
  }

  itemsList.forEach((item, index) => {
    let sliceAngle = (item.value / totalVal) * Math.PI * 2
    if (sliceAngle <= 0) return

    if (sliceAngle >= Math.PI * 2 - 0.001) {
      sliceAngle = Math.PI * 2 - 0.001
    }

    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle
    const originalMidAngle = startAngle + sliceAngle / 2

    const color = getItemColor(item, index)

    // Calculate original unsplit top path for seamless border drawing
    const x_os_orig = cx + rx * Math.cos(startAngle)
    const y_os_orig = drawCenterY + ry * Math.sin(startAngle)
    const x_oe_orig = cx + rx * Math.cos(endAngle)
    const y_oe_orig = drawCenterY + ry * Math.sin(endAngle)
    const x_ie_orig = cx + irx * Math.cos(endAngle)
    const y_ie_orig = drawCenterY + iry * Math.sin(endAngle)
    const x_is_orig = cx + irx * Math.cos(startAngle)
    const y_is_orig = drawCenterY + iry * Math.sin(startAngle)
    const origLargeArc = sliceAngle > Math.PI ? 1 : 0
    const originalTopPath = `M ${x_os_orig} ${y_os_orig} A ${rx} ${ry} 0 ${origLargeArc} 1 ${x_oe_orig} ${y_oe_orig} L ${x_ie_orig} ${y_ie_orig} A ${irx} ${iry} 0 ${origLargeArc} 0 ${x_is_orig} ${y_is_orig} Z`

    const originalOuterWallPath = depth > 0 
      ? `M ${x_os_orig} ${y_os_orig} A ${rx} ${ry} 0 ${origLargeArc} 1 ${x_oe_orig} ${y_oe_orig} L ${x_oe_orig} ${y_oe_orig + depth} A ${rx} ${ry} 0 ${origLargeArc} 0 ${x_os_orig} ${y_os_orig + depth} Z`
      : ''

    const originalInnerWallPath = depth > 0
      ? `M ${x_is_orig} ${y_is_orig} A ${irx} ${iry} 0 ${origLargeArc} 1 ${x_ie_orig} ${y_ie_orig} L ${x_ie_orig} ${y_ie_orig + depth} A ${irx} ${iry} 0 ${origLargeArc} 0 ${x_is_orig} ${y_is_orig + depth} Z`
      : ''

    const intervals = splitAngleIntervals(startAngle, sliceAngle)

    intervals.forEach(interval => {
      const sAngle = interval.start
      const eAngle = interval.end
      const subMidAngle = interval.midAngle

      const x_os = cx + rx * Math.cos(sAngle)
      const y_os = drawCenterY + ry * Math.sin(sAngle)
      const x_oe = cx + rx * Math.cos(eAngle)
      const y_oe = drawCenterY + ry * Math.sin(eAngle)
      const x_ie = cx + irx * Math.cos(eAngle)
      const y_ie = drawCenterY + iry * Math.sin(eAngle)
      const x_is = cx + irx * Math.cos(sAngle)
      const y_is = drawCenterY + iry * Math.sin(sAngle)

      const subAngleSize = eAngle - sAngle
      const largeArc = subAngleSize > Math.PI ? 1 : 0

      const topPath = `M ${x_os} ${y_os} A ${rx} ${ry} 0 ${largeArc} 1 ${x_oe} ${y_oe} L ${x_ie} ${y_ie} A ${irx} ${iry} 0 ${largeArc} 0 ${x_is} ${y_is} Z`

      const endSplit = !interval.isEndEdge
      const startSplit = !interval.isStartEdge

      let topStrokePath = ''
      if (endSplit) {
        topStrokePath = `M ${x_os} ${y_os} A ${rx} ${ry} 0 ${largeArc} 1 ${x_oe} ${y_oe} M ${x_ie} ${y_ie} A ${irx} ${iry} 0 ${largeArc} 0 ${x_is} ${y_is}`
        if (!startSplit) {
          topStrokePath += ` L ${x_os} ${y_os}`
        }
      } else {
        topStrokePath = `M ${x_os} ${y_os} A ${rx} ${ry} 0 ${largeArc} 1 ${x_oe} ${y_oe} L ${x_ie} ${y_ie} A ${irx} ${iry} 0 ${largeArc} 0 ${x_is} ${y_is}`
        if (!startSplit) {
          topStrokePath += ' Z'
        }
      }

      let outerWallPath = ''
      let innerWallPath = ''
      let outerWallStrokePath = ''
      let innerWallStrokePath = ''
      let startCutPath = ''
      let endCutPath = ''
      let startCutAngle = null
      let endCutAngle = null
      let startCutY = 0
      let endCutY = 0

      if (depth > 0) {
        outerWallPath = `M ${x_os} ${y_os} A ${rx} ${ry} 0 ${largeArc} 1 ${x_oe} ${y_oe} L ${x_oe} ${y_oe + depth} A ${rx} ${ry} 0 ${largeArc} 0 ${x_os} ${y_os + depth} Z`
        if (endSplit) {
          outerWallStrokePath = `M ${x_os} ${y_os} A ${rx} ${ry} 0 ${largeArc} 1 ${x_oe} ${y_oe} M ${x_oe} ${y_oe + depth} A ${rx} ${ry} 0 ${largeArc} 0 ${x_os} ${y_os + depth}`
          if (!startSplit) {
            outerWallStrokePath += ` L ${x_os} ${y_os}`
          }
        } else {
          outerWallStrokePath = `M ${x_os} ${y_os} A ${rx} ${ry} 0 ${largeArc} 1 ${x_oe} ${y_oe} L ${x_oe} ${y_oe + depth} A ${rx} ${ry} 0 ${largeArc} 0 ${x_os} ${y_os + depth}`
          if (!startSplit) {
            outerWallStrokePath += ' Z'
          }
        }

        innerWallPath = `M ${x_is} ${y_is} A ${irx} ${iry} 0 ${largeArc} 1 ${x_ie} ${y_ie} L ${x_ie} ${y_ie + depth} A ${irx} ${iry} 0 ${largeArc} 0 ${x_is} ${y_is + depth} Z`
        if (endSplit) {
          innerWallStrokePath = `M ${x_is} ${y_is} A ${irx} ${iry} 0 ${largeArc} 1 ${x_ie} ${y_ie} M ${x_ie} ${y_ie + depth} A ${irx} ${iry} 0 ${largeArc} 0 ${x_is} ${y_is + depth}`
          if (!startSplit) {
            innerWallStrokePath += ` L ${x_is} ${y_is}`
          }
        } else {
          innerWallStrokePath = `M ${x_is} ${y_is} A ${irx} ${iry} 0 ${largeArc} 1 ${x_ie} ${y_ie} L ${x_ie} ${y_ie + depth} A ${irx} ${iry} 0 ${largeArc} 0 ${x_is} ${y_is + depth}`
          if (!startSplit) {
            innerWallStrokePath += ' Z'
          }
        }

        if (interval.isStartEdge) {
          startCutPath = `M ${x_os} ${y_os} L ${x_is} ${y_is} L ${x_is} ${y_is + depth} L ${x_os} ${y_os + depth} Z`
          startCutAngle = interval.start
          startCutY = calculateCutY(interval.start, drawCenterY, ry)
        }
        if (interval.isEndEdge) {
          endCutPath = `M ${x_oe} ${y_oe} L ${x_ie} ${y_ie} L ${x_ie} ${y_ie + depth} L ${x_oe} ${y_oe + depth} Z`
          endCutAngle = interval.end
          endCutY = calculateCutY(interval.end, drawCenterY, ry)
        }
      }


      const midY = drawCenterY + ry * Math.sin(subMidAngle)

      const x0 = cx + rx * Math.cos(originalMidAngle)
      const y0 = drawCenterY + ry * Math.sin(originalMidAngle)
      const x1 = cx + (rx + 25) * Math.cos(originalMidAngle)
      const y1 = drawCenterY + (ry + 35 * props.slopeRatio) * Math.sin(originalMidAngle)

      const midX = cx + ((rx + irx) / 2) * Math.cos(originalMidAngle)
      const midY_local = drawCenterY + ((ry + iry) / 2) * Math.sin(originalMidAngle)
      const w = rx - irx
      const h = ry - iry

      list.push({
        item,
        index,
        color,
        half: interval.half,
        subIndex: interval.subIndex,
        isStartEdge: interval.isStartEdge,
        isEndEdge: interval.isEndEdge,
        midAngle: subMidAngle,
        originalMidAngle,
        originalTopPath,
        originalOuterWallPath,
        originalInnerWallPath,
        topStrokePath,
        outerWallStrokePath,
        innerWallStrokePath,
        midY,
        topPath,
        outerWallPath,
        innerWallPath,
        startCutPath,
        endCutPath,
        startCutAngle,
        endCutAngle,
        startCutY,
        endCutY,
        x0,
        y0,
        x1,
        y1,
        topGradX1: midX - w / 2,
        topGradY1: midY_local - h / 2,
        topGradX2: midX + w / 2,
        topGradY2: midY_local + h / 2,
        wallY1: y0,
        wallY2: y0 + depth
      })

    })

    currentAngle += sliceAngle
  })

  return list.sort((a, b) => {
    return a.midY - b.midY
  })
})

const uniqueSlices = computed(() => {
  const seen = new Set()
  const result = []
  sortedSlices.value.forEach(slice => {
    if (!seen.has(slice.item.id)) {
      seen.add(slice.item.id)
      result.push(slice)
    }
  })
  return result
})

const isolateHovered = ref(false)

const sliceExtrusions = ref({})
const extrusionTransitions = new Map()

const getExtrusionTransition = (sliceId) => {
  if (!extrusionTransitions.has(sliceId)) {
    const transition = createKineticTransition({
      initialValue: 0,
      duration: props.animationDuration !== undefined ? props.animationDuration : 250,
      timingMode: 'fixed',
      modular: false,
      onUpdate: ({ value }) => {
        sliceExtrusions.value = {
          ...sliceExtrusions.value,
          [sliceId]: value
        }
      },
      onSettled: ({ value }) => {
        if (value <= 0.001) {
          const next = { ...sliceExtrusions.value }
          delete next[sliceId]
          sliceExtrusions.value = next
          if (transitioningSliceId.value === sliceId) {
            transitioningSliceId.value = null
          }
        }
      }
    })
    extrusionTransitions.set(sliceId, transition)
  }
  return extrusionTransitions.get(sliceId)
}

const transitioningSliceId = ref(null)

const isHoverTransitioning = computed(() => {
  return Object.values(sliceExtrusions.value).some(v => v > 0.001) || transitioningSliceId.value !== null
})

watch(effectiveActiveId, (newId, oldId) => {
  if (oldId && oldId !== newId) {
    transitioningSliceId.value = oldId
    const trans = getExtrusionTransition(oldId)
    trans.setTarget(0, { immediate: props.immediate })
  }
  if (newId) {
    transitioningSliceId.value = null
    const trans = getExtrusionTransition(newId)
    trans.setTarget(1, { immediate: props.immediate })
  }
}, { immediate: true })

const activeOrTransitioningId = computed(() => {
  if (effectiveActiveId.value) return effectiveActiveId.value
  if (transitioningSliceId.value) return transitioningSliceId.value
  const entries = Object.entries(sliceExtrusions.value)
  const activeEntry = entries.find(([, v]) => v > 0.001)
  return activeEntry ? activeEntry[0] : null
})

const neighborSliceIds = computed(() => {
  const activeItems = animatedItems.value.filter(item => item.value > 0)
  return getNeighborSliceIds(activeItems, activeOrTransitioningId.value)
})

const shouldRenderStartCut = (slice) => {
  return resolvePartitionCutVisibility({
    sliceItemId: slice.item.id,
    isStartEdge: slice.isStartEdge,
    isEndEdge: slice.isEndEdge,
    effectiveActiveId: activeOrTransitioningId.value,
    leftNeighborId: neighborSliceIds.value.leftNeighborId,
    rightNeighborId: neighborSliceIds.value.rightNeighborId,
    isHoverTransitioning: isHoverTransitioning.value,
    isAnimating: isAnimating.value,
  }).renderStartCut
}

const shouldRenderEndCut = (slice) => {
  return resolvePartitionCutVisibility({
    sliceItemId: slice.item.id,
    isStartEdge: slice.isStartEdge,
    isEndEdge: slice.isEndEdge,
    effectiveActiveId: activeOrTransitioningId.value,
    leftNeighborId: neighborSliceIds.value.leftNeighborId,
    rightNeighborId: neighborSliceIds.value.rightNeighborId,
    isHoverTransitioning: isHoverTransitioning.value,
    isAnimating: isAnimating.value,
  }).renderEndCut
}

const shouldRenderCut = (cut) => {
  if (cut.type === 'start-cut') {
    return shouldRenderStartCut(cut.slice)
  }
  if (cut.type === 'end-cut') {
    return shouldRenderEndCut(cut.slice)
  }
  return false
}

const backSlices = computed(() => {
  return sortedSlices.value.filter(s => s.half === 'back')
})

const frontSlices = computed(() => {
  return sortedSlices.value.filter(s => s.half === 'front')
})

const backCutWallsSorted = computed(() => {
  if (!props.is3D || !props.isExpanded) return []
  const cuts = []
  sortedSlices.value.forEach(slice => {
    if (slice.half !== 'back') return
    if (slice.startCutPath) {
      cuts.push({
        id: `cut-start-${slice.item.id}-${slice.subIndex}`,
        type: 'start-cut',
        slice,
        path: slice.startCutPath,
        fill: getDarkerColor(slice.color, 0.65),
        angle: slice.startCutAngle,
        cutY: slice.startCutY,
        half: 'back'
      })
    }
    if (slice.endCutPath) {
      cuts.push({
        id: `cut-end-${slice.item.id}-${slice.subIndex}`,
        type: 'end-cut',
        slice,
        path: slice.endCutPath,
        fill: getDarkerColor(slice.color, 0.75),
        angle: slice.endCutAngle,
        cutY: slice.endCutY,
        half: 'back'
      })
    }
  })
  return sortCutWallsByDepth(cuts)
})

const frontCutWallsSorted = computed(() => {
  if (!props.is3D || !props.isExpanded) return []
  const cuts = []
  sortedSlices.value.forEach(slice => {
    if (slice.half !== 'front') return
    if (slice.startCutPath) {
      cuts.push({
        id: `cut-start-${slice.item.id}-${slice.subIndex}`,
        type: 'start-cut',
        slice,
        path: slice.startCutPath,
        fill: getDarkerColor(slice.color, 0.65),
        angle: slice.startCutAngle,
        cutY: slice.startCutY,
        half: 'front'
      })
    }
    if (slice.endCutPath) {
      cuts.push({
        id: `cut-end-${slice.item.id}-${slice.subIndex}`,
        type: 'end-cut',
        slice,
        path: slice.endCutPath,
        fill: getDarkerColor(slice.color, 0.75),
        angle: slice.endCutAngle,
        cutY: slice.endCutY,
        half: 'front'
      })
    }
  })
  return sortCutWallsByDepth(cuts)
})


const getSliceStyle = (slice) => {
  const p = sliceExtrusions.value[slice.item.id] !== undefined
    ? sliceExtrusions.value[slice.item.id]
    : (effectiveActiveId.value === slice.item.id ? 1 : 0)

  if (p > 0.0001) {
    const dist = 10 * p
    const tx = dist * Math.cos(slice.originalMidAngle)
    const ty = dist * Math.sin(slice.originalMidAngle)
    return {
      transform: `translate(${tx}px, ${ty}px)`
    }
  }
  if (isolateHovered.value && effectiveActiveId.value) {
    return {
      opacity: 0,
      pointerEvents: 'none'
    }
  }
  return {}
}

const getLabelTextStyle = (label) => {
  const p = sliceExtrusions.value[label.item.id] !== undefined
    ? sliceExtrusions.value[label.item.id]
    : (effectiveActiveId.value === label.item.id ? 1 : 0)
  if (p > 0.0001) {
    return `transform: translate(0, ${-5 * p}px);`
  }
  return ''
}

const getLabelGroupStyle = (label) => {
  const base = { cursor: (props.selectable && !isSingleSlice.value) ? 'pointer' : 'default' }
  if (isolateHovered.value && effectiveActiveId.value && effectiveActiveId.value !== label.item.id) {
    return { ...base, opacity: 0, pointerEvents: 'none' }
  }
  return base
}

const computedLabels = computed(() => {
  if (labelOpacity.value <= 0.001) {
    return { left: [], right: [] }
  }

  const leftList = []
  const rightList = []

  uniqueSlices.value.forEach(slice => {
    const isLeft = Math.cos(slice.originalMidAngle) < 0
    const isBottomHalf = Math.sin(slice.originalMidAngle) > 0
    const depth = animDepth.value
    const adjustedY0 = slice.y0 + (isBottomHalf ? depth : 0)
    const adjustedY1 = slice.y1 + (isBottomHalf ? depth : 0)
    
    const label = {
      item: slice.item,
      index: slice.index,
      color: slice.color,
      x0: slice.x0,
      y0: adjustedY0,
      x1: slice.x1,
      y1: adjustedY1,
      desiredY: adjustedY1,
      finalY: adjustedY1,
      isLeft,
      originalMidAngle: slice.originalMidAngle
    }

    if (isLeft) {
      leftList.push(label)
    } else {
      rightList.push(label)
    }
  })

  resolveCollisions(leftList, 144, 320, 1.0)
  resolveCollisions(rightList, 144, 320, 1.0)

  return {
    left: leftList,
    right: rightList
  }
})

const leftLabels = computed(() => computedLabels.value.left)
const rightLabels = computed(() => computedLabels.value.right)

const getLeaderLinePath = (label) => {
  const p = sliceExtrusions.value[label.item.id] !== undefined
    ? sliceExtrusions.value[label.item.id]
    : (effectiveActiveId.value === label.item.id ? 1 : 0)

  let startX = label.x0
  let startY = label.y0
  let endY = label.finalY

  if (p > 0.0001) {
    const dist = 10 * p
    const tx = dist * Math.cos(label.originalMidAngle || 0)
    const ty = dist * Math.sin(label.originalMidAngle || 0)
    startX += tx
    startY += ty
    endY -= 5 * p
  }

  const R = 30
  const cp1_x = startX + R * Math.cos(label.originalMidAngle || 0)
  const cp1_y = startY + R * Math.sin(label.originalMidAngle || 0)

  const isLeft = label.isLeft
  const isTopHalf = Math.sin(label.originalMidAngle || 0) < 0
  
  const cx = animCx.value
  const rx = animRx.value
  
  const clearanceX = isLeft ? cx - rx - 15 : cx + rx + 15
  
  const cp2_x = isLeft 
    ? Math.min(clearanceX, cp1_x - 30) 
    : Math.max(clearanceX, cp1_x + 30)
    
  const cp2_y = isTopHalf 
    ? Math.min(cp1_y, endY) 
    : Math.max(cp1_y, endY)

  const alignX = isLeft ? 90 : 670
  
  return `M ${startX} ${startY} C ${cp1_x} ${cp1_y}, ${cp2_x} ${cp2_y}, ${alignX} ${endY}`
}

const updateGeometryImmediate = () => {
  if (currentAnimationId) {
    cancelAnimationFrame(currentAnimationId)
    currentAnimationId = null
    isAnimating.value = false
  }

  const is3DMode = props.is3D
  animCx.value = props.isExpanded ? 380 : 60
  animCy.value = props.isExpanded ? 160 : 60
  animRx.value = props.isExpanded ? 180 : 48
  animRy.value = props.isExpanded 
    ? (is3DMode ? 180 * props.slopeRatio : 180) 
    : (is3DMode ? 48 * props.slopeRatio : 48)
  animIrx.value = props.isExpanded 
    ? 180 * (1 - props.thickness) 
    : 48 * (1 - props.thickness)
  animIry.value = props.isExpanded 
    ? (is3DMode ? 180 * (1 - props.thickness) * props.slopeRatio : 180 * (1 - props.thickness)) 
    : (is3DMode ? 48 * (1 - props.thickness) * props.slopeRatio : 48 * (1 - props.thickness))
  
  const baseDepth = (props.isExpanded && is3DMode) ? 32 : 0
  animDepth.value = (is3DMode && props.slopeRatio > 0.5) 
    ? baseDepth * (2 - 2 * props.slopeRatio) 
    : baseDepth
    
  animVbWidth.value = props.isExpanded ? 760 : 120
  animVbHeight.value = props.isExpanded ? 320 : 120
  labelOpacity.value = (props.isExpanded && props.showLabels) ? 1 : 0
}

const animateChart = (customDuration) => {
  const duration = customDuration !== undefined ? customDuration : (props.animationDuration ?? 350)
  if (props.currentLowFxMode || props.immediate || duration <= 0) {
    if (currentAnimationId) {
      cancelAnimationFrame(currentAnimationId)
      currentAnimationId = null
    }
    animatedItems.value.forEach(item => {
      item.value = item.targetValue
      item.percentage = item.targetPercentage !== undefined ? item.targetPercentage : 0
    })
    animatedItems.value = animatedItems.value.filter(item => item.targetValue > 0)
    animatedRotationAngle.value = activeRotationAngle.value
    
    updateGeometryImmediate()
    isAnimating.value = false
    return
  }

  if (currentAnimationId) {
    cancelAnimationFrame(currentAnimationId)
  }

  isAnimating.value = true
  const startTime = performance.now()
  const isModular = props.rotationModular || props.autoRotate
  const startRotation = isModular
    ? normalizeAngle(animatedRotationAngle.value)
    : animatedRotationAngle.value
  const targetRotation = isModular
    ? normalizeAngle(activeRotationAngle.value)
    : activeRotationAngle.value
  const deltaRotation = isModular
    ? shortestAngleDiff(startRotation, targetRotation)
    : (targetRotation - startRotation)

  const startCx = animCx.value
  const startCy = animCy.value
  const startRx = animRx.value
  const startRy = animRy.value
  const startIrx = animIrx.value
  const startIry = animIry.value
  const startDepth = animDepth.value
  const startVbW = animVbWidth.value
  const startVbH = animVbHeight.value
  const startOpacity = labelOpacity.value

  const is3DMode = props.is3D
  const targetCx = props.isExpanded ? 380 : 60
  const targetCy = props.isExpanded ? 160 : 60
  const targetRx = props.isExpanded ? 180 : 48
  const targetRy = props.isExpanded 
    ? (is3DMode ? 180 * props.slopeRatio : 180) 
    : (is3DMode ? 48 * props.slopeRatio : 48)
  const targetIrx = props.isExpanded 
    ? 180 * (1 - props.thickness) 
    : 48 * (1 - props.thickness)
  const targetIry = props.isExpanded 
    ? (is3DMode ? 180 * (1 - props.thickness) * props.slopeRatio : 180 * (1 - props.thickness)) 
    : (is3DMode ? 48 * (1 - props.thickness) * props.slopeRatio : 48 * (1 - props.thickness))
  
  const targetBaseDepth = (props.isExpanded && is3DMode) ? 32 : 0
  const targetDepth = (is3DMode && props.slopeRatio > 0.5) 
    ? targetBaseDepth * (2 - 2 * props.slopeRatio) 
    : targetBaseDepth
    
  const targetVbW = props.isExpanded ? 760 : 120
  const targetVbH = props.isExpanded ? 320 : 120
  const targetOpacity = (props.isExpanded && props.showLabels) ? 1 : 0

  const tick = (now) => {
    const elapsed = now - startTime
    const progress = Math.min(1.0, elapsed / duration)
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    animatedItems.value.forEach(item => {
      item.value = item.startValue + (item.targetValue - item.startValue) * easedProgress
      const startPct = item.startPercentage !== undefined ? item.startPercentage : 0
      const targetPct = item.targetPercentage !== undefined ? item.targetPercentage : 0
      item.percentage = Math.round(startPct + (targetPct - startPct) * easedProgress)
    })

    if (!rotationKinetic.isMoving()) {
      animatedRotationAngle.value = startRotation + deltaRotation * easedProgress
    }

    animCx.value = startCx + (targetCx - startCx) * easedProgress
    animCy.value = startCy + (targetCy - startCy) * easedProgress
    animRx.value = startRx + (targetRx - startRx) * easedProgress
    animRy.value = startRy + (targetRy - startRy) * easedProgress
    animIrx.value = startIrx + (targetIrx - startIrx) * easedProgress
    animIry.value = startIry + (targetIry - startIry) * easedProgress
    animDepth.value = startDepth + (targetDepth - startDepth) * easedProgress
    animVbWidth.value = startVbW + (targetVbW - startVbW) * easedProgress
    animVbHeight.value = startVbH + (targetVbH - startVbH) * easedProgress
    labelOpacity.value = startOpacity + (targetOpacity - startOpacity) * easedProgress

    if (progress < 1.0) {
      currentAnimationId = requestAnimationFrame(tick)
    } else {
      currentAnimationId = null
      if (!rotationKinetic.isMoving()) {
        animatedRotationAngle.value = targetRotation
      }
      animatedItems.value.forEach(item => {
        item.value = item.targetValue
        item.percentage = item.targetPercentage !== undefined ? item.targetPercentage : 0
      })
      animatedItems.value = animatedItems.value.filter(item => item.targetValue > 0)
      
      animCx.value = targetCx
      animCy.value = targetCy
      animRx.value = targetRx
      animRy.value = targetRy
      animIrx.value = targetIrx
      animIry.value = targetIry
      animDepth.value = targetDepth
      animVbWidth.value = targetVbW
      animVbHeight.value = targetVbH
      labelOpacity.value = targetOpacity
      
      isAnimating.value = false
    }
  }

  currentAnimationId = requestAnimationFrame(tick)
}

const isLastSubSlice = (slice) => {
  if (slice.isSingleSlice) {
    return true
  }
  const list = sortedSlices.value
  let lastIdx = -1
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].item.id === slice.item.id) {
      lastIdx = i
      break
    }
  }
  const idx = list.indexOf(slice)
  return idx === lastIdx
}

// Initial synchronous data population for instant SSR / first render
updateAnimatedData(normalizedData.value || [], true)

watch(normalizedData, (newData) => {
  const isImmediate = props.immediate || props.currentLowFxMode
  updateAnimatedData(newData || [], isImmediate)

  if (!isImmediate) {
    animateChart()
  }
}, { deep: true })

watch([activeRotationAngle, () => props.rotationAngle, () => props.autoRotate], () => {
  const isImmediate = props.immediate || props.currentLowFxMode || props.immediateRotation || (props.animationDuration ?? 350) <= 0
  const effDuration = props.rotationDuration !== undefined 
    ? props.rotationDuration 
    : (props.animationDuration !== undefined ? props.animationDuration : 350)

  rotationKinetic.setConfig({
    duration: effDuration,
    timingMode: props.rotationTimingMode || 'fixed',
    modular: props.rotationModular || props.autoRotate || false,
  })

  if (isImmediate) {
    rotationKinetic.setTarget(activeRotationAngle.value, { immediate: true })
  } else {
    rotationKinetic.setTarget(activeRotationAngle.value)
  }
})

watch(() => props.slopeRatio, () => {
  if (props.immediate || props.currentLowFxMode) {
    updateGeometryImmediate()
  } else {
    animateChart()
  }
})

watch(() => props.thickness, () => {
  if (props.immediate || props.currentLowFxMode) {
    updateGeometryImmediate()
  } else {
    animateChart()
  }
})

watch(() => props.isExpanded, () => {
  nextTick(() => {
    if (props.immediate || props.currentLowFxMode) {
      updateGeometryImmediate()
    } else {
      animateChart()
    }
  })
})

watch(() => props.is3D, () => {
  nextTick(() => {
    if (props.immediate || props.currentLowFxMode) {
      updateGeometryImmediate()
    } else {
      animateChart()
    }
  })
})

watch(() => props.showLabels, () => {
  nextTick(() => {
    if (props.immediate || props.currentLowFxMode) {
      updateGeometryImmediate()
    } else {
      animateChart()
    }
  })
})

watch(() => props.hoveredItemId, (newId) => {
  if (activeHoveredId.value !== newId) {
    activeHoveredId.value = newId
  }
})

watch(activeHoveredId, (newId) => {
  if (props.hoveredItemId !== newId) {
    emit('update:hoveredItemId', newId)
  }
})

watch(() => props.animationDuration, (newDur) => {
  extrusionTransitions.forEach((trans) => {
    trans.setConfig({ duration: newDur ?? 250 })
  })
})

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'fullOpacity', {
        get: () => isolateHovered.value,
        set: (v) => { isolateHovered.value = !!v },
        configurable: true
      })
    } catch (e) {
      // Ignore in SSR
    }
  }
  nextTick(() => {
    animateChart()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  if (typeof window !== 'undefined') {
    try {
      delete window.fullOpacity
    } catch (e) {}
  }
  if (currentAnimationId) {
    cancelAnimationFrame(currentAnimationId)
  }
  rotationKinetic.destroy()
  extrusionTransitions.forEach((trans) => trans.destroy())
  extrusionTransitions.clear()
})

defineExpose({
  redraw: () => {
    if (currentAnimationId) cancelAnimationFrame(currentAnimationId)
    currentAnimationId = null
    animatedItems.value.forEach(item => {
      item.value = item.targetValue
    })
    animatedItems.value = animatedItems.value.filter(item => item.targetValue > 0)
  }
})
</script>

<style scoped>
.donut-canvas-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width var(--nano-transition-motion), height var(--nano-transition-motion);
}

.donut-canvas-wrapper.is-expanded {
  width: 100%;
  max-width: 760px;
  height: 320px;
}

@media (max-width: 760px) {
  .donut-canvas-wrapper.is-expanded {
    height: 42vw;
  }
}

.items-svg-chart {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

/* Beautiful Interactive 3D hover effects */
.slice-group-3d {
  cursor: pointer;
  transition: opacity var(--nano-transition-interactive);
}

.slice-group-3d.is-dimmed {
  opacity: 0.35;
}

/* Hover highlights for leader lines and text */
.label-group {
  transition: opacity var(--nano-transition-interactive);
}

.label-group path {
  transition: stroke-width var(--nano-transition-interactive), opacity var(--nano-transition-interactive);
}

.label-group text {
  transition: font-weight var(--nano-transition-interactive), opacity var(--nano-transition-interactive);
}

.label-group.is-hovered path {
  stroke-width: 2.2px;
}

.label-group.is-hovered text {
  font-weight: 700;
}

.label-group.is-dimmed {
  opacity: 0.25;
}

/* Disable transitions during animations and dragging to keep elements synchronized */
.no-transitions .label-group,
.no-transitions .label-group path,
.no-transitions .label-group text,
.no-transitions .slice-group-3d {
  transition: none;
}

.center-text-value {
  fill: var(--nano-text-main, #ffffff);
  filter: drop-shadow(0px 0px 3px var(--nano-bg-app, rgba(0, 0, 0, 0.8)));
}

.center-text-label {
  fill: var(--nano-text-muted, #94a3b8);
  filter: drop-shadow(0px 0px 2px var(--nano-bg-app, rgba(0, 0, 0, 0.8)));
}
</style>
