import { Link } from "react-router-dom";
import { useState, useEffect, useRef, type PropsWithChildren } from "react";
import { usePlatformAuth } from "@/platform/state/auth";

// Inline styles for the premium landing page
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0a0a0f;
    --ink-90: rgba(10,10,15,0.9);
    --ink-60: rgba(10,10,15,0.6);
    --ink-30: rgba(10,10,15,0.3);
    --ink-10: rgba(10,10,15,0.08);
    --cream: #faf8f4;
    --cream-80: rgba(250,248,244,0.8);
    --gold: #c9a96e;
    --gold-light: #e8d5a8;
    --gold-deep: #a07840;
    --teal: #1a5c5c;
    --teal-light: #2a8080;
    --sky: #e8f0ef;
    --font-display: 'Cormorant Garamond', Georgia, serif;
    --font-body: 'DM Sans', sans-serif;
    --radius: 4px;
    --radius-lg: 12px;
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--cream);
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ─── NAV ─────────────────────────────────────────────── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(1.5rem, 5vw, 4rem);
    height: 72px;
    background: rgba(250,248,244,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--ink-10);
    transition: box-shadow 0.3s;
  }
  .nav.scrolled { box-shadow: 0 2px 32px rgba(0,0,0,0.06); }

  .nav-brand {
    display: flex; align-items: center; gap: 12px;
    text-decoration: none; color: var(--ink);
  }
  .nav-brand-icon {
    width: 36px; height: 36px;
    background: var(--ink);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: var(--gold);
    font-size: 18px;
    flex-shrink: 0;
  }
  .nav-brand-name {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1.2;
  }
  .nav-brand-sub {
    font-size: 0.68rem;
    color: var(--ink-60);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .nav-links {
    display: flex; gap: 2rem;
    list-style: none;
  }
  .nav-links a {
    font-size: 0.88rem;
    color: var(--ink-60);
    text-decoration: none;
    letter-spacing: 0.02em;
    transition: color 0.2s;
  }
  .nav-links a:hover { color: var(--ink); }

  .nav-actions { display: flex; gap: 10px; align-items: center; }

  .btn-ghost {
    display: inline-flex; align-items: center;
    padding: 8px 20px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--ink-60);
    border: 1px solid var(--ink-30);
    border-radius: var(--radius);
    text-decoration: none;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .btn-ghost:hover { color: var(--ink); border-color: var(--ink-60); }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 22px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--cream);
    background: var(--ink);
    border: none;
    border-radius: var(--radius);
    text-decoration: none;
    transition: all 0.25s var(--ease-out);
    white-space: nowrap;
    cursor: pointer;
  }
  .btn-primary:hover {
    background: var(--teal);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(26,92,92,0.25);
  }

  .btn-gold {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 32px;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    color: var(--ink);
    background: var(--gold);
    border: none;
    border-radius: var(--radius);
    text-decoration: none;
    transition: all 0.25s var(--ease-out);
    cursor: pointer;
  }
  .btn-gold:hover {
    background: var(--gold-light);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(201,169,110,0.35);
  }

  .nav-hamburger {
    display: none;
    flex-direction: column; gap: 5px;
    background: none; border: none; cursor: pointer;
    padding: 4px;
  }
  .nav-hamburger span {
    display: block; width: 22px; height: 1.5px;
    background: var(--ink);
    transition: all 0.3s;
  }

  /* ─── HERO ────────────────────────────────────────────── */
  .hero {
    min-height: 100vh;
    padding: 140px clamp(1.5rem, 5vw, 4rem) 80px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  .hero-bg-shape {
    position: absolute; inset: 0; z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .hero-bg-shape::before {
    content: '';
    position: absolute;
    top: -20%; right: -10%;
    width: 70vw; height: 70vw;
    max-width: 900px; max-height: 900px;
    background: radial-gradient(ellipse at center, rgba(26,92,92,0.06) 0%, transparent 65%);
    border-radius: 50%;
  }
  .hero-bg-shape::after {
    content: '';
    position: absolute;
    bottom: -10%; left: -5%;
    width: 50vw; height: 50vw;
    max-width: 600px; max-height: 600px;
    background: radial-gradient(ellipse at center, rgba(201,169,110,0.07) 0%, transparent 65%);
    border-radius: 50%;
  }

  .hero-copy { position: relative; z-index: 1; }

  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--gold-deep);
    margin-bottom: 1.5rem;
  }
  .hero-eyebrow::before {
    content: '';
    display: block; width: 28px; height: 1px;
    background: var(--gold);
  }

  .hero-h1 {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 5vw, 4.2rem);
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: var(--ink);
    margin-bottom: 1.5rem;
  }
  .hero-h1 em {
    font-style: italic;
    color: var(--teal);
  }

  .hero-desc {
    font-size: 1rem;
    line-height: 1.75;
    color: var(--ink-60);
    max-width: 500px;
    margin-bottom: 2.5rem;
  }

  .hero-actions {
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
    margin-bottom: 3rem;
  }

  .hero-link {
    font-size: 0.85rem;
    color: var(--ink-60);
    text-decoration: none;
    border-bottom: 1px solid var(--ink-30);
    padding-bottom: 2px;
    transition: color 0.2s, border-color 0.2s;
  }
  .hero-link:hover { color: var(--ink); border-color: var(--ink); }

  .hero-chips {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .hero-chip {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    padding: 5px 14px;
    background: var(--ink-10);
    border: 1px solid var(--ink-10);
    border-radius: 100px;
    color: var(--ink-60);
  }

  /* ─── CONSOLE CARD ────────────────────────────────────── */
  .console-wrap {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; gap: 16px;
  }

  .console-card {
    background: white;
    border-radius: 16px;
    border: 1px solid rgba(10,10,15,0.06);
    box-shadow:
      0 1px 2px rgba(0,0,0,0.04),
      0 8px 40px rgba(0,0,0,0.06),
      0 40px 80px rgba(0,0,0,0.04);
    overflow: hidden;
    animation: floatCard 6s ease-in-out infinite;
  }

  @keyframes floatCard {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .console-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--ink-10);
  }
  .console-workspace-label {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-60);
    margin-bottom: 2px;
  }
  .console-workspace-name {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 500;
  }
  .console-status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    background: rgba(26,92,92,0.08);
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--teal);
  }
  .console-status::before {
    content: '';
    width: 6px; height: 6px;
    background: var(--teal-light);
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }

  .console-panels {
    display: grid; grid-template-columns: 1fr 1fr;
  }
  .console-panel {
    padding: 20px 24px;
  }
  .console-panel + .console-panel {
    border-left: 1px solid var(--ink-10);
    background: #fdfcfa;
  }
  .console-panel-label {
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--gold-deep);
    margin-bottom: 6px;
  }
  .console-panel-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--ink);
  }
  .console-checklist {
    list-style: none;
    display: flex; flex-direction: column; gap: 6px;
  }
  .console-checklist li {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 0.78rem;
    color: var(--ink-60);
    line-height: 1.4;
  }
  .console-checklist li::before {
    content: '✓';
    color: var(--teal);
    font-size: 0.7rem;
    margin-top: 1px;
    flex-shrink: 0;
  }

  .mini-chat { display: flex; flex-direction: column; gap: 8px; }
  .mini-bubble {
    font-size: 0.76rem;
    line-height: 1.4;
    padding: 8px 12px;
    border-radius: 10px;
    max-width: 90%;
  }
  .mini-bubble.assistant {
    background: var(--sky);
    color: var(--ink);
    align-self: flex-start;
    border-bottom-left-radius: 2px;
  }
  .mini-bubble.user {
    background: var(--ink);
    color: var(--cream);
    align-self: flex-end;
    border-bottom-right-radius: 2px;
  }
  .mini-deal {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    background: white;
    border: 1px solid rgba(201,169,110,0.3);
    border-radius: 8px;
    margin-top: 2px;
  }
  .mini-deal-airline {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--teal);
    background: rgba(26,92,92,0.08);
    padding: 2px 7px;
    border-radius: 4px;
  }
  .mini-deal-price {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    color: var(--ink);
    flex: 1;
  }
  .mini-deal-cta {
    font-size: 0.68rem;
    color: var(--gold-deep);
    border-bottom: 1px solid var(--gold);
  }

  /* ─── METRICS STRIP ───────────────────────────────────── */
  .metric-cards {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    margin-top: 0;
  }
  .metric-card {
    padding: 16px 18px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--ink-10);
    background: white;
  }
  .metric-card.teal { border-color: rgba(26,92,92,0.15); background: rgba(26,92,92,0.04); }
  .metric-card.gold { border-color: rgba(201,169,110,0.25); background: rgba(201,169,110,0.06); }
  .metric-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .metric-desc { font-size: 0.75rem; color: var(--ink-60); line-height: 1.4; }

  /* ─── PROOF STRIP ─────────────────────────────────────── */
  .proof-strip {
    background: var(--ink);
    padding: 28px clamp(1.5rem, 5vw, 4rem);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }
  .proof-item {
    padding: 28px 32px;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .proof-item:last-child { border-right: none; }
  .proof-item p {
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }
  .proof-item strong {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 400;
    color: white;
    line-height: 1.3;
  }

  /* ─── SECTION SHARED ──────────────────────────────────── */
  .section {
    padding: clamp(4rem, 8vw, 8rem) clamp(1.5rem, 5vw, 4rem);
  }

  .section-kicker {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--gold-deep);
    margin-bottom: 1rem;
    display: flex; align-items: center; gap: 10px;
  }
  .section-kicker::before {
    content: '';
    display: inline-block;
    width: 24px; height: 1px;
    background: var(--gold);
  }

  /* ─── HOW IT WORKS ────────────────────────────────────── */
  .steps-section { background: white; }
  .steps-header {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4rem;
    align-items: end; margin-bottom: 4rem;
  }
  .steps-h2 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 300;
    line-height: 1.15;
  }
  .steps-h2 em { font-style: italic; color: var(--teal); }
  .steps-lead {
    font-size: 0.95rem;
    color: var(--ink-60);
    line-height: 1.75;
    max-width: 400px;
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border: 1px solid var(--ink-10);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .step-card {
    padding: 36px 28px;
    border-right: 1px solid var(--ink-10);
    position: relative;
    transition: background 0.3s;
  }
  .step-card:last-child { border-right: none; }
  .step-card:hover { background: var(--sky); }
  .step-index {
    font-family: var(--font-display);
    font-size: 3rem;
    font-weight: 300;
    color: var(--ink-10);
    line-height: 1;
    margin-bottom: 20px;
    transition: color 0.3s;
  }
  .step-card:hover .step-index { color: rgba(26,92,92,0.15); }
  .step-h4 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    margin-bottom: 10px;
    line-height: 1.3;
  }
  .step-p {
    font-size: 0.83rem;
    color: var(--ink-60);
    line-height: 1.65;
  }

  /* ─── SERVICES ────────────────────────────────────────── */
  .services-section { background: var(--cream); }
  .services-header { margin-bottom: 3rem; }
  .services-h2 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 3.5vw, 2.8rem);
    font-weight: 300;
    line-height: 1.2;
    max-width: 540px;
    margin-top: 0.5rem;
  }

  .services-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .service-card {
    padding: 36px 32px;
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;
    min-height: 240px;
    display: flex; flex-direction: column; justify-content: flex-end;
    transition: transform 0.3s var(--ease-out), box-shadow 0.3s;
  }
  .service-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  }
  .service-card.teal-card { background: var(--teal); }
  .service-card.sand-card { background: #f5ede0; }
  .service-card.ink-card { background: var(--ink); }
  .service-card-icon {
    position: absolute; top: 28px; right: 28px;
    font-size: 1.8rem; opacity: 0.4;
  }
  .service-card h3 {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 400;
    line-height: 1.2;
    margin-bottom: 10px;
  }
  .service-card.teal-card h3,
  .service-card.ink-card h3 { color: white; }
  .service-card.sand-card h3 { color: var(--ink); }
  .service-card p {
    font-size: 0.83rem;
    line-height: 1.6;
  }
  .service-card.teal-card p { color: rgba(255,255,255,0.7); }
  .service-card.ink-card p { color: rgba(255,255,255,0.6); }
  .service-card.sand-card p { color: var(--ink-60); }

  /* ─── PRICING ─────────────────────────────────────────── */
  .pricing-section { background: white; }
  .pricing-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 2rem;
    align-items: end;
    margin-bottom: 3rem;
  }
  .pricing-h2 {
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 3rem);
    font-weight: 300;
    line-height: 1.15;
    max-width: 560px;
  }
  .pricing-h2 em { font-style: italic; color: var(--teal); }
  .pricing-lead,
  .pricing-side-note {
    font-size: 0.9rem;
    line-height: 1.75;
    color: var(--ink-60);
  }
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }
  .pricing-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 32px 28px;
    border-radius: 18px;
    border: 1px solid var(--ink-10);
    background: #fff;
    box-shadow: 0 10px 30px rgba(10,10,15,0.05);
    transition: transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out);
  }
  .pricing-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 22px 44px rgba(10,10,15,0.09);
  }
  .pricing-card.featured {
    background: linear-gradient(180deg, #11161b, #0a0a0f);
    color: white;
    border-color: rgba(10,10,15,0.9);
  }
  .pricing-tag {
    display: inline-flex;
    width: fit-content;
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(10,10,15,0.06);
    color: rgba(10,10,15,0.55);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .pricing-card.featured .pricing-tag {
    background: rgba(201,169,110,0.18);
    color: var(--gold-light);
  }
  .pricing-name {
    font-family: var(--font-display);
    font-size: 1.55rem;
    font-weight: 400;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .pricing-price {
    font-family: var(--font-display);
    font-size: 2.7rem;
    font-weight: 300;
    line-height: 1;
    margin-bottom: 12px;
  }
  .pricing-price small {
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: inherit;
    opacity: 0.55;
  }
  .pricing-copy {
    min-height: 72px;
    font-size: 0.84rem;
    line-height: 1.65;
    color: rgba(10,10,15,0.6);
    margin-bottom: 18px;
  }
  .pricing-card.featured .pricing-copy,
  .pricing-card.featured .pricing-list li {
    color: rgba(255,255,255,0.68);
  }
  .pricing-list {
    list-style: none;
    margin: 0 0 24px;
    padding: 20px 0 0;
    border-top: 1px solid rgba(10,10,15,0.08);
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }
  .pricing-card.featured .pricing-list {
    border-top-color: rgba(255,255,255,0.12);
  }
  .pricing-list li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 0.82rem;
    line-height: 1.55;
    color: rgba(10,10,15,0.62);
  }
  .pricing-list li::before {
    content: '✓';
    color: var(--teal);
    margin-top: 1px;
    font-size: 0.72rem;
  }
  .pricing-card.featured .pricing-list li::before { color: var(--gold); }
  .pricing-footer-note {
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--ink-60);
    font-size: 0.82rem;
  }
  .pricing-footer-note strong { color: var(--ink); font-weight: 600; }

  /* ─── DOCS ────────────────────────────────────────────── */
  .docs-section {
    background:
      radial-gradient(circle at top right, rgba(26,92,92,0.08), transparent 34%),
      linear-gradient(180deg, #f7f4ee 0%, #faf8f4 100%);
  }
  .docs-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    gap: 24px;
    align-items: start;
  }
  .docs-copy {
    max-width: 560px;
  }
  .docs-h2 {
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    font-weight: 300;
    line-height: 1.15;
    margin-bottom: 1rem;
  }
  .docs-copy p {
    font-size: 0.92rem;
    line-height: 1.75;
    color: var(--ink-60);
    margin-bottom: 1.5rem;
  }
  .docs-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 1.75rem;
  }
  .docs-card {
    padding: 18px 18px 20px;
    border-radius: 16px;
    background: rgba(255,255,255,0.82);
    border: 1px solid rgba(10,10,15,0.08);
    box-shadow: 0 12px 30px rgba(10,10,15,0.04);
  }
  .docs-card span {
    display: inline-flex;
    margin-bottom: 10px;
    color: var(--gold-deep);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .docs-card h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    line-height: 1.2;
    margin-bottom: 8px;
  }
  .docs-card p {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--ink-60);
  }
  .docs-panel {
    padding: 24px;
    border-radius: 20px;
    background: #0f1418;
    color: white;
    box-shadow: 0 24px 50px rgba(10,10,15,0.14);
  }
  .docs-panel-label {
    display: inline-flex;
    margin-bottom: 12px;
    color: rgba(201,169,110,0.82);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .docs-panel h3 {
    font-family: var(--font-display);
    font-size: 1.7rem;
    font-weight: 400;
    line-height: 1.15;
    margin-bottom: 16px;
  }
  .docs-panel ul {
    list-style: none;
    margin: 0 0 20px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .docs-panel li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: rgba(255,255,255,0.72);
    font-size: 0.84rem;
    line-height: 1.6;
  }
  .docs-panel li::before {
    content: '•';
    color: var(--gold);
  }
  .docs-panel-snippet {
    padding: 14px 16px;
    border-radius: 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 0.77rem;
    line-height: 1.6;
    color: rgba(255,255,255,0.78);
    overflow-x: auto;
    margin-bottom: 18px;
  }

  /* ─── BOTTOM CTA ──────────────────────────────────────── */
  .cta-section {
    background: var(--ink);
    padding: clamp(5rem, 10vw, 10rem) clamp(1.5rem, 5vw, 4rem);
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .cta-section::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 30% 50%, rgba(26,92,92,0.2) 0%, transparent 55%),
      radial-gradient(ellipse at 70% 50%, rgba(201,169,110,0.12) 0%, transparent 55%);
    pointer-events: none;
  }
  .cta-inner { position: relative; max-width: 640px; margin: 0 auto; }
  .cta-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 1.5rem;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .cta-eyebrow::before, .cta-eyebrow::after {
    content: '';
    display: inline-block;
    width: 24px; height: 1px;
    background: rgba(201,169,110,0.4);
  }
  .cta-h2 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 300;
    line-height: 1.15;
    color: white;
    margin-bottom: 2.5rem;
  }
  .cta-h2 em { font-style: italic; color: var(--gold-light); }
  .cta-actions {
    display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap;
  }
  .cta-link {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.5);
    text-decoration: none;
    border-bottom: 1px solid rgba(255,255,255,0.2);
    padding-bottom: 2px;
    transition: color 0.2s, border-color 0.2s;
  }
  .cta-link:hover { color: white; border-color: rgba(255,255,255,0.5); }

  /* ─── MOBILE NAV DRAWER ───────────────────────────────── */
  .mobile-nav-drawer {
    position: fixed; inset: 0; z-index: 200;
    background: var(--cream);
    display: flex; flex-direction: column;
    padding: 24px;
    transform: translateX(100%);
    transition: transform 0.35s var(--ease-out);
  }
  .mobile-nav-drawer.open { transform: translateX(0); }
  .mobile-nav-close {
    align-self: flex-end;
    background: none; border: none; cursor: pointer;
    font-size: 1.5rem; color: var(--ink);
    padding: 4px;
  }
  .mobile-nav-links {
    display: flex; flex-direction: column; gap: 2rem;
    list-style: none;
    margin-top: 3rem; flex: 1;
  }
  .mobile-nav-links a {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 300;
    color: var(--ink);
    text-decoration: none;
  }
  .mobile-nav-footer {
    display: flex; flex-direction: column; gap: 10px;
  }
  .mobile-nav-footer .btn-ghost,
  .mobile-nav-footer .btn-primary {
    justify-content: center;
    padding: 14px;
    font-size: 0.9rem;
  }

  /* ─── ANIMATIONS ──────────────────────────────────────── */
  .fade-up {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out);
  }
  .fade-up.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .fade-up[data-delay="1"] { transition-delay: 0.1s; }
  .fade-up[data-delay="2"] { transition-delay: 0.2s; }
  .fade-up[data-delay="3"] { transition-delay: 0.3s; }
  .fade-up[data-delay="4"] { transition-delay: 0.4s; }

  /* ─── RESPONSIVE ──────────────────────────────────────── */
  @media (max-width: 1024px) {
    .hero {
      grid-template-columns: 1fr;
      padding-top: 120px;
    }
    .console-wrap { max-width: 560px; margin: 0 auto; }
    .metric-cards { grid-template-columns: repeat(3, 1fr); }
    .steps-header { grid-template-columns: 1fr; gap: 1.5rem; }
    .steps-grid { grid-template-columns: repeat(2, 1fr); }
    .step-card:nth-child(2) { border-right: none; }
    .step-card:nth-child(1),
    .step-card:nth-child(2) { border-bottom: 1px solid var(--ink-10); }
  }

  @media (max-width: 768px) {
    .nav-links, .nav-actions .btn-ghost { display: none; }
    .nav-hamburger { display: flex; }
    .nav-actions .btn-primary { display: none; }

    .hero-h1 { font-size: clamp(2.2rem, 8vw, 3rem); }

    .proof-strip { grid-template-columns: 1fr; }
    .proof-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .proof-item:last-child { border-bottom: none; }

    .console-panels { grid-template-columns: 1fr; }
    .console-panel + .console-panel { border-left: none; border-top: 1px solid var(--ink-10); }

    .steps-grid { grid-template-columns: 1fr; }
    .step-card { border-right: none !important; border-bottom: 1px solid var(--ink-10); }
    .step-card:last-child { border-bottom: none; }

    .services-grid { grid-template-columns: 1fr; }
    .metric-cards { grid-template-columns: 1fr; }
    .pricing-header,
    .docs-shell { grid-template-columns: 1fr; }
    .pricing-grid,
    .docs-grid { grid-template-columns: 1fr; }

    .hero-actions { flex-direction: column; align-items: flex-start; }
  }

  @media (max-width: 480px) {
    .hero { padding: 110px 1.25rem 60px; }
    .section { padding: 3rem 1.25rem; }
    .proof-strip { padding: 0 1.25rem; }
    .proof-item { padding: 24px 0; }
    .cta-section { padding: 4rem 1.25rem; }
  }
