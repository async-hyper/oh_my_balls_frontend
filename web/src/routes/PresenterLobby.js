import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useState } from 'react';
const NAME_POOL = ["Atlas", "Nova", "Zora", "Kai", "Mira", "Juno", "Vega", "Rex", "Luna", "Orion", "Echo", "Rune", "Iris", "Nix", "Axel", "Skye", "Pax", "Rio", "Nyx", "Zed"];
const BALL_POOL = [...Array(10).keys()].map(i => `B${i}`).concat([...Array(10).keys()].map(i => `S${i}`));
export default function PresenterLobby() {
    const [players, setPlayers] = useState([]);
    const nextIdRef = useRef(1);
    const addPlayer = useCallback(() => {
        setPlayers(prev => {
            if (prev.length >= 20)
                return prev;
            const used = new Set(prev.map(p => p.ball));
            const available = BALL_POOL.filter(ball => !used.has(ball));
            if (available.length === 0)
                return prev;
            const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
            const ball = available[Math.floor(Math.random() * available.length)];
            const player = { id: nextIdRef.current++, name, ball, joined: true };
            return [...prev, player];
        });
    }, []);
    const seedPlayers = useCallback(() => {
        nextIdRef.current = 1;
        setPlayers(() => {
            const seeded = [];
            for (let i = 0; i < 12; i++) {
                const used = new Set(seeded.map(p => p.ball));
                const available = BALL_POOL.filter(ball => !used.has(ball));
                if (!available.length)
                    break;
                const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
                const ball = available[Math.floor(Math.random() * available.length)];
                seeded.push({ id: nextIdRef.current++, name, ball, joined: true });
            }
            return seeded;
        });
    }, []);
    const participantCount = players.length;
    const rows = useMemo(() => {
        if (participantCount === 0)
            return null;
        return players.map((p, idx) => {
            const side = p.ball.startsWith('B') ? 'long' : 'short';
            return (_jsxs("tr", { children: [_jsx("td", { className: "meta", children: idx + 1 }), _jsx("td", { children: p.name }), _jsx("td", { children: _jsx("span", { className: `pill ${side}`, children: p.ball }) }), _jsx("td", { children: _jsx("span", { className: "meta", children: p.joined ? 'Ready' : 'Pending' }) })] }, p.id));
        });
    }, [players, participantCount]);
    return (_jsxs("div", { className: "container", children: [_jsxs("div", { className: "header", children: [_jsxs("div", { className: "brand", children: [_jsx("span", { className: "badge", children: "Oh\u00A0My\u00A0Balls" }), _jsx("div", { className: "title", children: "Presenter \u2014 Lobby" })] }), _jsxs("div", { className: "meta", children: ["Max players ", _jsx("b", { children: "20" }), " \u00B7 Session length ", _jsx("b", { children: "30s" })] })] }), _jsxs("div", { className: "grid", style: { gridTemplateColumns: '360px 1fr' }, children: [_jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("div", { style: { fontWeight: 800 }, children: "Join Game" }), _jsx("span", { className: "tag", children: "Scan to join" })] }), _jsx("div", { className: "qr", style: { padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("img", { src: "/qr-code.png", alt: "Join Oh My Balls lobby", style: { width: 300, maxWidth: '100%', height: 'auto' } }) }), _jsx("hr", {}), _jsxs("div", { className: "meta", children: ["Tip: map this to ", _jsx("span", { className: "kbd", children: "/user-lobby.html" }), " (no wallet required)"] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("div", { style: { fontWeight: 800 }, children: "Participants" }), _jsxs("span", { className: "pill", id: "count", style: { background: 'rgba(34,211,238,.15)', border: '1px solid rgba(34,211,238,.35)', color: '#67e8f9' }, children: [participantCount, "/20"] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("button", { className: "btn", onClick: seedPlayers, children: "Seed Demo" }), _jsx("button", { className: "btn", onClick: addPlayer, children: "+ Add" })] })] }), _jsxs("table", { className: "table", id: "ptable", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: 44 }, children: "#" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Ball" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: rows || (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "meta", style: { textAlign: 'center', padding: '18px 10px' }, children: "Waiting for players\u2026" }) })) })] }), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }, children: _jsx("button", { className: "btn", onClick: () => { window.location.hash = '#/presenter/live'; }, children: "Start Game \u2192" }) })] })] }), _jsx("div", { className: "footer", children: "Demo UI \u00B7 Replace placeholders with your backend events" })] }));
}
