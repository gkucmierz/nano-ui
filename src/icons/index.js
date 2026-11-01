/**
 * @file src/icons/index.js
 * @description Single Source of Truth (SSoT) for Nano UI icons.
 * Powered by Lucide (lucide-vue-next) with support for custom ecosystem icons.
 */

import { h } from 'vue';
import {
  TriangleAlert,
  Info,
  CircleCheck,
  CircleAlert,
  CircleHelp,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Menu,
  X,
  Ellipsis,
  EllipsisVertical,
  ExternalLink,
  Check,
  Copy,
  Search,
  Plus,
  Minus,
  Trash2,
  Pencil,
  RefreshCw,
  Filter,
  Download,
  Upload,
  Share2,
  Link,
  Save,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Settings,
  SlidersHorizontal,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Loader2,
  Database,
  Table,
  Terminal,
  Code,
  Layers,
  Activity,
  Cpu,
  Server,
  GitBranch,
  GitCommitHorizontal,
  Play,
  Pause,
  Square,
  Box,
  Cloud,
  CloudDownload,
  Wifi,
  WifiOff,
  File,
  FileText,
  Folder,
  Image,
  User,
  Users,
  Calendar,
  Clock,
  Hash,
  Star,
  Globe,
  Sparkles,
  BookOpen,
  Layout,
  Shield,
  Key,
  History,
  List,
  Map,
  MapPin,
  Compass,
  Navigation,
  Crosshair,
  Locate,
  LocateFixed,
  Route,
  Ruler,
  Mountain,
  Zap
} from 'lucide-vue-next';

/**
 * Custom dual-tone cartographic compass rose icon (4 cardinal dots + North/South diamond needle).
 */
export const CompassRoseIcon = (props = {}) => {
  const size = props.size ?? 18;
  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': 'true'
    },
    [
      // 4 Cardinal Dots (N, E, S, W)
      h('circle', { cx: 12, cy: 3.5, r: 1.15, fill: '#94a3b8' }),
      h('circle', { cx: 20.5, cy: 12, r: 1.15, fill: '#94a3b8' }),
      h('circle', { cx: 12, cy: 20.5, r: 1.15, fill: '#94a3b8' }),
      h('circle', { cx: 3.5, cy: 12, r: 1.15, fill: '#94a3b8' }),
      // North Needle (Red)
      h('polygon', { points: '12,5.6 15.1,12 8.9,12', fill: '#ef4444' }),
      // South Needle (Slate)
      h('polygon', { points: '12,18.4 15.1,12 8.9,12', fill: '#64748b' })
    ]
  );
};
CompassRoseIcon.colorable = false;

export const NON_COLORABLE_ICONS = new Set(['compass-rose']);

export const BUILTIN_ICONS = {
  // Status & Feedback
  warn: TriangleAlert,
  'triangle-alert': TriangleAlert,
  'alert-triangle': TriangleAlert,
  info: Info,
  success: CircleCheck,
  'circle-check': CircleCheck,
  'check-circle': CircleCheck,
  danger: CircleAlert,
  'circle-alert': CircleAlert,
  'alert-circle': CircleAlert,
  help: CircleHelp,
  'circle-help': CircleHelp,
  'help-circle': CircleHelp,
  bell: Bell,
  'bell-off': BellOff,

  // Navigation & Direction
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-down': ArrowDown,
  'arrow-up': ArrowUp,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  menu: Menu,
  close: X,
  x: X,
  'more-horizontal': Ellipsis,
  'more-h': Ellipsis,
  'more-vertical': EllipsisVertical,
  'more-v': EllipsisVertical,
  'external-link': ExternalLink,

  // Actions & Editing
  check: Check,
  copy: Copy,
  search: Search,
  plus: Plus,
  minus: Minus,
  trash: Trash2,
  delete: Trash2,
  'trash-2': Trash2,
  edit: Pencil,
  pencil: Pencil,
  refresh: RefreshCw,
  rotate: RefreshCw,
  'refresh-cw': RefreshCw,
  filter: Filter,
  download: Download,
  upload: Upload,
  share: Share2,
  'share-2': Share2,
  link: Link,
  save: Save,

  // Controls & Display
  sun: Sun,
  moon: Moon,
  eye: Eye,
  'eye-off': EyeOff,
  settings: Settings,
  gear: Settings,
  sliders: SlidersHorizontal,
  tune: SlidersHorizontal,
  adjust: SlidersHorizontal,
  lock: Lock,
  unlock: LockOpen,
  maximize: Maximize2,
  expand: Maximize2,
  minimize: Minimize2,
  collapse: Minimize2,
  spinner: Loader2,
  loader: Loader2,

  // Data, Code & System
  database: Database,
  table: Table,
  terminal: Terminal,
  code: Code,
  layers: Layers,
  activity: Activity,
  pulse: Activity,
  cpu: Cpu,
  server: Server,
  'git-branch': GitBranch,
  'git-commit': GitCommitHorizontal,
  play: Play,
  pause: Pause,
  square: Square,
  box: Box,
  package: Box,
  cloud: Cloud,
  'cloud-download': CloudDownload,
  wifi: Wifi,
  'wifi-off': WifiOff,

  // Content, Layout & Media
  file: File,
  'file-text': FileText,
  folder: Folder,
  image: Image,
  user: User,
  users: Users,
  calendar: Calendar,
  clock: Clock,
  hash: Hash,
  star: Star,
  globe: Globe,
  sparkles: Sparkles,
  'book-open': BookOpen,
  book: BookOpen,
  layout: Layout,
  grid: Layout,
  shield: Shield,
  key: Key,
  history: History,
  list: List,

  // Map, Geolocation & Telemetry
  map: Map,
  'map-pin': MapPin,
  pin: MapPin,
  compass: Compass,
  'compass-rose': CompassRoseIcon,
  navigation: Navigation,
  crosshair: Crosshair,
  target: Crosshair,
  locate: Locate,
  'locate-fixed': LocateFixed,
  gps: LocateFixed,
  route: Route,
  ruler: Ruler,
  mountain: Mountain,
  elevation: Mountain,
  zap: Zap
};

export const customIconsRegistry = {};

export const registerIcons = (newIcons) => {
  if (newIcons && typeof newIcons === 'object') {
    Object.assign(customIconsRegistry, newIcons);
  }
};

export const getAvailableIcons = () => {
  return Array.from(new Set([
    ...Object.keys(BUILTIN_ICONS),
    ...Object.keys(customIconsRegistry)
  ])).sort();
};

/**
 * Returns true if the icon inherits `currentColor` and `strokeWidth` (monochrome stroke/fill),
 * or false if it uses a fixed multi-color palette (e.g. `compass-rose` with red North needle).
 *
 * @param {string} name
 * @returns {boolean}
 */
export const isIconColorable = (name) => {
  if (!name) return true;
  if (NON_COLORABLE_ICONS.has(name)) return false;
  const comp = customIconsRegistry[name] || BUILTIN_ICONS[name];
  if (comp && comp.colorable === false) return false;
  return true;
};
