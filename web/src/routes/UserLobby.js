import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { mockJoin } from '../lib/mockServer';
function getOrCreateUUID() {
    const key = 'omb_user_uuid';
    const existing = localStorage.getItem(key);
    if (existing)
        return existing;
    const generated = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    localStorage.setItem(key, generated);
    return generated;
}
export default function UserLobby() {
    const [ball, setBall] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const uuid = getOrCreateUUID();
        let cancelled = false;
        (async () => {
            try {
                const res = await mockJoin(uuid);
                if (cancelled)
                    return;
                setBall(res.ball);
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const displayBall = ball ?? '—';
    const side = useMemo(() => displayBall.startsWith('B') ? 'long' : 'short', [displayBall]);
    const tag = loading ? 'Assigning ball…' : 'Waiting for start…';
    return (_jsxs("div", { className: "container", style: { maxWidth: 720 }, children: [_jsxs("div", { className: "header", children: [_jsxs("div", { className: "brand", children: [_jsx("span", { className: "badge", children: "Oh\u00A0My\u00A0Balls" }), _jsx("div", { className: "title", children: "Your Assignment" })] }), _jsx("span", { className: "tag", children: tag })] }), _jsxs("div", { className: "card", style: { textAlign: 'center', padding: 28 }, children: [_jsx("div", { className: "meta", children: "Your Ball" }), _jsx("div", { className: `bigball pill ${side}`, style: { display: 'inline-block', margin: '10px 0', padding: '10px 16px' }, children: displayBall }), _jsx("div", { className: "meta", children: "Keep this page open. The game will start automatically." }), _jsx("hr", {}), _jsx("div", { className: "notice", children: "Mock screen \u2014 ball comes from the /join mock endpoint." }), _jsx("div", { style: { marginTop: 12 }, children: _jsx("button", { className: "btn", onClick: () => { window.location.hash = '#/user/live'; }, children: "Preview Live Screen \u2192" }) })] }), _jsx("div", { className: "footer", children: "Tip: add a sound/vibrate on start" })] }));
}
