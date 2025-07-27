import React, { useState, useEffect, useRef } from "react";

import { Download, Trash2 } from "lucide-react";
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface RevenueInput {
  name: string;
  amount: number;
}
interface ExpenseSubcategory {
  name: string;
  amount: number;
}
interface ExpenseInput {
  name: string;
  amount: number;
  subcategories?: ExpenseSubcategory[];
}

const defaultRevenues: RevenueInput[] = [
  { name: "Salary", amount: 3000 },
  { name: "Freelance", amount: 1200 },
];
const defaultExpenses: ExpenseInput[] = [
  { name: "Rent", amount: 1200, subcategories: [
    { name: "Base rent", amount: 600 },
    { name: "Utilities", amount: 600 },
  ] },
  { name: "Groceries", amount: 400, subcategories: [
    { name: "Supermarkt", amount: 300 },
    { name: "Restaurant", amount: 100 },
  ] },
  { name: "Savings", amount: 800, subcategories: [] },
];

export default function SankeyBudget({ onClose }: { onClose?: () => void }) {
  const [revenues, setRevenues] = useState<RevenueInput[]>(defaultRevenues);
  const [expenses, setExpenses] = useState<ExpenseInput[]>(defaultExpenses);
  // Theme detection (Tailwind/Next.js: 'dark' class on <html> or <body>)
  const [isDark, setIsDark] = useState(false);
  // Overlay für großes Sankey
  const [showSankeyOverlay, setShowSankeyOverlay] = useState(false);
  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
      }
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Revenue Handlers
  const handleRevenueChange = (idx: number, field: keyof RevenueInput, value: string | number) => {
    setRevenues((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: field === "amount" ? Number(value) : value };
      return updated;
    });
  };
  const addRevenue = () => setRevenues((prev) => [...prev, { name: "", amount: 0 }]);
  const removeRevenue = (idx: number) => setRevenues((prev) => prev.filter((_, i) => i !== idx));

  // Expense Handlers
  const handleExpenseChange = (idx: number, field: keyof ExpenseInput, value: string | number) => {
    setExpenses((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: field === "amount" ? Number(value) : value };
      return updated;
    });
  };

  // Subcategory Handlers
  const handleSubcategoryChange = (expenseIdx: number, subIdx: number, field: keyof ExpenseSubcategory, value: string | number) => {
    setExpenses((prev) => {
      const updated = [...prev];
      const expense = { ...updated[expenseIdx] };
      const subcategories = expense.subcategories ? [...expense.subcategories] : [];
      subcategories[subIdx] = { ...subcategories[subIdx], [field]: field === "amount" ? Number(value) : value };
      expense.subcategories = subcategories;
      updated[expenseIdx] = expense;
      return updated;
    });
  };
  const addSubcategory = (expenseIdx: number) => {
    setExpenses((prev) => {
      const updated = [...prev];
      const expense = { ...updated[expenseIdx] };
      expense.subcategories = expense.subcategories ? [...expense.subcategories, { name: "", amount: 0 }] : [{ name: "", amount: 0 }];
      updated[expenseIdx] = expense;
      return updated;
    });
  };
  const removeSubcategory = (expenseIdx: number, subIdx: number) => {
    setExpenses((prev) => {
      const updated = [...prev];
      const expense = { ...updated[expenseIdx] };
      expense.subcategories = expense.subcategories?.filter((_, i) => i !== subIdx) || [];
      updated[expenseIdx] = expense;
      return updated;
    });
  };
  const addExpense = () => setExpenses((prev) => [...prev, { name: "", amount: 0, subcategories: [] }]);
  const removeExpense = (idx: number) => setExpenses((prev) => prev.filter((_, i) => i !== idx));

  // D3 Sankey Daten vorbereiten
  const nodeNames: string[] = [];
  nodeNames.push("Budget");
  const mainCategories = expenses.map(e => e.name).filter(Boolean);
  mainCategories.forEach(name => nodeNames.push(name));
  const subCategories: string[] = [];
  expenses.forEach(e => {
    if (e.subcategories && e.subcategories.length > 0) {
      e.subcategories.forEach(s => {
        if (s.name && !subCategories.includes(s.name)) subCategories.push(s.name);
      });
    }
  });
  subCategories.forEach(name => nodeNames.push(name));
  revenues.forEach(r => {
    if (r.name && !nodeNames.includes(r.name)) nodeNames.push(r.name);
  });

  const nodeIndex = (name: string) => nodeNames.indexOf(name);
  const links: { source: number; target: number; value: number }[] = [];
  revenues.filter(r => r.name && r.amount > 0).forEach(r => {
    links.push({ source: nodeIndex(r.name), target: nodeIndex("Budget"), value: r.amount });
  });
  expenses.forEach(e => {
    if (e.name && e.amount > 0) {
      links.push({ source: nodeIndex("Budget"), target: nodeIndex(e.name), value: e.amount });
    }
    if (e.subcategories && e.subcategories.length > 0) {
      e.subcategories.filter(s => s.name && s.amount > 0).forEach(s => {
        links.push({ source: nodeIndex(e.name), target: nodeIndex(s.name), value: s.amount });
      });
    }
  });
  const nodes = nodeNames.map(name => ({ name }));

  // D3 Sankey Diagramm als Komponente
  function SankeyD3({ width = 700, height = 400, textSize }: { width?: number; height?: number; textSize?: number }) {
    // Responsive Werte berechnen
    // SVG skaliert mit Container, Textgröße und nodeWidth passen sich an
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState(width);
    useEffect(() => {
      function handleResize() {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      }
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    // Werte für nodeWidth und Textgröße dynamisch
    const effectiveWidth = containerWidth || width;
    const nodeW = Math.max(12, Math.round(effectiveWidth / 50));
    const fontSz = textSize !== undefined ? textSize : Math.max(10, Math.round(effectiveWidth / 60));
    // Tooltip State
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode; visible: boolean }>({ x: 0, y: 0, content: '', visible: false });
    const svgRef = useRef<SVGSVGElement | null>(null);
    // Theme detection jetzt in der Elternkomponente

    // Farben je nach Theme
    const colors = isDark
      ? {
          node: '#ECEFF1',
          text: '#fff',
          link: '#B0BEC5',
          linkOpacity: 0.25,
        }
      : {
          node: '#111',
          text: '#111',
          link: '#90A4AE',
          linkOpacity: 0.18,
        };

    // Minimalistisches D3 Sankey Layout
    const sankeyGen = d3Sankey()
      .nodeWidth(nodeW)
      .nodePadding(Math.max(16, Math.round(effectiveWidth / 30)))
      .extent([[0, 0], [effectiveWidth, height]]);
    const graph = sankeyGen({
      nodes: nodes.map((d, i) => ({ ...d, index: i })),
      links: links.map(l => ({ ...l }))
    });
    // Hilfsfunktion: Ist Endknoten (kein outgoing link)?
    function isEndNode(node: any) {
      return !graph.links.some((l: any) => l.source.index === node.index);
    }
    // Hilfsfunktion: Ist Startknoten (kein incoming link)?
    function isStartNode(node: any) {
      return !graph.links.some((l: any) => l.target.index === node.index);
    }
    // Tooltip-Handler
    const handleShowTooltip = (evt: React.MouseEvent, content: React.ReactNode) => {
      const svgRect = svgRef.current?.getBoundingClientRect();
      setTooltip({
        x: evt.clientX - (svgRect?.left || 0) + 10,
        y: evt.clientY - (svgRect?.top || 0) + 10,
        content,
        visible: true
      });
    };
    const handleHideTooltip = () => setTooltip(t => ({ ...t, visible: false }));

    return (
      <div ref={containerRef} style={{ width: '100%', maxWidth: width, overflowX: 'auto', position: 'relative' }}>
        <svg
          ref={svgRef}
          width={effectiveWidth}
          height={height}
          viewBox={`0 0 ${effectiveWidth} ${height}`}
          id="sankey-chart"
          style={{ background: 'none', display: 'block', width: '100%', height: height }}
        >
          <g>
          {/* Minimalistische Links */}
          {graph.links.map((link: any, i: number) => (
            <path
              key={i}
              d={sankeyLinkHorizontal()(link) || undefined}
              style={{
                fill: "none",
                stroke: colors.link,
                strokeOpacity: colors.linkOpacity,
                strokeWidth: link.width // D3 berechnet die Breite proportional zum Wert
              }}
              onMouseMove={evt => handleShowTooltip(evt, <div><b>{link.source.name} → {link.target.name}</b><br />{link.value}</div>)}
              onMouseLeave={handleHideTooltip}
              cursor="pointer"
            />
          ))}
          {/* Minimalistische Knoten */}
          {graph.nodes.map((node: any, i: number) => {
            const endNode = isEndNode(node);
            const startNode = isStartNode(node);
            // Wert für Tooltip berechnen (Summe aller eingehenden oder ausgehenden Links)
            const nodeValue = graph.links
              .filter((l: any) => l.source.index === node.index || l.target.index === node.index)
              .reduce((sum: number, l: any) => sum + l.value, 0);
            return (
              <g key={i} transform={`translate(${node.x0},${node.y0})`}>
                <rect
                  height={node.y1 - node.y0} // D3 berechnet die Höhe proportional zum Wert
                  width={node.x1 - node.x0}
                  fill={colors.node}
                  opacity={1}
                  rx={2}
                  stroke="none"
                  onMouseMove={evt => handleShowTooltip(evt, <div><b>{node.name}</b><br />{nodeValue}</div>)}
                  onMouseLeave={handleHideTooltip}
                  cursor="pointer"
                />
                <text
                  x={endNode ? -8 : node.x1 - node.x0 + 8}
                  y={(node.y1 - node.y0) / 2}
                  dy="0.35em"
                  fontSize={fontSz}
                  fill={colors.text}
                  textAnchor={endNode ? "end" : "start"}
                  style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 400, letterSpacing: 0.1 }}
                >
                  {node.name}
                </text>
              </g>
            );
          })}
          </g>
        </svg>
        {/* Tooltip-Element */}
        {tooltip.visible && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y,
              background: isDark ? '#23232a' : '#fff',
              color: isDark ? '#fff' : '#222',
              border: '1px solid #bbb',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: 13,
              pointerEvents: 'none',
              boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
              zIndex: 10,
              minWidth: 80,
              maxWidth: 220,
              whiteSpace: 'pre-line',
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    );
  }

  const downloadChart = () => {
    const chart = document.querySelector("#sankey-chart");
    if (!chart) return;
    // SVG klonen, damit keine Änderungen im UI sichtbar sind
    const clone = chart.cloneNode(true);
    if (!(clone instanceof SVGSVGElement)) return;
    // Farben für White-Theme setzen
    // Knoten (rect)
    clone.querySelectorAll('rect').forEach(rect => {
      rect.setAttribute('fill', '#111');
    });
    // Text
    clone.querySelectorAll('text').forEach(text => {
      text.setAttribute('fill', '#263238');
    });
    // Links (Pfad)
    clone.querySelectorAll('path').forEach(path => {
      path.setAttribute('stroke', '#90A4AE');
      path.setAttribute('stroke-opacity', '0.18');
    });
    // SVG serialisieren und downloaden
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "personal-budget-sankey.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] max-w-5xl w-full" id="personal-budget-container">
      <div className="flex items-center justify-between p-6 pb-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Budget</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
            aria-label="Schließen"
            style={{ zIndex: 10 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {/* ...restlicher Inhalt bleibt unverändert, aber ohne doppelten Titel ... */}
      <div className="p-6 pt-2">
      {/* Income & Expenses nebeneinander */}
      <div className="flex flex-col md:flex-row gap-8 mb-6">
        {/* Income Streams */}
        <div className="flex flex-col flex-1 max-w-md">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Income Streams</h3>
          <div className="space-y-3 mb-6">
            {revenues.map((input, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 mb-2 sm:gap-2 sm:items-center sm:justify-start w-full">
                <div className="flex flex-row items-center w-full">
                  <input
                    className="border rounded px-2 py-1 w-full sm:w-60 bg-transparent"
                    value={input.name}
                    onChange={e => handleRevenueChange(idx, "name", e.target.value)}
                    placeholder="Income Source"
                  />
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-full sm:w-32 bg-transparent ml-2"
                    value={input.amount}
                    onChange={e => handleRevenueChange(idx, "amount", e.target.value)}
                    min={0}
                    placeholder="Amount"
                  />
                  <button
                    className="text-red-500 hover:text-red-700 px-2 ml-2"
                    onClick={() => removeRevenue(idx)}
                    aria-label="Delete income"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1" />
                </div>
              </div>
            ))}
            <button
              className="mt-2 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm w-full sm:w-auto"
              onClick={addRevenue}
            >
              + Add Income
            </button>
          </div>
        </div>
        {/* Expenses */}
        <div className="flex flex-col flex-1 max-w-md mt-8 md:mt-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Expenses</h3>
          <div className="space-y-3">
            {expenses.map((input, idx) => (
              <div key={idx} className="mb-4">
                <div className="flex flex-row items-center w-full mb-2">
                  <input
                    className="border rounded px-2 py-1 w-full sm:w-60 bg-transparent"
                    value={input.name}
                    onChange={e => handleExpenseChange(idx, "name", e.target.value)}
                    placeholder="Expense Name"
                  />
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-full sm:w-32 bg-transparent ml-2"
                    value={input.amount}
                    onChange={e => handleExpenseChange(idx, "amount", e.target.value)}
                    min={0}
                    placeholder="Amount"
                  />
                  <button
                    className="text-red-500 hover:text-red-700 px-2 ml-2"
                    onClick={() => removeExpense(idx)}
                    aria-label="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1" />
                </div>
                {/* Subcategories */}
                <div className="ml-4">
                  {(input.subcategories || []).map((sub, subIdx) => (
                    <div key={subIdx} className="flex flex-row items-center w-full mb-1">
                      <input
                        className="border rounded px-2 py-1 w-full sm:w-48 bg-transparent"
                        value={sub.name}
                        onChange={e => handleSubcategoryChange(idx, subIdx, "name", e.target.value)}
                        placeholder="Subcategory Name"
                      />
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-full sm:w-28 bg-transparent ml-2"
                        value={sub.amount}
                        onChange={e => handleSubcategoryChange(idx, subIdx, "amount", e.target.value)}
                        min={0}
                        placeholder="Amount"
                      />
                      <button
                        className="text-red-400 hover:text-red-700 px-2 ml-2"
                        onClick={() => removeSubcategory(idx, subIdx)}
                        aria-label="Delete subcategory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex-1" />
                    </div>
                  ))}
                  <button
                    className="mt-1 p-0.5 rounded flex items-center justify-center text-xs border border-gray-300 bg-white text-gray-800 hover:bg-gray-200 dark:bg-[#23232a] dark:text-gray-100 dark:border-gray-700 dark:hover:bg-[#353542]"
                    style={{ width: '22px', height: '22px' }}
                    onClick={() => addSubcategory(idx)}
                    aria-label="Add subcategory"
                  >
                    <span className="text-base leading-none transition-colors duration-150">＋</span>
                  </button>
                </div>
              </div>
            ))}
            <button
              className="mt-2 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm w-full sm:w-auto"
              onClick={addExpense}
            >
              + Add Expense
            </button>
          </div>
        </div>
      </div>
      {/* Sankey Diagramm unterhalb von Income & Expenses */}
      <div className="flex flex-col items-center justify-start mt-8 w-full">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 w-full text-left">Sankey Diagram</h3>
      <div className="mb-2 w-full flex justify-end gap-2">
        <button
          onClick={() => setShowSankeyOverlay(true)}
          className={
            `flex items-center px-3 py-1.5 rounded text-sm border transition-colors duration-150 ` +
            (isDark
              ? 'bg-white text-black border-white hover:bg-gray-200'
              : 'bg-black text-white border-black hover:bg-gray-900')
          }
          title="Sankey groß anzeigen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 8h8v8H8z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
        </button>
        <button
          onClick={downloadChart}
          className={
            `flex items-center px-3 py-1.5 rounded text-sm border transition-colors duration-150 ` +
            (isDark
              ? 'bg-white text-black border-white hover:bg-gray-200'
              : 'bg-black text-white border-black hover:bg-gray-900')
          }
          title="Download SVG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
        <SankeyD3 width={700} height={400} />
        {/* Overlay für großes Sankey */}
        {showSankeyOverlay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sankey-dialog-title"
          >
            <div
              className="relative rounded-lg shadow-lg p-6 max-w-5xl w-full flex flex-col items-center"
              style={{ background: isDark ? '#000' : '#fff' }}
            >
              {/* Visually hidden DialogTitle for accessibility */}
              <h2 id="sankey-dialog-title" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
                Sankey Diagram
              </h2>
              <button
                onClick={() => setShowSankeyOverlay(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                aria-label="Schließen"
                style={{ zIndex: 10 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 w-full text-left">Sankey Diagram</h3>
              <div className="overflow-auto w-full flex justify-center">
                <SankeyD3 width={1100} height={600} textSize={18} />
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
