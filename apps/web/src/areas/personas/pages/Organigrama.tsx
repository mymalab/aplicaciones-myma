import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchOrganigramaData } from '../services/organigramaService';
import { OrganigramaPersona } from '../types';

// Colores para las áreas
const PALETTE = ["#21c7b7", "#6ea8fe", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#22d3ee", "#c084fc", "#f87171", "#60a5fa"];

const OrganigramaPage: React.FC = () => {
  const [people, setPeople] = useState<OrganigramaPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [userZoom, setUserZoom] = useState(1.0);
  const [autoZoom, setAutoZoom] = useState(1.0);
  const [searchTerm, setSearchTerm] = useState('');

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);
  const linksSvgRef = useRef<SVGSVGElement>(null);

  const USER_MIN = 0.30;
  const USER_MAX = 2.20;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchOrganigramaData();
      setPeople(data);
    } catch (error) {
      console.error('Error loading organigrama:', error);
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  // Construir mapas de datos
  const byId = new Map(people.map(p => [p.id, p]));
  const children = new Map<string, string[]>();
  people.forEach(p => children.set(p.id, []));
  people.forEach(p => {
    if (p.managerId) {
      const kids = children.get(p.managerId) || [];
      kids.push(p.id);
      children.set(p.managerId, kids);
    }
  });

  const ROOT = people.find(p => !p.managerId)?.id || people[0]?.id;

  // Mapa de colores por área
  const areas = [...new Set(people.map(p => p.area))];
  const cmap = new Map(areas.map((a, i) => [a, PALETTE[i % PALETTE.length]]));

  // Calcular conjunto visible
  const visibleSet = useCallback(() => {
    const vis = new Set<string>([ROOT]);
    let changed = true;
    let safety = 0;

    while (changed && safety < 120) {
      changed = false;
      safety++;

      for (const p of people) {
        if (vis.has(p.id)) continue;
        if (!p.managerId) continue;
        if (vis.has(p.managerId) && expanded.has(p.managerId)) {
          vis.add(p.id);
          changed = true;
        }
      }
    }
    return vis;
  }, [people, expanded, ROOT]);

  // Construir filas
  const buildRows = useCallback((vis: Set<string>) => {
    const rows: string[][] = [];
    let cur = [ROOT];
    let safety = 0;

    while (cur.length && safety < 60) {
      rows.push(cur);
      const nxt: string[] = [];
      for (const id of cur) {
        for (const c of (children.get(id) || [])) {
          if (vis.has(c)) nxt.push(c);
        }
      }
      cur = nxt;
      safety++;
    }
    return rows;
  }, [ROOT, children]);

  // Calcular auto-fit
  const computeAutoFit = useCallback(() => {
    if (!stageRef.current || !canvasRef.current) return;

    const pad = 18;
    const stageW = stageRef.current.clientWidth - pad * 2;
    const stageH = stageRef.current.clientHeight - pad * 2;

    const contentW = canvasRef.current.offsetWidth;
    const contentH = canvasRef.current.offsetHeight;

    const sW = stageW / Math.max(1, contentW);
    const sH = stageH / Math.max(1, contentH);

    const newAutoZoom = Math.min(1.02, sW, sH);
    setAutoZoom(Math.max(0.35, Math.min(1.02, newAutoZoom)));
  }, []);

  // Aplicar zoom
  const applyZoom = useCallback(() => {
    if (!canvasRef.current) return;
    const z = Math.max(USER_MIN, Math.min(USER_MAX, userZoom)) * autoZoom;
    canvasRef.current.style.transform = `scale(${z})`;
  }, [userZoom, autoZoom]);

  useEffect(() => {
    applyZoom();
  }, [applyZoom]);

  // Dibujar enlaces
  const drawLinks = useCallback((vis: Set<string>) => {
    if (!linksSvgRef.current || !canvasRef.current) return;

    const svg = linksSvgRef.current;
    const canvas = canvasRef.current;

    // Limpiar enlaces anteriores
    svg.querySelectorAll('path.__link').forEach(p => p.remove());

    // Asegurar defs
    if (!svg.querySelector('defs')) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      filter.setAttribute("id", "linkShadow");
      filter.setAttribute("x", "-25%");
      filter.setAttribute("y", "-25%");
      filter.setAttribute("width", "150%");
      filter.setAttribute("height", "150%");
      filter.innerHTML = `<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.20"/>`;
      defs.appendChild(filter);
      svg.appendChild(defs);
    }

    // Tamaño SVG
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w.toString());
    svg.setAttribute("height", h.toString());

    // Obtener escala
    const tr = getComputedStyle(canvas).transform;
    const scale = tr && tr !== "none" ? new DOMMatrixReadOnly(tr).a : 1;
    const validScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

    // Dibujar enlaces
    for (const p of people) {
      if (!p.managerId) continue;
      if (!vis.has(p.id) || !vis.has(p.managerId)) continue;
      if (!expanded.has(p.managerId)) continue;

      const parentEl = document.querySelector(`.card[data-id="${p.managerId}"]`);
      const childEl = document.querySelector(`.card[data-id="${p.id}"]`);
      if (!parentEl || !childEl) continue;

      const cr = canvas.getBoundingClientRect();
      const pr = parentEl.getBoundingClientRect();
      const chr = childEl.getBoundingClientRect();

      const A = {
        x: ((pr.left - cr.left) + pr.width / 2) / validScale,
        y: ((pr.bottom - cr.top) - 6) / validScale
      };

      const B = {
        x: ((chr.left - cr.left) + chr.width / 2) / validScale,
        y: ((chr.top - cr.top) + 6) / validScale
      };

      const dy = Math.max(90, (B.y - A.y) * 0.65);
      const dx = B.x - A.x;
      const offset = Math.abs(dx) < 8 ? 18 : dx * 0.15;

      const c1 = { x: A.x + offset, y: A.y + dy };
      const c2 = { x: B.x - offset, y: B.y - dy };

      const d = `M ${A.x} ${A.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${B.x} ${B.y}`;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("__link");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#6b7280");
      path.setAttribute("stroke-width", "3");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("filter", "url(#linkShadow)");

      svg.appendChild(path);
    }
  }, [people, expanded]);

  // Manejar click en tarjeta
  const onCardClick = useCallback((id: string) => {
    setLastClicked(id);
    const hasKids = (children.get(id) || []).length > 0;
    if (hasKids) {
      setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }

    setTimeout(() => {
      const el = document.querySelector(`.card[data-id="${id}"]`);
      if (el && stageRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }, 100);
  }, [children]);

  // Renderizar
  useEffect(() => {
    if (loading || !nodesRef.current) return;

    const vis = visibleSet();
    const rows = buildRows(vis);

    nodesRef.current.innerHTML = "";

    for (const ids of rows) {
      const row = document.createElement("div");
      row.className = "flex justify-center gap-12 px-2";

      for (const id of ids) {
        const p = byId.get(id);
        if (!p) continue;

        const accent = cmap.get(p.area) || "#6ea8fe";

        const card = document.createElement("div");
        card.className = "card relative w-[360px] p-4 rounded-[20px] bg-gradient-to-b from-white/98 to-gray-50/94 border border-gray-200/80 shadow-lg flex items-center gap-3 cursor-pointer select-none transition-all hover:-translate-y-0.5 hover:shadow-xl";
        card.dataset.id = id;
        card.style.setProperty("--accent", accent);

        card.innerHTML = `
          <div class="tag absolute -top-3 left-5 px-3 py-1.5 rounded-full text-white text-xs font-black tracking-wide border border-white/20 shadow-lg" style="background: linear-gradient(180deg, rgba(255,255,255,.32), rgba(255,255,255,.06)), ${accent};">
            ${(p.area || "").toUpperCase()}
          </div>
          <div class="badge w-[58px] h-[58px] rounded-full flex-shrink-0 shadow-lg" style="background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), rgba(255,255,255,0)), ${accent}; box-shadow: inset 0 0 0 6px rgba(255,255,255,.78), 0 10px 18px rgba(16,24,40,.12);"></div>
          <div class="meta flex flex-col gap-1 min-w-0 flex-1">
            <div class="name font-black text-base whitespace-nowrap overflow-hidden text-ellipsis">${p.name}</div>
            <div class="role font-extrabold text-[13px] text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">${p.role}</div>
          </div>
        `;

        card.addEventListener("click", () => onCardClick(id));
        row.appendChild(card);
      }

      nodesRef.current.appendChild(row);
    }

    setTimeout(() => {
      computeAutoFit();
      applyZoom();
      drawLinks(vis);
    }, 100);
  }, [people, expanded, loading, visibleSet, buildRows, byId, cmap, onCardClick, computeAutoFit, applyZoom, drawLinks]);

  // Zoom con rueda + Ctrl
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setUserZoom(prev => Math.max(USER_MIN, Math.min(USER_MAX, prev * factor)));
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [USER_MIN, USER_MAX]);

  // Scroll: redibujar enlaces
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleScroll = () => {
      requestAnimationFrame(() => {
        const vis = visibleSet();
        drawLinks(vis);
      });
    };

    stage.addEventListener("scroll", handleScroll);
    return () => stage.removeEventListener("scroll", handleScroll);
  }, [visibleSet, drawLinks]);

  const handleZoomIn = () => setUserZoom(prev => Math.max(USER_MIN, Math.min(USER_MAX, prev * 1.10)));
  const handleZoomOut = () => setUserZoom(prev => Math.max(USER_MIN, Math.min(USER_MAX, prev / 1.10)));
  const handleZoomReset = () => {
    setUserZoom(1.0);
    setExpanded(new Set());
    setLastClicked(null);
    if (stageRef.current) {
      stageRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  const handleExport = () => {
    alert('Función de exportación próximamente disponible');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando organigrama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black text-[#0b1220]">Organigrama</h1>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary">
              Vista General
            </button>
            <button className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100">
              Vista Detallada
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar en organigrama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-gray-700 font-medium">{people.length} COLABORADORES</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-700 font-medium">{areas.length} GERENCIAS</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomReset}
            className="px-3 py-1.5 text-sm font-black border border-gray-200 bg-white text-[#0b1220] rounded-xl hover:bg-gray-50 transition-colors"
          >
            Inicio
          </button>
          <button
            onClick={handleZoomOut}
            className="px-3 py-1.5 text-sm font-black border border-gray-200 bg-white text-[#0b1220] rounded-xl hover:bg-gray-50 transition-colors"
          >
            -
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-1.5 text-sm font-black border border-gray-200 bg-white text-[#0b1220] rounded-xl hover:bg-gray-50 transition-colors"
          >
            {Math.round(Math.max(USER_MIN, Math.min(USER_MAX, userZoom)) * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="px-3 py-1.5 text-sm font-black border border-gray-200 bg-white text-[#0b1220] rounded-xl hover:bg-gray-50 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="flex-1 overflow-auto relative p-7 pb-8"
      >
        <div
          ref={canvasRef}
          className="relative origin-top-center will-change-transform"
          style={{ minWidth: '1100px' }}
        >
          <svg
            ref={linksSvgRef}
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            preserveAspectRatio="none"
          />
          <div
            ref={nodesRef}
            className="relative flex flex-col gap-[120px] min-w-[1100px] py-3.5 pt-3.5 pb-6"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div></div>
        <div>Última actualización: {new Date().toLocaleDateString('es-CL')}</div>
      </div>
    </div>
  );
};

export default OrganigramaPage;

