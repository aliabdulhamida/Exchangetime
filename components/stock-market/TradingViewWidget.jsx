'use client';

import {
  BellPlus,
  Check,
  ChevronDown,
  Loader2,
  Search,
  SlidersHorizontal,
  Star,
  WandSparkles,
} from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WIDGET_SCRIPT_SRC =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
const LAYOUT_STORAGE_KEY = 'et_ta_layout_v3';
const LEGACY_LAYOUT_STORAGE_KEY = 'et_ta_layout_v2';
const FAVORITES_STORAGE_KEY = 'et_ta_favorites_v1';
const RECENTS_STORAGE_KEY = 'et_ta_recents_v1';
const ALERTS_STORAGE_KEY = 'et_ta_alerts_v2';
const LEGACY_ALERTS_STORAGE_KEY = 'et_ta_alerts_v1';
const MOBILE_UI_STORAGE_KEY = 'et_ta_mobile_ui_v1';
const DEFAULT_SYMBOL = 'AAPL';
const DEFAULT_INTERVAL = 'D';
const MAX_RECENTS = 8;
const MAX_FAVORITES = 48;
const MAX_ALERTS = 12;
const DEFAULT_FAVORITES = [
  'AAPL',
  'NVDA',
  'MSFT',
  'TSLA',
  'SPY',
  'QQQ',
  'VOO',
  'IWM',
  'DIA',
  'BTCUSD',
  'AMZN',
  'META',
];
const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', 'QQQ', 'BTCUSD'];
const PANE_KEYS = ['left', 'right'];
const MOBILE_CONTROL_TABS = ['preset', 'indicators', 'alerts', 'lists', 'chart'];

const INTERVAL_OPTIONS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: '240', label: '4h' },
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' },
  { value: 'M', label: 'All' },
];

const QUICK_INTERVALS = [
  { value: 'all', label: 'All' },
  { value: 'W', label: '1W' },
  { value: 'D', label: '1D' },
  { value: '240', label: '4H' },
  { value: '60', label: '1H' },
  { value: '15', label: '15m' },
  { value: '5', label: '5m' },
  { value: '1', label: '1m' },
];

const INDICATOR_OPTIONS = [
  { key: 'sma', label: 'SMA', study: 'STD;SMA' },
  { key: 'ema', label: 'EMA', study: 'STD;EMA' },
  { key: 'rsi', label: 'RSI', study: 'STD;RSI' },
  { key: 'macd', label: 'MACD', study: 'STD;MACD' },
  { key: 'bb', label: 'Bollinger', study: 'STD;BB' },
  { key: 'vwap', label: 'VWAP', study: 'STD;VWAP' },
];

const INDICATOR_CATEGORIES = {
  sma: 'Trend',
  ema: 'Trend',
  rsi: 'Momentum',
  macd: 'Momentum',
  bb: 'Volatility',
  vwap: 'Price/Volume',
};

const INDICATOR_KEY_SET = new Set(INDICATOR_OPTIONS.map((option) => option.key));
const INDICATOR_STUDY_BY_KEY = Object.fromEntries(
  INDICATOR_OPTIONS.map((option) => [option.key, option.study]),
);

const PRESETS = {
  trend: {
    label: 'Trend',
    interval: 'D',
    indicators: ['sma', 'ema', 'macd', 'rsi'],
  },
  swing: {
    label: 'Swing',
    interval: '240',
    indicators: ['ema', 'macd', 'rsi', 'bb'],
  },
  scalping: {
    label: 'Scalping',
    interval: '5',
    indicators: ['ema', 'vwap', 'rsi'],
  },
  breakout: {
    label: 'Breakout',
    interval: '60',
    indicators: ['ema', 'vwap', 'bb', 'rsi'],
  },
  momentum: {
    label: 'Momentum',
    interval: '60',
    indicators: ['ema', 'macd', 'rsi'],
  },
  mean_reversion: {
    label: 'Mean Reversion',
    interval: '15',
    indicators: ['bb', 'rsi', 'sma'],
  },
  position: {
    label: 'Position',
    interval: 'W',
    indicators: ['sma', 'ema', 'rsi'],
  },
  intraday: {
    label: 'Intraday',
    interval: '15',
    indicators: ['ema', 'vwap', 'macd'],
  },
};

const PRESET_OPTIONS = [
  { value: 'custom', label: 'Custom' },
  ...Object.entries(PRESETS).map(([key, value]) => ({ value: key, label: value.label })),
];

const CHART_STYLE_OPTIONS = [
  { value: '1', label: 'Candles' },
  { value: '2', label: 'Bars' },
  { value: '3', label: 'Line' },
];

const ALERT_TYPE_OPTIONS = [
  { key: 'price_above', label: 'Price Above' },
  { key: 'price_below', label: 'Price Below' },
  { key: 'ma_cross', label: 'MA Cross' },
  { key: 'rsi_zone', label: 'RSI Zone' },
];

const ALERT_TYPE_SET = new Set(ALERT_TYPE_OPTIONS.map((option) => option.key));

function getAlertTypeLabel(typeKey) {
  return ALERT_TYPE_OPTIONS.find((option) => option.key === typeKey)?.label ?? 'Alert';
}

function getDefaultAlertParams(typeKey) {
  switch (typeKey) {
    case 'price_above':
    case 'price_below':
      return { threshold: '' };
    case 'ma_cross':
      return { direction: 'above', fastLength: '9', slowLength: '21' };
    case 'rsi_zone':
      return { mode: 'above', level: '70' };
    default:
      return {};
  }
}

function sanitizeAlertParams(typeKey, rawParams) {
  const defaults = getDefaultAlertParams(typeKey);
  const raw = rawParams && typeof rawParams === 'object' ? rawParams : {};
  return {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : String(value ?? ''),
      ]),
    ),
  };
}

