import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
const verticalSpacingMultiplier = 2.3;
const durSec = 30;
const tickMs = 100;
function fmtUSD(n) {
    if (n == null || Number.isNaN(n))
        return '—';
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtPct(p) {
    if (p == null || Number.isNaN(p))
        return '—';
    return (p >= 0 ? '+' : '') + (p * 100).toFixed(2) + '%';
}
export default function PresenterLive() {
    const labels = useMemo(() => [
        ...Array.from({ length: 9 }, (_, i) => `B${9 - i}`),
        'B0', 'S0',
        ...Array.from({ length: 9 }, (_, i) => `S${i + 1}`)
    ], []);
    const mid = (labels.length - 1) / 2;
    const lanePct = 0.05 / mid;
    const clampPctTotal = 0.07;
    const clampLanes = clampPctTotal / lanePct;
    const canvasRef = useRef(null);
    const indicatorRef = useRef(null);
    const lanesWrapRef = useRef(null);
    const lanesHeaderRef = useRef(null);
    const rightCardRef = useRef(null);
    const resetRef = useRef(() => { });
    const tickRefs = useRef([]);
    const laneRefs = useRef([]);
    const [p0, setP0] = useState(null);
    const [pc, setPc] = useState(null);
    const [chgPct, setChgPct] = useState(null);
    const [direction, setDirection] = useState('—');
    const [countdown, setCountdown] = useState(durSec);
    useEffect(() => {
        const canvasEl = canvasRef.current;
        const indicatorEl = indicatorRef.current;
        if (!canvasEl || !indicatorEl)
            return;
        const context = canvasEl.getContext('2d');
        if (!context)
            return;
        const canvas = canvasEl;
        const indicator = indicatorEl;
        const ctx = context;
        const samples = [];
        let p0Val = 62000 + (Math.random() * 2000 - 1000);
        let idxFloat = mid;
        let dir = Math.random() > 0.5 ? 1 : -1;
        let elapsedMs = 0;
        let secCount = 0;
        let tickTimer = null;
        let secTimer = null;
        const lanesWrap = lanesWrapRef.current;
        const laneEls = laneRefs.current;
        const tickEls = tickRefs.current;
        function resizeCanvasToDisplaySize() {
            const dpr = window.devicePixelRatio || 1;
            const cssW = canvas.clientWidth;
            const cssH = canvas.clientHeight;
            if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
                canvas.width = Math.round(cssW * dpr);
                canvas.height = Math.round(cssH * dpr);
            }
            return dpr;
        }
        function yScaleDOM(idxLike) {
            const cssH = canvas.clientHeight;
            const centerY = cssH / 2;
            const gridZoneHeight = cssH * 0.6;
            const maxOffset = gridZoneHeight / 2;
            const normalizedPos = (idxLike - mid) / (labels.length - 1) * verticalSpacingMultiplier;
            const y = centerY + (normalizedPos * maxOffset);
            return Math.max(0, Math.min(cssH, y));
        }
        function yScale(idxLike) {
            const lo = mid - clampLanes;
            const hi = mid + clampLanes;
            const t = (idxLike - lo) / (hi - lo);
            return canvas.height * t;
        }
        function drawGrid() {
            const dpr = resizeCanvasToDisplaySize();
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.setLineDash([4 * dpr, 4 * dpr]);
            ctx.lineWidth = 1 * dpr;
            const yTop = yScale(mid - clampLanes);
            const yBot = yScale(mid + clampLanes);
            ctx.beginPath();
            ctx.moveTo(0, yTop);
            ctx.lineTo(canvas.width, yTop);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, yBot);
            ctx.lineTo(canvas.width, yBot);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            const centerY = canvas.height / 2;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(canvas.width, centerY);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.09)';
            for (let i = 0; i < labels.length; i++) {
                const cssH = canvas.height;
                const center = cssH / 2;
                const gridZoneHeight = cssH * 0.6;
                const maxOffset = gridZoneHeight / 2;
                const normalizedPos = (i - mid) / (labels.length - 1) * verticalSpacingMultiplier;
                const y = center + (normalizedPos * maxOffset);
                if (y >= 0 && y <= canvas.height) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
        function drawTrail() {
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.lineWidth = 2 * dpr;
            ctx.strokeStyle = '#34d399';
            ctx.beginPath();
            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];
                const padL = 24 * dpr, padR = 24 * dpr;
                const w = canvas.width - padL - padR;
                const x = padL + (sample.tMs / (durSec * 1000)) * w;
                const cssH = canvas.height;
                const center = cssH / 2;
                const gridZoneHeight = cssH * 0.6;
                const maxOffset = gridZoneHeight / 2;
                const normalizedPos = (sample.idxFloat - mid) / (labels.length - 1) * verticalSpacingMultiplier;
                const y = center + (normalizedPos * maxOffset);
                if (i === 0)
                    ctx.moveTo(x, y);
                else
                    ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }
        function updateIndicatorLine(idxRounded) {
            if (!indicator)
                return;
            indicator.style.top = yScaleDOM(idxRounded) + 'px';
        }
        function positionRightLanes() {
            const lanesWrapEl = lanesWrapRef.current;
            const lanesHeaderEl = lanesHeaderRef.current;
            const rightCardEl = rightCardRef.current;
            if (!lanesWrapEl || !lanesHeaderEl || !rightCardEl)
                return;
            const canvasRect = canvas.getBoundingClientRect();
            const cardRect = rightCardEl.getBoundingClientRect();
            const headerHeight = lanesHeaderEl.offsetHeight + 8;
            const offset = canvasRect.top - cardRect.top - headerHeight;
            lanesWrapEl.style.marginTop = offset + 'px';
            lanesWrapEl.style.height = canvas.clientHeight + 'px';
            laneEls.forEach((el, idx) => {
                if (!el)
                    return;
                el.style.top = yScaleDOM(idx) + 'px';
            });
        }
        function updateBoard(idxRounded) {
            laneEls.forEach((el, idx) => {
                if (!el)
                    return;
                if (idx === idxRounded)
                    el.classList.add('win');
                else
                    el.classList.remove('win');
            });
            const delta = mid - idxRounded;
            const offsetPct = delta * lanePct;
            const current = p0Val * (1 + offsetPct);
            setPc(current);
            setChgPct(p0Val ? (current - p0Val) / p0Val : 0);
            setDirection(offsetPct > 0 ? '↑ Long (B)' : offsetPct < 0 ? '↓ Short (S)' : '—');
            updateIndicatorLine(idxRounded);
        }
        function tick() {
            if (Math.random() < 0.15)
                dir *= -1;
            let step = Math.random() * 1.5;
            if (Math.random() < 0.05)
                step += 2.5;
            step *= dir;
            idxFloat += step;
            const lo = mid - clampLanes;
            const hi = mid + clampLanes;
            if (idxFloat < lo)
                idxFloat = lo;
            if (idxFloat > hi)
                idxFloat = hi;
            const idxRounded = Math.max(0, Math.min(labels.length - 1, Math.round(idxFloat)));
            elapsedMs += tickMs;
            if (elapsedMs > durSec * 1000)
                elapsedMs = durSec * 1000;
            samples.push({ tMs: elapsedMs, idxFloat });
            drawGrid();
            drawTrail();
            updateBoard(idxRounded);
        }
        function start() {
            laneEls.forEach(el => el?.classList.remove('win'));
            tickEls.forEach(el => el?.classList.remove('active'));
            p0Val = 62000 + (Math.random() * 2000 - 1000);
            idxFloat = mid;
            dir = Math.random() > 0.5 ? 1 : -1;
            elapsedMs = 0;
            secCount = 0;
            samples.length = 0;
            setP0(p0Val);
            setPc(p0Val);
            setChgPct(0);
            setDirection('—');
            setCountdown(durSec);
            resizeCanvasToDisplaySize();
            drawGrid();
            drawTrail();
            positionRightLanes();
            updateBoard(Math.round(idxFloat));
            if (secTimer)
                window.clearInterval(secTimer);
            if (tickTimer)
                window.clearInterval(tickTimer);
            secTimer = window.setInterval(() => {
                const el = tickEls[secCount];
                if (el)
                    el.classList.add('active');
                secCount++;
                const remaining = Math.max(0, durSec - secCount);
                setCountdown(remaining);
                if (secCount > durSec) {
                    if (secTimer) {
                        window.clearInterval(secTimer);
                        secTimer = null;
                    }
                    if (tickTimer) {
                        window.clearInterval(tickTimer);
                        tickTimer = null;
                    }
                    setTimeout(() => { window.location.hash = '#/presenter/results'; }, 700);
                }
            }, 1000);
            tickTimer = window.setInterval(() => {
                if (elapsedMs < durSec * 1000) {
                    tick();
                }
            }, tickMs);
        }
        function stop() {
            if (secTimer) {
                window.clearInterval(secTimer);
                secTimer = null;
            }
            if (tickTimer) {
                window.clearInterval(tickTimer);
                tickTimer = null;
            }
        }
        const handleResize = () => {
            resizeCanvasToDisplaySize();
            drawGrid();
            drawTrail();
            positionRightLanes();
            updateIndicatorLine(Math.round(idxFloat));
        };
        start();
        window.addEventListener('resize', handleResize);
        resetRef.current = () => { stop(); start(); };
        return () => {
            stop();
            window.removeEventListener('resize', handleResize);
        };
    }, [labels, mid, clampLanes, lanePct]);
    const ticks = Array.from({ length: 31 });
    if (tickRefs.current.length !== ticks.length) {
        tickRefs.current = Array(ticks.length).fill(null);
    }
    if (laneRefs.current.length !== labels.length) {
        laneRefs.current = Array(labels.length).fill(null);
    }
    return (_jsxs("div", { className: "container", style: { maxWidth: 900 }, children: [_jsxs("div", { className: "header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("span", { className: "badge", children: "Oh\u00A0My\u00A0Balls" }), _jsx("div", { className: "title", children: "Presenter \u2014 Live (Synced Panels \u00B7 Fixed Top)" })] }), _jsxs("div", { className: "timeline card", style: { padding: '8px 12px' }, children: [_jsx("div", { className: "meta", children: "t0" }), _jsx("div", { className: "ticks", children: ticks.map((_, i) => (_jsx("div", { className: "tick", ref: el => { tickRefs.current[i] = el; } }, i))) }), _jsx("div", { className: "meta", children: "t30" }), _jsxs("div", { className: "meta", children: [countdown, "s"] })] })] }), _jsxs("div", { className: "stage", children: [_jsx("div", { className: "leftPanel", children: _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }, children: [_jsxs("div", { className: "stat", children: [_jsx("div", { className: "meta", children: "Anchor p0" }), _jsx("div", { className: "v", children: fmtUSD(p0) })] }), _jsxs("div", { className: "stat", children: [_jsx("div", { className: "meta", children: "Current" }), _jsx("div", { className: "v", children: fmtUSD(pc) })] }), _jsxs("div", { className: "stat", children: [_jsx("div", { className: "meta", children: "\u0394 %" }), _jsx("div", { className: "v", children: fmtPct(chgPct) })] }), _jsxs("div", { className: "stat", children: [_jsx("div", { className: "meta", children: "Direction" }), _jsx("div", { className: "v", children: direction })] })] }), _jsx("div", { className: "meta", style: { marginBottom: 8 }, children: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D: \u0448\u0430\u0440\u044B \u0441\u043F\u0440\u0430\u0432\u0430 \u0432\u044B\u0440\u0430\u0432\u043D\u0435\u043D\u044B \u0441 \u0441\u0435\u0442\u043A\u043E\u0439 \u0433\u0440\u0430\u0444\u0438\u043A\u0430. \u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F \u00B17%, \u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u043D\u044B\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u044B." }), _jsxs("div", { style: { position: 'relative' }, children: [_jsx("canvas", { ref: canvasRef, className: "chart", style: { display: 'block', width: '100%', height: 700, borderRadius: 12, border: '1px solid rgba(255,255,255,.08)', background: 'linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01))' } }), _jsx("div", { ref: indicatorRef, className: "indicatorLine", style: { top: '50%' } })] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 10 }, children: [_jsx("button", { className: "btn", onClick: () => resetRef.current(), children: "Reset" }), _jsx("button", { className: "btn", onClick: () => { window.location.hash = '#/presenter/results'; }, children: "Resolve \u2192" })] })] }) }), _jsx("div", { className: "rightPanel", children: _jsxs("div", { className: "card", ref: rightCardRef, children: [_jsx("div", { ref: lanesHeaderRef, style: { fontWeight: 800, marginBottom: 8 }, children: "Balls (S9\u2192B9)" }), _jsx("div", { className: "lanesWrap", ref: lanesWrapRef, children: labels.map((label, idx) => (_jsx("div", { className: "laneDot", ref: el => { laneRefs.current[idx] = el; }, children: _jsx("span", { className: `ball ${label.startsWith('B') ? 'long' : 'short'}`, children: label }) }, label))) })] }) })] })] }));
}
