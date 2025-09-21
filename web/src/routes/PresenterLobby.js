import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const BALL_SEQUENCE = [...Array(10).keys()].map(i => `b${i}`).concat([...Array(10).keys()].map(i => `s${i}`));
let mockStatusBalls = [];
let mockStatusCursor = 0;
function resetMockStatus() {
    mockStatusBalls = [];
    mockStatusCursor = 0;
}
async function mockStatusFetch() {
    if (mockStatusCursor < BALL_SEQUENCE.length) {
        mockStatusBalls = [...mockStatusBalls, BALL_SEQUENCE[mockStatusCursor]];
        mockStatusCursor += 1;
    }
    return Promise.resolve({ status: 0, balls: [...mockStatusBalls] });
}
export default function PresenterLobby() {
    const navigate = useNavigate();
    const [balls, setBalls] = useState([]);
    useEffect(() => {
        resetMockStatus();
        setBalls([]);
        let cancelled = false;
        let intervalId = null;
        const fetchStatus = async () => {
            const res = await mockStatusFetch();
            if (cancelled)
                return;
            const normalized = res.balls.map(ball => ball.toUpperCase());
            setBalls(normalized);
            if (res.balls.length >= BALL_SEQUENCE.length && intervalId !== null) {
                window.clearInterval(intervalId);
                intervalId = null;
            }
        };
        fetchStatus();
        intervalId = window.setInterval(fetchStatus, 1000);
        return () => {
            cancelled = true;
            if (intervalId !== null)
                window.clearInterval(intervalId);
        };
    }, []);
    useEffect(() => {
        if (balls.length >= BALL_SEQUENCE.length) {
            const timer = window.setTimeout(() => navigate('/presenter/live'), 400);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [balls.length, navigate]);
    const rows = useMemo(() => {
        if (balls.length === 0)
            return null;
        return balls.map((ball, idx) => {
            const side = ball.startsWith('B') ? 'long' : 'short';
            return (_jsxs("tr", { children: [_jsx("td", { className: "meta", children: idx + 1 }), _jsx("td", { children: _jsx("span", { className: `pill ${side}`, children: ball }) }), _jsx("td", { children: _jsx("span", { className: "meta", children: "Ready" }) })] }, ball + idx));
        });
    }, [balls]);
    const participantCount = balls.length;
    return (_jsxs("div", { className: "container", children: [_jsxs("div", { className: "header", children: [_jsxs("div", { className: "brand", children: [_jsx("span", { className: "badge", children: "Oh\u00A0My\u00A0Balls" }), _jsx("div", { className: "title", children: "Presenter \u2014 Lobby" })] }), _jsxs("div", { className: "meta", children: ["Max players ", _jsx("b", { children: "20" }), " \u00B7 Session length ", _jsx("b", { children: "30s" })] })] }), _jsxs("div", { className: "grid", style: { gridTemplateColumns: '360px 1fr' }, children: [_jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("div", { style: { fontWeight: 800 }, children: "Join Game" }), _jsx("span", { className: "tag", children: "Scan to join" })] }), _jsx("div", { className: "qr", style: { padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("img", { src: "/qr-code.png", alt: "Join Oh My Balls lobby", style: { width: 300, maxWidth: '100%', height: 'auto' } }) }), _jsx("hr", {}), _jsxs("div", { className: "meta", children: ["Tip: map this to ", _jsx("span", { className: "kbd", children: "/user-lobby.html" }), " (no wallet required)"] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("div", { style: { fontWeight: 800 }, children: "Participants" }), _jsxs("span", { className: "pill", id: "count", style: { background: 'rgba(34,211,238,.15)', border: '1px solid rgba(34,211,238,.35)', color: '#67e8f9' }, children: [participantCount, "/20"] })] }), _jsx("div", { className: "meta", children: "Polling mock status every 1s\u2026" })] }), _jsxs("table", { className: "table", id: "ptable", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: 44 }, children: "#" }), _jsx("th", { children: "Ball" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: rows || (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "meta", style: { textAlign: 'center', padding: '18px 10px' }, children: "Waiting for players\u2026" }) })) })] })] })] }), _jsx("div", { className: "footer", children: "Demo UI \u00B7 Replace placeholders with your backend events" })] }));
}