function formatAlertNumber(value, fallback = '?') {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function buildAlertCondition(symbol, typeKey, params) {
  switch (typeKey) {
    case 'price_above':
      return `${symbol} > ${formatAlertNumber(params.threshold, 'target price')}`;
    case 'price_below':
      return `${symbol} < ${formatAlertNumber(params.threshold, 'target price')}`;
    case 'ma_cross':
      return `${symbol} crosses ${params.direction === 'below' ? 'below' : 'above'} EMA(${formatAlertNumber(
        params.fastLength,
        '9',
      )}) vs EMA(${formatAlertNumber(params.slowLength, '21')})`;
    case 'rsi_zone':
      return `RSI ${params.mode === 'below' ? 'falls below' : 'moves above'} ${formatAlertNumber(params.level, '70')}`;
    default:
      return `${symbol} alert`;
  }
}

function validateAlertParams(typeKey, params) {
  const isFiniteNumber = (value) => Number.isFinite(Number(value));
  const isPositiveNumber = (value) => isFiniteNumber(value) && Number(value) > 0;

  switch (typeKey) {
    case 'price_above':
    case 'price_below':
      if (!isFiniteNumber(params.threshold))
        return { valid: false, message: 'Set a valid target price.' };
      return { valid: true };
    case 'ma_cross': {
      if (!isPositiveNumber(params.fastLength) || !isPositiveNumber(params.slowLength)) {
        return { valid: false, message: 'Set valid MA lengths.' };
      }
      if (Number(params.fastLength) === Number(params.slowLength)) {
        return { valid: false, message: 'Use different fast and slow lengths.' };
      }
      return { valid: true };
    }
    case 'rsi_zone':
      if (!isFiniteNumber(params.level)) return { valid: false, message: 'Set a valid RSI level.' };
      if (Number(params.level) < 0 || Number(params.level) > 100) {
        return { valid: false, message: 'RSI level must be between 0 and 100.' };
      }
      return { valid: true };
    default:
      return { valid: false, message: 'Choose a valid alert type.' };
  }
}

function resolveAlertCondition(symbol, alert) {
  if (!alert || typeof alert !== 'object') return `${symbol} alert`;
  if (!ALERT_TYPE_SET.has(alert.key)) {
    return typeof alert.condition === 'string' ? alert.condition : `${symbol} alert`;
  }
  const params = sanitizeAlertParams(alert.key, alert.params);
  return buildAlertCondition(symbol, alert.key, params);
}

function normalizeSymbol(raw) {
  const cleaned = String(raw || '')
    .replace(/\s+/g, '')
    .toUpperCase();
  return cleaned || DEFAULT_SYMBOL;
}

function uniqueSymbols(values) {
  return Array.from(new Set(values.map((value) => normalizeSymbol(value)).filter(Boolean)));
}

function parseEtWatchlist(rawWatchlist) {
  if (!Array.isArray(rawWatchlist)) return [];
  const tickers = rawWatchlist.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && typeof item.ticker === 'string') return item.ticker;
    return '';
  });
  return uniqueSymbols(tickers);
}

function readJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidInterval(value) {
  return INTERVAL_OPTIONS.some((option) => option.value === value);
}

function intervalLabel(value) {
  return INTERVAL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function getNextInterval(value) {
  const order = INTERVAL_OPTIONS.map((option) => option.value);
  const idx = order.indexOf(value);
  if (idx < 0) return 'D';
  return order[Math.min(idx + 1, order.length - 1)];
}

function makeDefaultPane(
  symbol = DEFAULT_SYMBOL,
  interval = DEFAULT_INTERVAL,
  presetKey = 'trend',
) {
  const preset = PRESETS[presetKey] ?? PRESETS.trend;
  const resolvedInterval = isValidInterval(interval) ? interval : preset.interval;
  const resolvedSymbol = normalizeSymbol(symbol);

  return {
    symbol: resolvedSymbol,
    symbolInput: resolvedSymbol,
    interval: resolvedInterval,
    indicatorKeys: [...preset.indicators],
    presetKey,
    chartStyle: '1',
    showLegend: false,
    showVolume: false,
    showDateRanges: false,
    showCalendar: false,
    showDetails: false,
    useLocalTimezone: false,
    showGrid: true,
  };
}

function sanitizePane(raw, fallbackSymbol = DEFAULT_SYMBOL) {
  const symbol = normalizeSymbol(raw?.symbol || fallbackSymbol);
  const interval = isValidInterval(raw?.interval) ? raw.interval : DEFAULT_INTERVAL;
  const indicatorKeys = Array.isArray(raw?.indicatorKeys)
    ? raw.indicatorKeys.filter((key) => INDICATOR_KEY_SET.has(key))
    : PRESETS.trend.indicators;
  const presetKey =
    typeof raw?.presetKey === 'string' && (raw.presetKey === 'custom' || PRESETS[raw.presetKey])
      ? raw.presetKey
      : 'custom';

  return {
    symbol,
    symbolInput: normalizeSymbol(raw?.symbolInput || symbol),
    interval,
    indicatorKeys: indicatorKeys.length > 0 ? indicatorKeys : PRESETS.trend.indicators,
    presetKey,
    chartStyle:
      typeof raw?.chartStyle === 'string' &&
      CHART_STYLE_OPTIONS.some((option) => option.value === raw.chartStyle)
        ? raw.chartStyle
        : '1',
    showLegend: typeof raw?.showLegend === 'boolean' ? raw.showLegend : false,
    showVolume: typeof raw?.showVolume === 'boolean' ? raw.showVolume : false,
    showDateRanges: typeof raw?.showDateRanges === 'boolean' ? raw.showDateRanges : false,
    showCalendar: typeof raw?.showCalendar === 'boolean' ? raw.showCalendar : false,
    showDetails: typeof raw?.showDetails === 'boolean' ? raw.showDetails : false,
    useLocalTimezone: typeof raw?.useLocalTimezone === 'boolean' ? raw.useLocalTimezone : false,
    showGrid: typeof raw?.showGrid === 'boolean' ? raw.showGrid : true,
  };
}

function getInitialState() {
  if (typeof window === 'undefined') {
    return {
      leftPane: makeDefaultPane(DEFAULT_SYMBOL, 'D', 'trend'),
      rightPane: makeDefaultPane(DEFAULT_SYMBOL, DEFAULT_INTERVAL, 'trend'),
      favorites: DEFAULT_FAVORITES.slice(0, MAX_FAVORITES),
      recents: [DEFAULT_SYMBOL],
      alertsByPane: { left: [], right: [] },
      externalWatchlist: DEFAULT_WATCHLIST,
    };
  }

  const readFavorites = () => {
    const storedFavorites = readJSON(FAVORITES_STORAGE_KEY, null);
    if (Array.isArray(storedFavorites)) {
      const normalized = uniqueSymbols(storedFavorites).slice(0, MAX_FAVORITES);
      return normalized.length > 0 ? normalized : DEFAULT_FAVORITES.slice(0, MAX_FAVORITES);
    }
    return DEFAULT_FAVORITES.slice(0, MAX_FAVORITES);
  };

  const layoutV3 = readJSON(LAYOUT_STORAGE_KEY, null);
  if (layoutV3?.leftPane && layoutV3?.rightPane) {
    const leftPane = sanitizePane(layoutV3.leftPane, DEFAULT_SYMBOL);
    const rightPane = sanitizePane(layoutV3.rightPane, leftPane.symbol || DEFAULT_SYMBOL);

    return {
      leftPane,
      rightPane,
      favorites: readFavorites(),
      recents: uniqueSymbols(readJSON(RECENTS_STORAGE_KEY, [])).slice(0, MAX_RECENTS),
      alertsByPane: readAlertsByPane(),
      externalWatchlist: getExternalWatchlist(),
    };
  }

  const legacy = readJSON(LEGACY_LAYOUT_STORAGE_KEY, {});
  const legacySymbol = normalizeSymbol(
    legacy.symbol || window.localStorage.getItem('portfolioSelectedSymbol'),
  );

  const rightPane = sanitizePane(
    {
      symbol: legacySymbol,
      symbolInput: legacySymbol,
      interval: legacy.interval,
      indicatorKeys: legacy.indicatorKeys,
      presetKey: legacy.presetKey,
      chartStyle: legacy.chartStyle,
      showLegend: legacy.showLegend,
      showVolume: legacy.showVolume,
      showDateRanges: legacy.showDateRanges,
      showCalendar: legacy.showCalendar,
      showDetails: legacy.showDetails,
      useLocalTimezone: legacy.useLocalTimezone,
      showGrid: legacy.showGrid,
    },
    legacySymbol,
  );

  const leftPane = sanitizePane(
    {
      ...rightPane,
      interval: getNextInterval(rightPane.interval),
      presetKey: 'custom',
      symbolInput: rightPane.symbol,
    },
    rightPane.symbol,
  );

  return {
    leftPane,
    rightPane,
    favorites: readFavorites(),
    recents: uniqueSymbols(readJSON(RECENTS_STORAGE_KEY, [])).slice(0, MAX_RECENTS),
    alertsByPane: readAlertsByPane(),
    externalWatchlist: getExternalWatchlist(),
  };
}

function sanitizeAlertRecord(item) {
  if (!item || typeof item !== 'object' || typeof item.id !== 'string') return null;
  const key = ALERT_TYPE_SET.has(item.key) ? item.key : 'legacy';
  const params = key === 'legacy' ? {} : sanitizeAlertParams(key, item.params);
  const fallbackCondition =
    key === 'legacy' ? `${DEFAULT_SYMBOL} alert` : buildAlertCondition(DEFAULT_SYMBOL, key, params);

  return {
    id: item.id,
    key,
    label: typeof item.label === 'string' ? item.label : getAlertTypeLabel(key),
    condition:
      typeof item.condition === 'string' && item.condition.trim().length > 0
        ? item.condition
        : fallbackCondition,
    enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    params,
  };
}

function sanitizeAlerts(rawAlerts) {
  if (!Array.isArray(rawAlerts)) return [];

  return rawAlerts.map(sanitizeAlertRecord).filter(Boolean).slice(0, MAX_ALERTS);
}

function readAlertsByPane() {
  const byPaneRaw = readJSON(ALERTS_STORAGE_KEY, null);
  if (byPaneRaw && typeof byPaneRaw === 'object' && !Array.isArray(byPaneRaw)) {
    return {
      left: sanitizeAlerts(byPaneRaw.left),
      right: sanitizeAlerts(byPaneRaw.right),
    };
  }

  const legacyAlerts = readJSON(LEGACY_ALERTS_STORAGE_KEY, []);
  if (Array.isArray(legacyAlerts)) {
    return {
      left: [],
      right: sanitizeAlerts(legacyAlerts),
    };
  }

  return {
    left: [],
    right: [],
  };
}

function getExternalWatchlist() {
  const external = parseEtWatchlist(readJSON('et_watchlist', []));
  return external.length > 0 ? external : DEFAULT_WATCHLIST;
}

function getInitialMobileUiState() {
  const defaults = {
    lastTab: 'preset',
    sheetOpenLast: false,
  };
  if (typeof window === 'undefined') return defaults;

  const parsed = readJSON(MOBILE_UI_STORAGE_KEY, defaults);
  const hasValidTab =
    parsed && typeof parsed.lastTab === 'string' && MOBILE_CONTROL_TABS.includes(parsed.lastTab);

  return {
    lastTab: hasValidTab ? parsed.lastTab : defaults.lastTab,
    sheetOpenLast:
      parsed && typeof parsed.sheetOpenLast === 'boolean'
        ? parsed.sheetOpenLast
        : defaults.sheetOpenLast,
  };
}

function makeAlertComposer(typeKey = 'price_above') {
  return {
    typeKey,
    params: getDefaultAlertParams(typeKey),
  };
}

function buildWidgetConfig(pane, studies, timezone) {
  return JSON.stringify({
    allow_symbol_change: false,
    calendar: pane.showCalendar,
    details: pane.showDetails,
    hide_legend: !pane.showLegend,
    hide_side_toolbar: true,
    hide_top_toolbar: true,
    hide_volume: !pane.showVolume,
    hotlist: false,
    interval: pane.interval,
    locale: 'en',
    save_image: true,
    style: pane.chartStyle,
    studies,
    symbol: pane.symbol,
    theme: 'dark',
    timezone: pane.useLocalTimezone ? timezone : 'Etc/UTC',
    withdateranges: pane.showDateRanges,
    watchlist: [],
    compareSymbols: [],
    autosize: true,
    load_last_chart: true,
    backgroundColor: 'rgba(0, 0, 0, 1)',
    gridColor: pane.showGrid ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0)',
  });
}

