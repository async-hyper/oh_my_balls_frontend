import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { PresenterLobby, UserLobby, PresenterLive, PresenterResults, UserLive, UserResults } from './routes';
import { createHashRouter, RouterProvider } from 'react-router-dom';
function Landing() {
    return (_jsxs("div", { className: "container", children: [_jsx("div", { className: "header", children: _jsxs("div", { className: "brand", children: [_jsx("span", { className: "badge", children: "Oh\u00A0My\u00A0Balls" }), _jsx("div", { className: "title", children: "Landing" })] }) }), _jsxs("div", { className: "grid", style: { gridTemplateColumns: 'repeat(3,1fr)' }, children: [_jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 800, marginBottom: 8 }, children: "Presenter" }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("button", { className: "btn", onClick: () => location.hash = '#/presenter/lobby', children: "Presenter Lobby" }), _jsx("button", { className: "btn", onClick: () => location.hash = '#/presenter/live', children: "Presenter Live" }), _jsx("button", { className: "btn", onClick: () => location.hash = '#/presenter/results', children: "Presenter Results" })] })] }), _jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 800, marginBottom: 8 }, children: "User" }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("button", { className: "btn", onClick: () => location.hash = '#/user/lobby', children: "User Lobby" }), _jsx("button", { className: "btn", onClick: () => location.hash = '#/user/live', children: "User Live" }), _jsx("button", { className: "btn", onClick: () => location.hash = '#/user/results', children: "User Results" })] })] }), _jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 800, marginBottom: 8 }, children: "Notes" }), _jsx("div", { className: "meta", children: "All screens are static mocks. No API required." })] })] })] }));
}
const router = createHashRouter([
    { path: '/', element: _jsx(Landing, {}) },
    { path: '/presenter/lobby', element: _jsx(PresenterLobby, {}) },
    { path: '/presenter/live', element: _jsx(PresenterLive, {}) },
    { path: '/presenter/results', element: _jsx(PresenterResults, {}) },
    { path: '/user/lobby', element: _jsx(UserLobby, {}) },
    { path: '/user/live', element: _jsx(UserLive, {}) },
    { path: '/user/results', element: _jsx(UserResults, {}) }
]);
createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(RouterProvider, { router: router }) }));