`;

// ── Utility: useFadeUp ────────────────────────────────────────
function useFadeUp() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeUp({
  children,
  delay = "0",
  className = ""
}: PropsWithChildren<{ delay?: string; className?: string }>) {
  const ref = useFadeUp();
  return (
    <div ref={ref} className={`fade-up ${className}`} data-delay={delay}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { token } = usePlatformAuth();
  const dashboardPath = "/platform/app/overview";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <style>{styles}</style>

      {/* ─── NAV ─── */}
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <Link className="nav-brand" to="/">
          <div className="nav-brand-icon">✦</div>
          <div>
            <div className="nav-brand-name">AeroConcierge</div>
            <div className="nav-brand-sub">Platform</div>
          </div>
        </Link>

        <nav>
          <ul className="nav-links">
            <li><a href="#platform-features">Features</a></li>
            <li><a href="#platform-flow">How It Works</a></li>
            <li><a href="#platform-services">Services</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#docs">Docs</a></li>
          </ul>
        </nav>

        <div className="nav-actions">
          <Link className="btn-ghost" to="/platform/login">Login</Link>
          <Link className="btn-primary" to="/platform/signup">Create Workspace</Link>
          <button className="nav-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* ─── MOBILE DRAWER ─── */}
      <nav className={`mobile-nav-drawer${mobileOpen ? " open" : ""}`} aria-hidden={!mobileOpen}>
        <button className="mobile-nav-close" onClick={() => setMobileOpen(false)}>✕</button>
        <ul className="mobile-nav-links">
          <li><a href="#platform-features" onClick={() => setMobileOpen(false)}>Features</a></li>
          <li><a href="#platform-flow" onClick={() => setMobileOpen(false)}>How It Works</a></li>
          <li><a href="#platform-services" onClick={() => setMobileOpen(false)}>Services</a></li>
          <li><a href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a></li>
          <li><a href="#docs" onClick={() => setMobileOpen(false)}>Docs</a></li>
        </ul>
        <div className="mobile-nav-footer">
          <Link className="btn-ghost" to="/platform/login" onClick={() => setMobileOpen(false)}>Login</Link>
          <Link className="btn-primary" to="/platform/signup" onClick={() => setMobileOpen(false)}>Create Workspace →</Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero" id="platform-features">
        <div className="hero-bg-shape" />

        <div className="hero-copy">
          <p className="hero-eyebrow">Premium concierge platform for travel brands</p>

          <h1 className="hero-h1">
            Launch a branded AI booking desk that feels like your <em>best sales specialist.</em>
          </h1>

          <p className="hero-desc">
            Turn your website into a verified, tenant-safe concierge for flights, hotels, cars, cruises, and support.
            Onboard the brand, verify the domain, then deploy a widget that answers only from your business.
          </p>

          <div className="hero-actions">
            <Link className="btn-gold" to={token ? dashboardPath : "/platform/signup"}>
              {token ? "Open Dashboard" : "Start Building"} →
            </Link>
            <Link className="hero-link" to="/platform/login">Login to workspace</Link>
            <Link className="hero-link" to="/demo">Preview live widget</Link>
          </div>

          <div className="hero-chips">
            {["Flights", "Hotels", "Cars", "Cruises", "Multi-tenant RAG"].map(c => (
              <span className="hero-chip" key={c}>{c}</span>
            ))}
          </div>

          <div className="metric-cards" style={{ marginTop: "2rem" }}>
            <div className="metric-card">
              <div className="metric-title">Domain-verified</div>
              <div className="metric-desc">Each bot is locked to its own tenant knowledge base.</div>
            </div>
            <div className="metric-card teal">
              <div className="metric-title">Operator-ready</div>
              <div className="metric-desc">Widget code, DNS records & CTA routing in one flow.</div>
            </div>
            <div className="metric-card gold">
              <div className="metric-title">Live deal engine</div>
              <div className="metric-desc">Flight results from your configured live search API.</div>
            </div>
          </div>
        </div>

        {/* Console preview */}
        <div className="console-wrap">
          <div className="console-card">
            <div className="console-head">
              <div>
                <div className="console-workspace-label">Workspace</div>
                <div className="console-workspace-name">Sapphire Travels</div>
              </div>
              <span className="console-status">Ready for launch</span>
            </div>

            <div className="console-panels">
              <div className="console-panel">
                <div className="console-panel-label">Onboarding</div>
                <div className="console-panel-title">Domain, data & widget</div>
                <ul className="console-checklist">
                  <li>TXT verification record generated</li>
                  <li>Sitemap + policy docs connected</li>
                  <li>Specialist CTA synced to brand profile</li>
                </ul>
              </div>

              <div className="console-panel">
                <div className="console-panel-label">Live preview</div>
                <div className="console-panel-title">Assistant + deal cards</div>
                <div className="mini-chat">
                  <div className="mini-bubble assistant">Welcome to Sapphire Travels. How can I help?</div>
                  <div className="mini-bubble user">Business class JFK → LHR</div>
                  <div className="mini-deal">
                    <span className="mini-deal-airline">SWISS</span>
                    <span className="mini-deal-price">$469.25</span>
                    <span className="mini-deal-cta">Book now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROOF STRIP ─── */}
      <div className="proof-strip">
        {[
          { label: "Multi-site control", text: "One platform, isolated tenant knowledge bases" },
          { label: "Brand-safe setup", text: "Support phone, service mix & domain rules per workspace" },
          { label: "Responsive deployment", text: "Works across desktop, tablet, mobile, and embed mode" },
        ].map(({ label, text }) => (
          <div className="proof-item" key={label}>
            <p>{label}</p>
            <strong>{text}</strong>
          </div>
        ))}
      </div>

      {/* ─── HOW IT WORKS ─── */}
      <section className="section steps-section" id="platform-flow">
        <FadeUp>
          <div className="steps-header">
            <div>
              <p className="section-kicker">The setup flow</p>
              <h2 className="steps-h2">From brand URL to <em>launch-ready</em> concierge in four steps.</h2>
            </div>
            <p className="steps-lead">
              Every workspace gets its own isolated knowledge base, DNS-verified domain, and white-label widget—deployed in minutes, not months.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay="1">
          <div className="steps-grid">
            {[
              { n: "01", title: "Create the workspace", body: "Signup generates the tenant, the dashboard shell, and the widget-ready account structure." },
              { n: "02", title: "Verify the domain", body: "DNS TXT verification protects tenant routing and locks answers to the correct website." },
              { n: "03", title: "Feed business knowledge", body: "Ingest sitemap pages, docs, and policy text so responses stay grounded in your site content." },
              { n: "04", title: "Deploy the widget", body: "Use the generated snippet, preview the conversation flow, then launch on production." },
            ].map(({ n, title, body }) => (
              <div className="step-card" key={n}>
                <div className="step-index">{n}</div>
                <h4 className="step-h4">{title}</h4>
                <p className="step-p">{body}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ─── SERVICES ─── */}
      <section className="section services-section" id="platform-services">
        <FadeUp>
          <div className="services-header">
            <p className="section-kicker">Built for travel operators</p>
            <h2 className="services-h2">Handle sales, support, and service discovery without losing brand control.</h2>
          </div>
        </FadeUp>

        <div className="services-grid">
          {[
            { cls: "teal-card", icon: "✈", title: "Flight concierge", body: "Guided slot filling, place suggestions, live fares, deal cards, and specialist handoff built in." },
            { cls: "sand-card", icon: "🏨", title: "Hotel, car & cruise capture", body: "Structured lead capture flows route high-intent visitors to the right booking specialist." },
            { cls: "ink-card", icon: "⚡", title: "Tenant-specific knowledge", body: "Each workspace retrieves only its own RAG context, policies, sources, and CTA details." },
          ].map(({ cls, icon, title, body }, i) => (
            <FadeUp key={title} delay={String(i + 1)}>
              <div className={`service-card ${cls}`}>
                <div className="service-card-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="section pricing-section" id="pricing">
        <FadeUp>
          <div className="pricing-header">
            <div>
              <p className="section-kicker">Pricing</p>
              <h2 className="pricing-h2">Start with a <em>14-day full trial</em>, then choose the plan that matches your workspace volume.</h2>
            </div>
            <p className="pricing-side-note">
              Trial includes the complete platform experience. Upgrade only when you need a longer
              billing cycle or want your production usage aligned to a paid plan.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay="1">
          <div className="pricing-grid">
            {[
              {
                tag: "Starter",
                name: "Starter",
                price: "$99",
                suffix: "/ month",
                copy: "For a single travel brand that wants a polished concierge with clear monthly limits.",
                features: [
                  "1 workspace",
                  "10,000 messages / month",
                  "Domain verification + widget deployment",
                  "Email support"
                ],
                cta: "Start 14-day trial",
                to: token ? "/platform/app/pricing" : "/platform/signup"
              },
              {
                tag: "Most Popular",
                name: "Growth",
                price: "$299",
                suffix: "/ month",
                copy: "For multi-brand operators that need more workspaces, more messages, and priority handling.",
                featured: true,
                features: [
                  "5 workspaces",
                  "100,000 messages / month",
                  "Flights, hotels, cars, and cruises",
                  "Priority support"
                ],
                cta: token ? "Manage plans" : "Start 14-day trial",
                to: token ? "/platform/app/pricing" : "/platform/signup"
              },
              {
                tag: "Enterprise",
                name: "Enterprise",
                price: "Custom",
                copy: "For larger programs that need security review, onboarding help, or white-label delivery.",
                features: [
                  "Unlimited workspaces",
                  "SSO and SLA options",
                  "Dedicated onboarding",
                  "Custom commercial terms"
                ],
                cta: "Contact sales",
                href: "mailto:sales@aeroconcierge.com?subject=Enterprise%20Plan%20Inquiry"
              }
            ].map((plan) => (
              <div key={plan.name} className={`pricing-card${plan.featured ? " featured" : ""}`}>
                <span className="pricing-tag">{plan.tag}</span>
                <h3 className="pricing-name">{plan.name}</h3>
                <div className="pricing-price">
                  {plan.price}
                  {plan.suffix ? <small> {plan.suffix}</small> : null}
                </div>
                <p className="pricing-copy">{plan.copy}</p>
                <ul className="pricing-list">
                  {plan.features.map((feature) => (
                    <li key={`${plan.name}-${feature}`}>{feature}</li>
                  ))}
                </ul>
                {"href" in plan ? (
                  <a className={plan.featured ? "btn-gold" : "btn-primary"} href={plan.href}>
                    {plan.cta}
                  </a>
                ) : (
                  <Link className={plan.featured ? "btn-gold" : "btn-primary"} to={plan.to}>
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </FadeUp>

        <div className="pricing-footer-note">
          <strong>Trial includes full access:</strong> 5 workspaces and 100,000 monthly messages for 14 days.
        </div>
      </section>

      <section className="section docs-section" id="docs">
        <div className="docs-shell">
          <FadeUp>
            <div className="docs-copy">
              <p className="section-kicker">Documentation</p>
              <h2 className="docs-h2">The operator manual covers onboarding, embedding, API usage, customization, and pricing in one place.</h2>
              <p>
                Keep setup friction low for internal teams: the docs walk through workspace creation,
                DNS verification, source indexing, widget deployment, and plan management with the
                same flow used inside the dashboard.
              </p>

              <div className="docs-grid">
                {[
                  ["Getting Started", "Signup, workspace creation, and the initial launch checklist."],
                  ["Widget Embed", "Script snippet, React example, and embed URL guidance."],
                  ["API Reference", "Core platform endpoints for profile, workspaces, sources, and subscription."],
                  ["Knowledge Base", "How to add sources and re-index when website content changes."]
                ].map(([title, body]) => (
                  <div key={title} className="docs-card">
                    <span>Guide</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay="1">
            <aside className="docs-panel">
              <span className="docs-panel-label">Read full docs</span>
              <h3>Go from account signup to production widget without guesswork.</h3>
              <ul>
                <li>Signup, create workspace, and verify the site domain.</li>
                <li>Connect sitemap URLs, docs, FAQs, and re-index the knowledge base.</li>
                <li>Deploy the widget snippet or React component using the generated configuration.</li>
              </ul>
              <div className="docs-panel-snippet">
                GET /api/platform/subscription
                <br />
                POST /api/platform/workspaces
                <br />
                PUT /api/platform/sources
              </div>
              <Link className="btn-gold" to="/platform/app/docs">
                Read full docs
              </Link>
            </aside>
          </FadeUp>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section">
        <div className="cta-inner">
          <p className="cta-eyebrow">Go from site URL to launch-ready concierge</p>
          <h2 className="cta-h2">Build a platform experience that feels <em>premium</em> before the first message is sent.</h2>
          <div className="cta-actions">
            <Link className="btn-gold" to={token ? dashboardPath : "/platform/signup"}>
              {token ? "Continue setup" : "Create Workspace"} →
            </Link>
            <Link className="cta-link" to="/demo">View widget demo</Link>
          </div>
        </div>
      </section>
    </>
  );
}