function TradingViewWidget() {
  const shellRef = useRef(null);
  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);

  const [bootstrap] = useState(() => getInitialState());
  const [mobileUiBootstrap] = useState(() => getInitialMobileUiState());

  const [panes, setPanes] = useState({
    left: bootstrap.leftPane,
    right: bootstrap.rightPane,
  });

  const [favorites, setFavorites] = useState(bootstrap.favorites);
  const [recents, setRecents] = useState(
    bootstrap.recents.length > 0 ? bootstrap.recents : [bootstrap.rightPane.symbol],
  );
  const [alertsByPane, setAlertsByPane] = useState(bootstrap.alertsByPane);
  const [alertComposerByPane, setAlertComposerByPane] = useState({
    left: makeAlertComposer(),
    right: makeAlertComposer(),
  });
  const [externalWatchlist, setExternalWatchlist] = useState(bootstrap.externalWatchlist);

  const [desktopPanels, setDesktopPanels] = useState({ left: 'none', right: 'none' });
  const [mobileSheetOpen, setMobileSheetOpen] = useState(mobileUiBootstrap.sheetOpenLast);
  const [mobileSheetTab, setMobileSheetTab] = useState(mobileUiBootstrap.lastTab);

  const [isLgUp, setIsLgUp] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [leftLoading, setLeftLoading] = useState(true);
  const [rightLoading, setRightLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [localTimezone, setLocalTimezone] = useState('Etc/UTC');

  const symbolSuggestions = useMemo(
    () =>
      uniqueSymbols([
        panes.left.symbol,
        panes.right.symbol,
        ...favorites,
        ...recents,
        ...externalWatchlist,
        ...DEFAULT_WATCHLIST,
      ]),
    [externalWatchlist, favorites, panes.left.symbol, panes.right.symbol, recents],
  );

  const watchlistForWidget = useMemo(() => {
    const normalized = uniqueSymbols(favorites);
    return normalized.length > 0 ? normalized : DEFAULT_FAVORITES;
  }, [favorites]);

  const studiesByPane = useMemo(
    () => ({
      left: panes.left.indicatorKeys
        .map((key) => INDICATOR_STUDY_BY_KEY[key])
        .filter((study) => typeof study === 'string'),
      right: panes.right.indicatorKeys
        .map((key) => INDICATOR_STUDY_BY_KEY[key])
        .filter((study) => typeof study === 'string'),
    }),
    [panes.left.indicatorKeys, panes.right.indicatorKeys],
  );

  const widgetConfigLeft = useMemo(
    () => buildWidgetConfig(panes.left, studiesByPane.left, localTimezone),
    [localTimezone, panes.left, studiesByPane.left],
  );

  const widgetConfigRight = useMemo(
    () => buildWidgetConfig(panes.right, studiesByPane.right, localTimezone),
    [localTimezone, panes.right, studiesByPane.right],
  );

  const setPaneState = useCallback((paneKey, updater) => {
    setPanes((current) => {
      const nextPane =
        typeof updater === 'function'
          ? updater(current[paneKey])
          : { ...current[paneKey], ...updater };
      return { ...current, [paneKey]: nextPane };
    });
  }, []);

  const currentPresetLabel = useCallback(
    (paneKey) => {
      const pane = panes[paneKey];
      return pane.presetKey === 'custom' ? 'Custom' : (PRESETS[pane.presetKey]?.label ?? 'Custom');
    },
    [panes],
  );

  const toggleDesktopPanel = useCallback((paneKey, panelKey) => {
    setDesktopPanels((current) => ({
      ...current,
      [paneKey]: current[paneKey] === panelKey ? 'none' : panelKey,
    }));
  }, []);

  const applySymbol = useCallback(
    (paneKey, rawSymbol) => {
      const next = normalizeSymbol(rawSymbol);
      setPaneState(paneKey, (pane) => ({ ...pane, symbol: next, symbolInput: next }));
      setRecents((current) => uniqueSymbols([next, ...current]).slice(0, MAX_RECENTS));
      setStatusMessage(`Loaded ${next}`);
    },
    [setPaneState],
  );

  const handleSymbolSubmit = useCallback(
    (paneKey, event) => {
      event.preventDefault();
      applySymbol(paneKey, panes[paneKey].symbolInput);
    },
    [applySymbol, panes],
  );

  const handleToggleFavorite = useCallback(
    (paneKey) => {
      const symbol = panes[paneKey].symbol;
      setFavorites((current) => {
        if (current.includes(symbol)) return current.filter((item) => item !== symbol);
        return uniqueSymbols([symbol, ...current]).slice(0, MAX_FAVORITES);
      });
    },
    [panes],
  );

  const selectWatchlistSymbol = useCallback(
    (paneKey, symbol) => {
      const next = normalizeSymbol(symbol);
      applySymbol(paneKey, next);
      setFavorites((current) => uniqueSymbols([next, ...current]).slice(0, MAX_FAVORITES));
    },
    [applySymbol],
  );

  const handleToggleIndicator = useCallback(
    (paneKey, indicatorKey) => {
      setPaneState(paneKey, (pane) => {
        const indicatorKeys = pane.indicatorKeys.includes(indicatorKey)
          ? pane.indicatorKeys.filter((key) => key !== indicatorKey)
          : [...pane.indicatorKeys, indicatorKey];
        return { ...pane, indicatorKeys, presetKey: 'custom' };
      });
    },
    [setPaneState],
  );

  const handleApplyPreset = useCallback(
    (paneKey, nextPresetKey) => {
      if (nextPresetKey === 'custom') {
        setPaneState(paneKey, { presetKey: 'custom' });
        return;
      }

      const preset = PRESETS[nextPresetKey];
      if (!preset) return;

      setPaneState(paneKey, {
        interval: preset.interval,
        indicatorKeys: [...preset.indicators],
        presetKey: nextPresetKey,
      });
      setStatusMessage(`${preset.label} preset applied`);
    },
    [setPaneState],
  );

  const handleIntervalChange = useCallback(
    (paneKey, nextInterval) => {
      setPaneState(paneKey, {
        interval: nextInterval,
        presetKey: 'custom',
      });
    },
    [setPaneState],
  );

  const handleAllRange = useCallback(
    (paneKey) => {
      setPaneState(paneKey, {
        interval: 'M',
        presetKey: 'custom',
      });
      setStatusMessage('All range selected');
    },
    [setPaneState],
  );

  const handleResetToTrend = useCallback(
    (paneKey) => {
      const trend = PRESETS.trend;
      setPaneState(paneKey, {
        interval: trend.interval,
        indicatorKeys: [...trend.indicators],
        presetKey: 'trend',
      });
      setDesktopPanels((current) => ({ ...current, [paneKey]: 'none' }));
      setStatusMessage('Reset to Trend preset');
    },
    [setPaneState],
  );

  const handleResetChartControls = useCallback(
    (paneKey) => {
      setPaneState(paneKey, {
        chartStyle: '1',
        showLegend: false,
        showVolume: false,
        showDateRanges: false,
        showCalendar: false,
        showDetails: false,
        useLocalTimezone: false,
        showGrid: true,
      });
      setStatusMessage('Chart controls reset');
    },
    [setPaneState],
  );

  const updateAlertComposerType = useCallback((paneKey, typeKey) => {
    if (!ALERT_TYPE_SET.has(typeKey)) return;
    setAlertComposerByPane((current) => ({
      ...current,
      [paneKey]: makeAlertComposer(typeKey),
    }));
  }, []);

  const updateAlertComposerParam = useCallback((paneKey, fieldKey, value) => {
    setAlertComposerByPane((current) => ({
      ...current,
      [paneKey]: {
        ...(current[paneKey] || makeAlertComposer()),
        params: {
          ...((current[paneKey] || makeAlertComposer()).params || {}),
          [fieldKey]: value,
        },
      },
    }));
  }, []);

  const addAlertFromComposer = useCallback(
    (paneKey) => {
      const composer = alertComposerByPane[paneKey] || makeAlertComposer();
      const typeKey = ALERT_TYPE_SET.has(composer.typeKey) ? composer.typeKey : 'price_above';
      const params = sanitizeAlertParams(typeKey, composer.params);
      const validation = validateAlertParams(typeKey, params);
      if (!validation.valid) {
        setStatusMessage(validation.message);
        return;
      }

      const symbol = panes[paneKey].symbol;
      const nextAlert = {
        id: createLocalId(),
        key: typeKey,
        label: getAlertTypeLabel(typeKey),
        params,
        condition: buildAlertCondition(symbol, typeKey, params),
        enabled: true,
      };

      setAlertsByPane((current) => ({
        ...current,
        [paneKey]: [nextAlert, ...(current[paneKey] || [])].slice(0, MAX_ALERTS),
      }));
      setDesktopPanels((current) => ({ ...current, [paneKey]: 'alerts' }));
      setStatusMessage(`${getAlertTypeLabel(typeKey)} alert added`);
    },
    [alertComposerByPane, panes],
  );

  const handleClearAlerts = useCallback((paneKey) => {
    setAlertsByPane((current) => ({ ...current, [paneKey]: [] }));
    setStatusMessage('All alerts cleared');
  }, []);

  const setAllAlertsEnabled = useCallback((paneKey, enabled) => {
    setAlertsByPane((current) => ({
      ...current,
      [paneKey]: (current[paneKey] || []).map((alert) => ({ ...alert, enabled })),
    }));
    setStatusMessage(enabled ? 'All alerts enabled' : 'All alerts disabled');
  }, []);

  const toggleAlert = useCallback((paneKey, id) => {
    setAlertsByPane((current) => ({
      ...current,
      [paneKey]: (current[paneKey] || []).map((alert) =>
        alert.id === id ? { ...alert, enabled: !alert.enabled } : alert,
      ),
    }));
  }, []);

  const updateAlertParams = useCallback(
    (paneKey, id, fieldKey, value) => {
      setAlertsByPane((current) => ({
        ...current,
        [paneKey]: (current[paneKey] || []).map((alert) =>
          alert.id === id
            ? (() => {
                if (!ALERT_TYPE_SET.has(alert.key)) return alert;
                const params = sanitizeAlertParams(alert.key, {
                  ...(alert.params || {}),
                  [fieldKey]: value,
                });
                return {
                  ...alert,
                  params,
                  condition: buildAlertCondition(panes[paneKey].symbol, alert.key, params),
                };
              })()
            : alert,
        ),
      }));
    },
    [panes],
  );

  const duplicateAlert = useCallback((paneKey, id) => {
    setAlertsByPane((current) => {
      const paneAlerts = current[paneKey] || [];
      const source = paneAlerts.find((alert) => alert.id === id);
      if (!source) return current;
      const duplicated = {
        ...source,
        id: createLocalId(),
        enabled: false,
      };
      return {
        ...current,
        [paneKey]: [duplicated, ...paneAlerts].slice(0, MAX_ALERTS),
      };
    });
    setStatusMessage('Alert duplicated');
  }, []);

  const removeAlert = useCallback((paneKey, id) => {
    setAlertsByPane((current) => ({
      ...current,
      [paneKey]: (current[paneKey] || []).filter((alert) => alert.id !== id),
    }));
  }, []);

  const copyAlert = useCallback(async (alert, paneSymbol) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setStatusMessage('Clipboard unavailable on this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${paneSymbol}: ${resolveAlertCondition(paneSymbol, alert)}`,
      );
      setStatusMessage('Alert copied to clipboard');
    } catch {
      setStatusMessage('Could not copy alert');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onSymbolSelected = (event) => {
      const next = normalizeSymbol(event?.detail?.symbol);
      const applyToBoth = event?.detail?.applyToBoth === true;

      if (applyToBoth) {
        setPanes((current) => ({
          ...current,
          left: { ...current.left, symbol: next, symbolInput: next },
          right: { ...current.right, symbol: next, symbolInput: next },
        }));
      } else {
        setPaneState('right', (pane) => ({ ...pane, symbol: next, symbolInput: next }));
      }

      setRecents((current) => uniqueSymbols([next, ...current]).slice(0, MAX_RECENTS));
    };

    window.addEventListener('portfolio-symbol-selected', onSymbolSelected);
    return () => window.removeEventListener('portfolio-symbol-selected', onSymbolSelected);
  }, [setPaneState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLgUp(media.matches);
    sync();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (resolved) setLocalTimezone(resolved);
    } catch {}
  }, []);

  useEffect(() => {
    if (isLgUp && mobileSheetOpen) setMobileSheetOpen(false);
  }, [isLgUp, mobileSheetOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncWatchlist = () => setExternalWatchlist(getExternalWatchlist());

    const onStorage = (event) => {
      if (event.key !== 'et_watchlist') return;
      syncWatchlist();
    };

    syncWatchlist();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', syncWatchlist);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', syncWatchlist);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = shellRef.current;
    if (!node) return;

    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !rightContainerRef.current || typeof window === 'undefined') return;

    setRightLoading(true);
    rightContainerRef.current.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';

    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_SRC;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = widgetConfigRight;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setRightLoading(false);
    };

    const fallbackTimeoutId = window.setTimeout(settle, 2600);
    let loadTimeoutId = null;

    script.onload = () => {
      loadTimeoutId = window.setTimeout(settle, 650);
    };

    script.onerror = () => {
      setStatusMessage('Right chart failed to load. Change timeframe or symbol to retry.');
      settle();
    };

    rightContainerRef.current.appendChild(script);

    return () => {
      window.clearTimeout(fallbackTimeoutId);
      if (loadTimeoutId !== null) window.clearTimeout(loadTimeoutId);
    };
  }, [isInView, widgetConfigRight]);

  useEffect(() => {
    if (!isLgUp) {
      setLeftLoading(false);
      return;
    }
    if (!isInView || !leftContainerRef.current || typeof window === 'undefined') return;

    setLeftLoading(true);
    leftContainerRef.current.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';

    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_SRC;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = widgetConfigLeft;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setLeftLoading(false);
    };

    const fallbackTimeoutId = window.setTimeout(settle, 2600);
    let loadTimeoutId = null;

    script.onload = () => {
      loadTimeoutId = window.setTimeout(settle, 650);
    };

    script.onerror = () => {
      setStatusMessage('Left chart failed to load. Change timeframe or symbol to retry.');
      settle();
    };

    leftContainerRef.current.appendChild(script);

    return () => {
      window.clearTimeout(fallbackTimeoutId);
      if (loadTimeoutId !== null) window.clearTimeout(loadTimeoutId);
    };
  }, [isInView, isLgUp, widgetConfigLeft]);

  useEffect(() => {
    writeJSON(LAYOUT_STORAGE_KEY, {
      leftPane: panes.left,
      rightPane: panes.right,
    });
  }, [panes.left, panes.right]);

  useEffect(() => {
    writeJSON(FAVORITES_STORAGE_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeJSON(RECENTS_STORAGE_KEY, recents);
  }, [recents]);

  useEffect(() => {
    writeJSON(ALERTS_STORAGE_KEY, alertsByPane);
  }, [alertsByPane]);

  useEffect(() => {
    writeJSON(MOBILE_UI_STORAGE_KEY, {
      lastTab: mobileSheetTab,
      sheetOpenLast: mobileSheetOpen,
    });
  }, [mobileSheetOpen, mobileSheetTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('portfolioSelectedSymbol', panes.right.symbol);
    } catch {}
  }, [panes.right.symbol]);

  useEffect(() => {
    if (!statusMessage || typeof window === 'undefined') return;
    const timeoutId = window.setTimeout(() => setStatusMessage(''), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  const baseControlButton =
    'inline-flex items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 whitespace-nowrap';
  const getToggleClass = (active, compact = false) =>
    `${baseControlButton} ${compact ? 'min-h-8 px-2.5 text-xs' : 'min-h-9 px-2.5 text-sm sm:min-h-10 sm:px-3'} ${
      active
        ? 'border-foreground/25 bg-secondary text-foreground'
        : 'border-border/70 bg-card text-muted-foreground hover:border-foreground/20 hover:bg-background hover:text-foreground'
    }`;

  const renderIndicatorsPanel = (paneKey, compact = false) => {
    const pane = panes[paneKey];
    return (
      <div className="rounded-lg border border-border/60 bg-background/50 p-2">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Indicator Set
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Toggle indicators for this chart only.
            </p>
          </div>
          <span className="inline-flex min-h-7 items-center rounded-md border border-border/70 bg-card px-2 text-[11px] font-medium text-foreground">
            {pane.indicatorKeys.length}/{INDICATOR_OPTIONS.length}
          </span>
        </div>
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
          {INDICATOR_OPTIONS.map((option) => {
            const checked = pane.indicatorKeys.includes(option.key);
            return (
              <label
                key={`${paneKey}-indicator-${option.key}`}
                className={`group flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${
                  checked
                    ? 'border-foreground/30 bg-secondary/85 text-foreground'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-foreground/20 hover:bg-background hover:text-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleIndicator(paneKey, option.key)}
                  className="sr-only"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{option.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {INDICATOR_CATEGORIES[option.key]}
                  </p>
                </div>
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    checked
                      ? 'border-foreground/40 bg-foreground/10 text-foreground'
                      : 'border-border/80 bg-card text-transparent group-hover:border-foreground/30'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAlertsPanel = (paneKey) => {
    const pane = panes[paneKey];
    const paneAlerts = alertsByPane[paneKey] || [];
    const composer = alertComposerByPane[paneKey] || makeAlertComposer();
    const enabledCount = paneAlerts.filter((alert) => alert.enabled).length;
    const hasDisabled = paneAlerts.some((alert) => !alert.enabled);
    const hasEnabled = enabledCount > 0;

    const renderAlertParameterControls = (typeKey, params, onParamChange, idPrefix) => {
      if (typeKey === 'price_above' || typeKey === 'price_below') {
        return (
          <div className="min-w-[170px] flex-1">
            <label
              htmlFor={`${idPrefix}-threshold`}
              className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Target Price
            </label>
            <input
              id={`${idPrefix}-threshold`}
              type="number"
              inputMode="decimal"
              value={params.threshold || ''}
              onChange={(event) => onParamChange('threshold', event.target.value)}
              className="h-8 w-full rounded-md border border-border/60 bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="e.g. 250"
            />
          </div>
        );
      }

      if (typeKey === 'ma_cross') {
        return (
          <>
            <div className="min-w-[130px]">
              <label
                htmlFor={`${idPrefix}-direction`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Direction
              </label>
              <select
                id={`${idPrefix}-direction`}
                value={params.direction || 'above'}
                onChange={(event) => onParamChange('direction', event.target.value)}
                className="h-8 w-full rounded-md border border-border/60 bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="above">Crosses Above</option>
                <option value="below">Crosses Below</option>
              </select>
            </div>
            <div className="min-w-[120px]">
              <label
                htmlFor={`${idPrefix}-fast`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Fast EMA
              </label>
              <input
                id={`${idPrefix}-fast`}
                type="number"
                inputMode="numeric"
                min="1"
                value={params.fastLength || ''}
                onChange={(event) => onParamChange('fastLength', event.target.value)}
                className="h-8 w-full rounded-md border border-border/60 bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <div className="min-w-[120px]">
              <label
                htmlFor={`${idPrefix}-slow`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Slow EMA
              </label>
              <input
                id={`${idPrefix}-slow`}
                type="number"
                inputMode="numeric"
                min="1"
                value={params.slowLength || ''}
                onChange={(event) => onParamChange('slowLength', event.target.value)}
                className="h-8 w-full rounded-md border border-border/60 bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </>
        );
      }

      if (typeKey === 'rsi_zone') {
        return (
          <>
            <div className="min-w-[140px]">
              <label
                htmlFor={`${idPrefix}-mode`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Mode
              </label>
              <select
                id={`${idPrefix}-mode`}
                value={params.mode || 'above'}
                onChange={(event) => onParamChange('mode', event.target.value)}
                className="h-8 w-full rounded-md border border-border/60 bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
            <div className="min-w-[130px]">
              <label
                htmlFor={`${idPrefix}-level`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                RSI Level
              </label>
              <input
                id={`${idPrefix}-level`}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                value={params.level || ''}
                onChange={(event) => onParamChange('level', event.target.value)}
                className="h-8 w-full rounded-md border border-border/60 bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </>
        );
      }

      return null;
    };

    return (
      <div className="rounded-lg border border-border/60 bg-background/50 p-2">
        <div className="mb-2 space-y-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs text-muted-foreground">
              {paneAlerts.length} alerts configured • {enabledCount} active
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {hasDisabled ? (
                <button
                  type="button"
                  onClick={() => setAllAlertsEnabled(paneKey, true)}
                  className={getToggleClass(false, true)}
                >
                  Enable all
                </button>
              ) : null}
              {hasEnabled ? (
                <button
                  type="button"
                  onClick={() => setAllAlertsEnabled(paneKey, false)}
                  className={getToggleClass(false, true)}
                >
                  Disable all
                </button>
              ) : null}
              {paneAlerts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleClearAlerts(paneKey)}
                  className={getToggleClass(false, true)}
                >
                  Clear all
                </button>
              ) : null}
            </div>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              addAlertFromComposer(paneKey);
            }}
            className="rounded-md border border-border/60 bg-card/80 p-2"
          >
            <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
              <div className="relative min-w-0">
                <label
                  htmlFor={`${paneKey}-composer-type`}
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Alert Type
                </label>
                <select
                  id={`${paneKey}-composer-type`}
                  value={composer.typeKey}
                  onChange={(event) => updateAlertComposerType(paneKey, event.target.value)}
                  className="h-8 w-full rounded-md border border-border/60 bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {ALERT_TYPE_OPTIONS.map((option) => (
                    <option key={`${paneKey}-alert-type-${option.key}`} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-wrap items-end gap-2">
                {renderAlertParameterControls(
                  composer.typeKey,
                  composer.params,
                  (fieldKey, value) => updateAlertComposerParam(paneKey, fieldKey, value),
                  `${paneKey}-composer`,
                )}
              </div>
              <button type="submit" className={`${getToggleClass(false, true)} self-end`}>
                Add alert
              </button>
            </div>
          </form>
        </div>

        {paneAlerts.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {paneAlerts.map((alert) => (
              <li
                key={`${paneKey}-${alert.id}`}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-card/90 p-1.5"
              >
                <button
                  type="button"
                  onClick={() => toggleAlert(paneKey, alert.id)}
                  className={getToggleClass(alert.enabled, true)}
                  aria-pressed={alert.enabled}
                >
                  {alert.enabled ? 'On' : 'Off'}
                </button>
                <span className="inline-flex min-h-8 items-center rounded-md border border-border/70 bg-background px-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {alert.label}
                </span>
                {ALERT_TYPE_SET.has(alert.key) ? (
                  <div className="flex min-w-[240px] flex-1 flex-wrap items-end gap-2">
                    {renderAlertParameterControls(
                      alert.key,
                      sanitizeAlertParams(alert.key, alert.params),
                      (fieldKey, value) => updateAlertParams(paneKey, alert.id, fieldKey, value),
                      `${paneKey}-${alert.id}`,
                    )}
                  </div>
                ) : (
                  <div className="min-w-[220px] flex-1 rounded-md border border-border/60 bg-card px-2 py-1.5 text-xs text-muted-foreground">
                    {alert.condition}
                  </div>
                )}
                <span className="inline-flex min-h-8 items-center rounded-md border border-border/60 bg-background px-2 text-[11px] text-muted-foreground">
                  {resolveAlertCondition(pane.symbol, alert)}
                </span>
                <button
                  type="button"
                  onClick={() => duplicateAlert(paneKey, alert.id)}
                  className={getToggleClass(false, true)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => copyAlert(alert, pane.symbol)}
                  className={getToggleClass(false, true)}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => removeAlert(paneKey, alert.id)}
                  className={getToggleClass(false, true)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  const renderChartPanel = (paneKey, compact = false) => {
    const pane = panes[paneKey];
    return (
      <div className="rounded-lg border border-border/60 bg-background/50 p-2">
        <div className="mb-2 flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
          <span className="text-xs text-muted-foreground">Chart view options</span>
          <button
            type="button"
            onClick={() => handleResetChartControls(paneKey)}
            className={getToggleClass(false, true)}
          >
            Reset View
          </button>
        </div>

        <div className="relative min-w-0">
          <select
            value={pane.chartStyle}
            onChange={(event) => setPaneState(paneKey, { chartStyle: event.target.value })}
            className={`et-tool-select ${compact ? 'h-10' : 'h-11'}`}
            aria-label="Chart style"
          >
            {CHART_STYLE_OPTIONS.map((option) => (
              <option key={`${paneKey}-style-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="et-tool-select-caret h-4 w-4" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setPaneState(paneKey, (state) => ({ ...state, showLegend: !state.showLegend }))
            }
            className={getToggleClass(pane.showLegend, compact)}
            aria-pressed={pane.showLegend}
          >
            Legend
          </button>
          <button
            type="button"
            onClick={() =>
              setPaneState(paneKey, (state) => ({ ...state, showVolume: !state.showVolume }))
            }
            className={getToggleClass(pane.showVolume, compact)}
            aria-pressed={pane.showVolume}
          >
            Volume
          </button>
          <button
            type="button"
            onClick={() =>
              setPaneState(paneKey, (state) => ({
                ...state,
                showDateRanges: !state.showDateRanges,
              }))
            }
            className={getToggleClass(pane.showDateRanges, compact)}
            aria-pressed={pane.showDateRanges}
          >
            Date Range
          </button>
          <button
            type="button"
            onClick={() =>
              setPaneState(paneKey, (state) => ({ ...state, showCalendar: !state.showCalendar }))
            }
            className={getToggleClass(pane.showCalendar, compact)}
            aria-pressed={pane.showCalendar}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() =>
              setPaneState(paneKey, (state) => ({ ...state, showDetails: !state.showDetails }))
            }
            className={getToggleClass(pane.showDetails, compact)}
            aria-pressed={pane.showDetails}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() =>
              setPaneState(paneKey, (state) => ({
                ...state,
                useLocalTimezone: !state.useLocalTimezone,
              }))
            }
            className={getToggleClass(pane.useLocalTimezone, compact)}
            aria-pressed={pane.useLocalTimezone}
          >
            Local Timezone
          </button>
          <button
            type="button"
            onClick={() =>
              setPaneState(paneKey, (state) => ({ ...state, showGrid: !state.showGrid }))
            }
            className={getToggleClass(pane.showGrid, compact)}
            aria-pressed={pane.showGrid}
          >
            Grid
          </button>
        </div>
      </div>
    );
  };

  const renderDesktopPaneControls = (paneKey) => {
    const pane = panes[paneKey];
    const isFavorite = favorites.includes(pane.symbol);
    const panel = desktopPanels[paneKey];

    return (
      <div className="rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur">
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
          <form
            onSubmit={(event) => handleSymbolSubmit(paneKey, event)}
            className="flex min-w-0 items-center gap-2"
          >
            <label htmlFor={`ta-symbol-input-${paneKey}`} className="sr-only">
              Symbol
            </label>
            <input
              id={`ta-symbol-input-${paneKey}`}
              list="ta-symbol-suggestions"
              value={pane.symbolInput}
              onChange={(event) => setPaneState(paneKey, { symbolInput: event.target.value })}
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Ticker (e.g. AAPL)"
              autoComplete="off"
            />
            <button
              type="submit"
              className={`${baseControlButton} min-h-9 border-border bg-card px-3 text-sm text-muted-foreground hover:border-foreground/20 hover:bg-background hover:text-foreground`}
              aria-label="Load symbol"
              title="Load symbol"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleFavorite(paneKey)}
              className={getToggleClass(isFavorite, true)}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorite}
              title={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </form>

          <div className="rounded-md border border-border/60 bg-background/40 p-1.5">
            <div className="et-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1">
              {QUICK_INTERVALS.map((option) => (
                <button
                  key={`${paneKey}-top-quick-${option.value}`}
                  type="button"
                  onClick={() =>
                    option.value === 'all'
                      ? handleAllRange(paneKey)
                      : handleIntervalChange(paneKey, option.value)
                  }
                  className={getToggleClass(
                    option.value === 'all' ? pane.interval === 'M' : pane.interval === option.value,
                    true,
                  )}
                  aria-pressed={
                    option.value === 'all' ? pane.interval === 'M' : pane.interval === option.value
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-2">
          <div className="et-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            <div className="relative min-w-[164px]">
              <select
                value={pane.presetKey}
                onChange={(event) => handleApplyPreset(paneKey, event.target.value)}
                className="et-tool-select h-9"
                aria-label="Chart preset"
              >
                {PRESET_OPTIONS.map((option) => (
                  <option key={`${paneKey}-preset-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="et-tool-select-caret h-4 w-4" />
            </div>

            <button
              type="button"
              onClick={() => toggleDesktopPanel(paneKey, 'indicators')}
              className={`${getToggleClass(panel === 'indicators', true)} justify-between gap-1.5 whitespace-nowrap`}
              aria-expanded={panel === 'indicators'}
              aria-controls={`ta-indicator-panel-${paneKey}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <WandSparkles className="h-4 w-4" />
                Indicators
              </span>
              <span className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {pane.indicatorKeys.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleDesktopPanel(paneKey, 'alerts')}
              className={`${getToggleClass(panel === 'alerts', true)} justify-between gap-1.5 whitespace-nowrap`}
              aria-expanded={panel === 'alerts'}
              aria-controls={`ta-alert-panel-${paneKey}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <BellPlus className="h-4 w-4" />
                Alerts
              </span>
              <span className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {(alertsByPane[paneKey] || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleDesktopPanel(paneKey, 'chart')}
              className={`${getToggleClass(panel === 'chart', true)} justify-between gap-1.5 whitespace-nowrap`}
              aria-expanded={panel === 'chart'}
              aria-controls={`ta-chart-panel-${paneKey}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                Chart
              </span>
              <span className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                View
              </span>
            </button>
          </div>
        </div>

        <div className="mt-2">
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <div className="et-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Watchlist
              </span>
              {watchlistForWidget.map((item) => (
                <button
                  key={`${paneKey}-watch-${item}`}
                  type="button"
                  onClick={() => selectWatchlistSymbol(paneKey, item)}
                  className={getToggleClass(item === pane.symbol, true)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {panel === 'indicators' ? (
          <div id={`ta-indicator-panel-${paneKey}`} className="mt-2">
            {renderIndicatorsPanel(paneKey, false)}
          </div>
        ) : null}

        {panel === 'alerts' ? (
          <div id={`ta-alert-panel-${paneKey}`} className="mt-2">
            {renderAlertsPanel(paneKey)}
          </div>
        ) : null}

        {panel === 'chart' ? (
          <div id={`ta-chart-panel-${paneKey}`} className="mt-2">
            {renderChartPanel(paneKey, true)}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={shellRef} className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-20 rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur sm:p-2.5">
        <div className="space-y-2 lg:hidden">
          <form
            onSubmit={(event) => handleSymbolSubmit('right', event)}
            className="flex min-w-0 items-center gap-2"
          >
            <label htmlFor="ta-symbol-input-mobile" className="sr-only">
              Symbol
            </label>
            <input
              id="ta-symbol-input-mobile"
              list="ta-symbol-suggestions"
              value={panes.right.symbolInput}
              onChange={(event) => setPaneState('right', { symbolInput: event.target.value })}
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Ticker (e.g. AAPL)"
              autoComplete="off"
            />
            <button
              type="submit"
              className={`${baseControlButton} min-h-9 border-border bg-card px-3 text-sm text-muted-foreground hover:border-foreground/20 hover:bg-background hover:text-foreground`}
              aria-label="Load symbol"
              title="Load symbol"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleFavorite('right')}
              className={`${baseControlButton} min-h-9 border-border bg-card px-3 text-sm ${
                favorites.includes(panes.right.symbol)
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:border-foreground/20 hover:bg-background hover:text-foreground'
              }`}
              aria-label={
                favorites.includes(panes.right.symbol)
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              aria-pressed={favorites.includes(panes.right.symbol)}
              title={favorites.includes(panes.right.symbol) ? 'Remove favorite' : 'Add favorite'}
            >
              <Star
                className={`h-4 w-4 ${favorites.includes(panes.right.symbol) ? 'fill-current' : ''}`}
              />
            </button>
          </form>

          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 p-1.5">
            <div className="et-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1">
              {QUICK_INTERVALS.map((option) => (
                <button
                  key={`mobile-quick-${option.value}`}
                  type="button"
                  onClick={() =>
                    option.value === 'all'
                      ? handleAllRange('right')
                      : handleIntervalChange('right', option.value)
                  }
                  className={getToggleClass(
                    option.value === 'all'
                      ? panes.right.interval === 'M'
                      : panes.right.interval === option.value,
                    true,
                  )}
                  aria-pressed={
                    option.value === 'all'
                      ? panes.right.interval === 'M'
                      : panes.right.interval === option.value
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className={`${baseControlButton} min-h-9 shrink-0 gap-1.5 border-border bg-card px-3 text-xs text-foreground hover:border-foreground/20 hover:bg-background`}
              aria-label="Open settings"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              Settings
            </button>
          </div>

          <Sheet
            open={!isLgUp && mobileSheetOpen}
            onOpenChange={(open) => !isLgUp && setMobileSheetOpen(open)}
          >
            <SheetContent
              side="bottom"
              className="max-h-[86dvh] overflow-y-auto rounded-t-2xl border-border bg-card px-3 pb-4 pt-6"
              id="ta-mobile-controls-sheet"
            >
              <SheetHeader className="mb-2">
                <SheetTitle className="text-base">Chart Controls</SheetTitle>
                <SheetDescription className="text-xs">
                  Preset {currentPresetLabel('right')} · {panes.right.indicatorKeys.length}{' '}
                  indicators · {(alertsByPane.right || []).length} alerts
                </SheetDescription>
              </SheetHeader>

              <Tabs value={mobileSheetTab} onValueChange={setMobileSheetTab}>
                <TabsList className="grid h-10 w-full grid-cols-5 bg-muted/70">
                  <TabsTrigger value="preset" className="text-xs">
                    Preset
                  </TabsTrigger>
                  <TabsTrigger value="indicators" className="text-xs">
                    Indicators
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="text-xs">
                    Alerts
                  </TabsTrigger>
                  <TabsTrigger value="lists" className="text-xs">
                    Lists
                  </TabsTrigger>
                  <TabsTrigger value="chart" className="text-xs">
                    Chart
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preset" className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <button
                        key={`mobile-preset-${key}`}
                        type="button"
                        onClick={() => handleApplyPreset('right', key)}
                        className={`rounded-md border px-3 py-2 text-left transition-colors ${
                          panes.right.presetKey === key
                            ? 'border-foreground/30 bg-secondary text-foreground'
                            : 'border-border/70 bg-card text-muted-foreground hover:border-foreground/20 hover:bg-background hover:text-foreground'
                        }`}
                        aria-pressed={panes.right.presetKey === key}
                      >
                        <div className="text-sm font-medium">{preset.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {intervalLabel(preset.interval)} · {preset.indicators.length} indicators
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetToTrend('right')}
                    className={`${getToggleClass(false, false)} w-full`}
                  >
                    Reset To Trend
                  </button>
                </TabsContent>

                <TabsContent value="indicators" className="space-y-2">
                  {renderIndicatorsPanel('right', true)}
                </TabsContent>

                <TabsContent value="alerts" className="space-y-2">
                  {renderAlertsPanel('right')}
                </TabsContent>

                <TabsContent value="lists" className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Watchlist
                  </div>
                  <div className="et-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
                    {watchlistForWidget.map((item) => (
                      <button
                        key={`watchlist-sheet-${item}`}
                        type="button"
                        onClick={() => {
                          selectWatchlistSymbol('right', item);
                          setMobileSheetOpen(false);
                        }}
                        className={getToggleClass(item === panes.right.symbol, true)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="chart" className="space-y-2">
                  {renderChartPanel('right', false)}
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-2">
          {renderDesktopPaneControls('left')}
          {renderDesktopPaneControls('right')}
        </div>

        <datalist id="ta-symbol-suggestions">
          {symbolSuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      <div className="mt-2 grid flex-1 min-h-[420px] gap-2 sm:mt-3 sm:min-h-[360px] lg:grid-cols-2">
        <div className="relative hidden min-h-[420px] overflow-hidden rounded-xl border border-border bg-card lg:block">
          <div className="pointer-events-none absolute left-2 top-2 z-10 rounded border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground">
            {panes.left.symbol} · {intervalLabel(panes.left.interval)}
          </div>
          <div ref={leftContainerRef} className="tradingview-widget-container h-full w-full" />
          {(leftLoading || !isInView) && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-[1px]"
              role="status"
              aria-live="polite"
            >
              <div className="h-32 w-[88%] max-w-[560px] animate-pulse rounded-lg border border-border/70 bg-muted/35" />
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {isInView ? 'Loading left chart...' : 'Chart loads when this module enters view'}
              </p>
            </div>
          )}
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-border bg-card">
          <div className="pointer-events-none absolute left-2 top-2 z-10 rounded border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground lg:hidden">
            {panes.right.symbol} · {intervalLabel(panes.right.interval)}
          </div>
          <div ref={rightContainerRef} className="tradingview-widget-container h-full w-full" />
          {(rightLoading || !isInView) && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-[1px]"
              role="status"
              aria-live="polite"
            >
              <div className="h-32 w-[88%] max-w-[560px] animate-pulse rounded-lg border border-border/70 bg-muted/35" />
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {isInView ? 'Loading right chart...' : 'Chart loads when this module enters view'}
              </p>
            </div>
          )}
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-2 text-[11px] text-muted-foreground" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}

export default memo(TradingViewWidget);
