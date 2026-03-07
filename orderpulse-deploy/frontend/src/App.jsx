import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as api from './api.js'

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --g:#0A6640;--g2:#0D8A52;--wa:#25D366;--cr:#F7F8F6;--dk:#0C1710;
  --tx:#1A2E22;--mt:#7A8E82;--bd:#E2EBE4;--f:'Plus Jakarta Sans',sans-serif;
  --sb-w:220px;--sb-bg:#0C1710;
}
body{font-family:var(--f);background:var(--cr);color:var(--tx);overflow:hidden;}
body.scrollable{overflow:auto;height:auto;}
body.dark{
  --cr:#0F1812;--dk:#E8F0EA;--tx:#C8D8CC;--mt:#6B8070;--bd:#1E2E22;
  --sb-bg:#090F0B;
}
body.dark .auth-card{background:#132018;border:1px solid #1E2E22;}
body.dark .auth-title{color:#E8F0EA;}
body.dark .inp{background:#1A2820;border-color:#2A3A2E;color:#E8F0EA;}
body.dark .inp:focus{background:#1E3025;border-color:var(--g);}
body.dark .btn{background:var(--g);}
body.dark .inbox-p{background:#132018;border-color:#1E2E22;}
body.dark .ph{border-color:#1E2E22;}
body.dark .thread{border-color:#1A2820;}
body.dark .thread:hover{background:#1A2820;}
body.dark .thread.on{background:#1E3025;border-left-color:var(--g);}
body.dark .chat-p{background:#0F1812;}
body.dark .chat-h{background:#132018;border-color:#1E2E22;}
body.dark .msgs{background:#0F1812;}
body.dark .msg.in .mb{background:#1A2820;color:#C8D8CC;box-shadow:none;}
body.dark .msg.out .mb{background:#1A3828;color:#C8D8CC;}
body.dark .cinput-bar{background:#132018;border-color:#1E2E22;}
body.dark .cinput{background:#1A2820;border-color:#2A3A2E;color:#C8D8CC;}
body.dark .cinput:focus{background:#1E3025;border-color:var(--g);}
body.dark .abtn{background:#1A2820;border-color:#2A3A2E;color:#C8D8CC;}
body.dark .abtn:hover{background:#1E3025;border-color:var(--g);color:#10B981;}
body.dark .abtn.pr{background:var(--g);color:white;}
body.dark .ord-view{background:#0F1812;}
body.dark .ord-hdr{background:#0F1812;border-color:#1E2E22;}
body.dark .stat{background:#132018;border-color:#1E2E22;}
body.dark .ocard{background:#132018;border-color:#1E2E22;}
body.dark .ocard:hover{border-color:#2A4030;}
body.dark .modal{background:#132018;border:1px solid #1E2E22;}
body.dark .mt{color:#E8F0EA;}
body.dark .ms2{color:#6B8070;}
body.dark .inp{background:#1A2820;}
body.dark .ov{background:rgba(0,0,0,.7);}
body.dark .toast{background:#132018;border-color:#1E2E22;}
body.dark .tsn{color:#E8F0EA;}
body.dark .tmsg{color:#C8D8CC;}
body.dark .loading{color:#6B8070;}
.app{height:100vh;display:flex;flex-direction:column;}
.app.scrollable{height:auto;min-height:100vh;overflow:visible;}

/* ── AUTH ── */
.auth-screen{flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0A6640 0%,#051409 100%);position:relative;overflow:hidden;}
.auth-bg{position:absolute;inset:0;opacity:.04;background-image:radial-gradient(circle at 2px 2px,white 1px,transparent 0);background-size:28px 28px;}
.auth-card{background:white;border-radius:20px;padding:44px 40px;width:min(420px,calc(100vw - 32px));position:relative;z-index:1;box-shadow:0 40px 100px rgba(0,0,0,0.4);animation:slideUp .4s ease;}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:32px;}
.logo-icon{width:38px;height:38px;background:var(--g);border-radius:9px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:18px;}
.logo-text{font-size:19px;font-weight:900;color:var(--g);letter-spacing:-0.5px;}
.auth-title{font-size:24px;font-weight:800;color:var(--dk);margin-bottom:6px;letter-spacing:-0.3px;}
.auth-sub{color:var(--mt);font-size:14px;margin-bottom:28px;line-height:1.55;}
.fg{margin-bottom:16px;}
.lbl{display:block;font-size:12px;font-weight:700;color:var(--tx);margin-bottom:6px;letter-spacing:0.2px;text-transform:uppercase;}
.inp{width:100%;padding:11px 14px;border:1.5px solid var(--bd);border-radius:9px;font-family:var(--f);font-size:14px;color:var(--dk);background:#FAFBFA;transition:all .15s;outline:none;}
.inp:focus{border-color:var(--g);background:white;box-shadow:0 0 0 3px rgba(10,102,64,.08);}
.btn{width:100%;padding:12px;background:var(--g);color:white;border:none;border-radius:9px;font-family:var(--f);font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:8px;letter-spacing:-0.2px;}
.btn:hover{background:#0D5533;transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,102,64,.32);}
.btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.err{background:#FFF5F5;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:13px;color:#DC2626;margin-bottom:12px;}
.switch{text-align:center;margin-top:20px;font-size:14px;color:var(--mt);}
.switch a{color:var(--g);font-weight:700;cursor:pointer;}

/* ── LAYOUT ── */
.layout{flex:1;display:flex;overflow:hidden;}
.sidebar{width:var(--sb-w);background:var(--sb-bg);display:flex;flex-direction:column;padding:0;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.04);}
.sb-header{padding:20px 16px 8px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:8px;}
.sb-logo{width:34px;height:34px;background:linear-gradient(135deg,#0A6640,#10B981);border-radius:9px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:17px;flex-shrink:0;cursor:pointer;transition:opacity .15s;}
.sb-logo:hover{opacity:.85;}
.sb-brand{font-size:15px;font-weight:800;color:white;letter-spacing:-0.3px;}
.sb-brand span{color:#10B981;}
.sb-nav{display:flex;flex-direction:column;gap:2px;padding:0 8px;flex:1;}
.sb-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:none;background:transparent;color:rgba(255,255,255,.5);fontFamily:var(--f);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;text-align:left;width:100%;position:relative;}
.sb-item:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);}
.sb-item.on{background:rgba(16,185,129,.12);color:#10B981;}
.sb-item.on .sb-icon{opacity:1;}
.sb-icon{font-size:17px;opacity:.6;width:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sb-label{font-size:13.5px;}
.sb-badge{margin-left:auto;min-width:18px;height:18px;padding:0 5px;background:#25D366;border-radius:9px;font-size:10px;font-weight:800;color:white;display:flex;align-items:center;justify-content:center;}
.sb-footer{padding:12px 8px;border-top:1px solid rgba(255,255,255,.05);}
.sb-user{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .15s;}
.sb-user:hover{background:rgba(255,255,255,.06);}
.sb-uname{font-size:13px;font-weight:700;color:rgba(255,255,255,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sb-uemail{font-size:11px;color:rgba(255,255,255,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* ── INBOX ── */
.inbox-wrap{flex:1;display:flex;overflow:hidden;}
.inbox-p{width:300px;border-right:1px solid var(--bd);display:flex;flex-direction:column;background:white;flex-shrink:0;}
.ph{padding:16px 16px 10px;border-bottom:1px solid var(--bd);}
.ph-t{font-size:15px;font-weight:800;color:var(--dk);letter-spacing:-0.2px;}
.ph-s{font-size:11.5px;color:var(--mt);margin-top:2px;}
.threads{overflow-y:auto;flex:1;}
.thread{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;cursor:pointer;transition:background .12s;border-bottom:1px solid var(--bd);}
.thread:hover{background:#F2F9F4;}
.thread.on{background:#E6F5EC;border-left:3px solid var(--g);}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.ti{flex:1;min-width:0;}
.tn{font-size:13.5px;font-weight:700;color:var(--dk);}
.tp{font-size:12px;color:var(--mt);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;}
.tt{font-size:10.5px;color:#9CAA9F;}
.ubadge{min-width:17px;height:17px;padding:0 4px;background:var(--wa);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:white;flex-shrink:0;}
.itag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10.5px;font-weight:700;margin-top:3px;}
.io{background:#EFF6FF;color:#3B82F6;}.ip{background:#ECFDF5;color:#059669;}.ir{background:#FFF7ED;color:#D97706;}

/* ── CHAT ── */
.chat-p{flex:1;display:flex;flex-direction:column;background:#F5F7F5;}
.chat-h{padding:12px 20px;border-bottom:1px solid var(--bd);background:white;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
.chat-online{font-size:11.5px;color:#059669;font-weight:600;}
.chat-acts{display:flex;gap:6px;margin-left:auto;}
.abtn{padding:6px 13px;border-radius:7px;border:1.5px solid var(--bd);background:white;font-family:var(--f);font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s;color:var(--tx);}
.abtn:hover{border-color:var(--g);color:var(--g);background:#E8F5E9;}
.abtn.pr{background:var(--g);color:white;border-color:var(--g);}
.abtn.pr:hover{background:#0D5533;box-shadow:0 2px 8px rgba(10,102,64,.25);}
.abtn:disabled{opacity:.5;cursor:not-allowed;}
.msgs{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px;}
.msg{max-width:68%;}
.msg.in{align-self:flex-start;}.msg.out{align-self:flex-end;}
.mb{padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.55;}
.msg.in .mb{background:white;border-bottom-left-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.msg.out .mb{background:#DCF8C6;border-bottom-right-radius:4px;}
.mt2{font-size:10.5px;color:#9CAA9F;margin-top:3px;padding:0 4px;}
.msg.out .mt2{text-align:right;}
.ms{font-size:11.5px;font-weight:700;color:var(--g);margin-bottom:3px;}
.cinput-bar{padding:12px 14px;background:white;border-top:1px solid var(--bd);display:flex;gap:8px;align-items:flex-end;}
.cinput{flex:1;padding:9px 14px;border:1.5px solid var(--bd);border-radius:22px;font-family:var(--f);font-size:13.5px;outline:none;resize:none;background:#FAFBFA;transition:border .15s;line-height:1.45;}
.cinput:focus{border-color:var(--g);background:white;}
.sbtn{width:38px;height:38px;background:var(--wa);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;color:white;font-size:16px;flex-shrink:0;}
.sbtn:hover{background:#1DA851;transform:scale(1.06);}

/* ── ORDERS ── */
.ord-view{flex:1;overflow-y:auto;background:var(--cr);}
.ord-hdr{padding:20px 24px 0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--cr);z-index:10;padding-bottom:14px;border-bottom:1px solid var(--bd);}
.ord-title{font-size:20px;font-weight:800;color:var(--dk);letter-spacing:-0.3px;}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 24px;}
.stat{background:white;border-radius:12px;padding:16px 18px;border:1px solid var(--bd);transition:all .2s;position:relative;overflow:hidden;}
.stat:hover{box-shadow:0 4px 20px rgba(10,102,64,.08);transform:translateY(-1px);}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.stat.blue::before{background:#3B82F6;}.stat.amber::before{background:#F59E0B;}.stat.green::before{background:#10B981;}.stat.dark::before{background:var(--g);}
.sl{font-size:11px;color:var(--mt);font-weight:700;text-transform:uppercase;letter-spacing:.6px;}
.sv{font-size:26px;font-weight:900;color:var(--dk);margin-top:5px;letter-spacing:-0.5px;}
.ss{font-size:11.5px;color:var(--mt);margin-top:2px;}
.ords{padding:0 24px 24px;display:flex;flex-direction:column;gap:8px;}
.ocard{background:white;border-radius:12px;border:1px solid var(--bd);overflow:hidden;transition:all .2s;}
.ocard:hover{box-shadow:0 4px 16px rgba(10,102,64,.08);border-color:#C8DDD0;}
.ocin{padding:14px 16px;display:flex;align-items:center;gap:12px;}
.oi{flex:1;min-width:0;}
.on2{font-size:11.5px;font-weight:700;color:var(--g);font-family:monospace;letter-spacing:.3px;}
.oc{font-size:14px;font-weight:700;color:var(--dk);margin:1px 0;letter-spacing:-0.1px;}
.oit{font-size:12px;color:var(--mt);line-height:1.4;}
.sbadge{padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:3px;}
.pbadge{padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;}
.ppen{background:#FFFBEB;color:#B45309;}.ppaid{background:#ECFDF5;color:#059669;}
.oa{font-size:17px;font-weight:900;color:var(--dk);letter-spacing:-0.3px;}
.oacts{display:flex;gap:6px;align-items:center;flex-shrink:0;}
.sbar{height:2px;background:#F0F4F1;}
.sfill{height:100%;transition:width .6s ease;}

/* ── MODALS ── */
.toast{position:fixed;bottom:20px;right:20px;z-index:1000;background:white;border-radius:14px;padding:14px 16px;width:320px;box-shadow:0 16px 50px rgba(0,0,0,.18);border:1px solid var(--bd);animation:siR .35s ease;}
.th2{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.ta{font-size:11.5px;font-weight:700;color:#25D366;}
.tm{font-size:10.5px;color:var(--mt);margin-left:auto;}
.tsn{font-size:13px;font-weight:700;color:var(--dk);margin-bottom:3px;}
.tmsg{font-size:12.5px;color:var(--tx);line-height:1.5;}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:500;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;}
.modal{background:white;border-radius:18px;padding:26px;width:460px;max-height:85vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.28);animation:slideUp .3s ease;}
.mt{font-size:18px;font-weight:800;color:var(--dk);margin-bottom:4px;letter-spacing:-0.2px;}
.ms2{font-size:13.5px;color:var(--mt);margin-bottom:18px;}
.loading{display:flex;align-items:center;justify-content:center;flex:1;font-size:13.5px;color:var(--mt);}
.spinner-lg{width:30px;height:30px;border:3px solid var(--bd);border-top-color:var(--g);border-radius:50%;animation:spin .8s linear infinite;margin-bottom:10px;}
.spinner-sm{width:13px;height:13px;border:2px solid rgba(255,255,255,.5);border-top-color:white;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;}

/* ── ONBOARDING ── */
.onb-screen{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;}
.onb-top{padding:16px 24px;background:white;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;}
.onb-body{flex:1;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;background:var(--cr);padding:32px 16px;min-height:0;}
.onb-card{background:white;border-radius:20px;padding:40px;width:100%;max-width:520px;box-shadow:0 4px 24px rgba(10,102,64,.08);border:1px solid var(--bd);animation:slideUp .4s ease;}
.steps-ind{display:flex;gap:8px;margin-bottom:28px;}
.step-dot{height:3px;border-radius:2px;transition:all .4s;background:var(--bd);flex:1;}
.step-dot.on{background:var(--g);}
.wa-btn{width:100%;padding:14px;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--wa);color:white;border:none;border-radius:12px;font-family:var(--f);font-size:15px;font-weight:700;cursor:pointer;transition:all .25s;margin-top:8px;}
.wa-btn:hover{background:#1DA851;transform:translateY(-1px);box-shadow:0 10px 28px rgba(37,211,102,.28);}
.wa-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.pip-steps{display:flex;flex-direction:column;gap:6px;margin-top:14px;}
.pip-step{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:9px;background:var(--cr);border:1px solid var(--bd);transition:all .3s;font-size:13px;}
.pip-step.running{background:#FFFBEB;border-color:#F59E0B;}
.pip-step.done{background:#ECFDF5;border-color:var(--g);}
.pip-step.failed{background:#FFF5F5;border-color:#EF4444;}

@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes siR{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes popIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.pulse{animation:pulse 1.5s ease infinite;}
.pop-in{animation:popIn .3s ease;}
/* ── MOBILE ── */
@media (max-width: 768px) {
  /* ── Bottom nav bar ── */
  .mob-nav{ display:flex; }
  .sidebar{ display:none; }

  /* Full viewport layout */
  :root{ --mob-nav:60px; }
  .layout{ flex-direction:column; padding-bottom:var(--mob-nav); }
  .app{ padding-bottom:0; }

  /* Orders view fills screen */
  .ord-view{ height:calc(100vh - var(--mob-nav)); overflow-y:auto; }

  /* Profile + Home fill screen */
  .profile-wrap{ height:calc(100vh - var(--mob-nav)) !important; overflow-y:auto !important; padding:0 !important; }
  .home-wrap{ height:calc(100vh - var(--mob-nav)) !important; overflow-y:auto !important; }

  /* ── Inbox mobile ── */
  .inbox-wrap{ display:flex; flex-direction:column; height:calc(100vh - var(--mob-nav)); overflow:hidden; }
  .inbox-p{ width:100%; border-right:none; flex:1; overflow:hidden; display:flex; flex-direction:column; }
  .inbox-p.chat-open{ display:none; }
  /* Chat panel: fixed height, internal scroll only in msgs */
  .chat-p{ flex:none !important; width:100%; height:calc(100vh - var(--mob-nav)); display:flex; flex-direction:column; overflow:hidden; }
  .chat-p.no-chat{ display:none; }
  .msgs{ flex:1 !important; overflow-y:auto !important; -webkit-overflow-scrolling:touch; padding:14px 14px 8px; gap:8px; }
  .cinput-bar{ flex-shrink:0; padding:10px 12px; padding-bottom:calc(10px + env(safe-area-inset-bottom,0px)); }
  .ph{ padding:14px 16px 10px; display:flex; align-items:center; gap:10px; }
  .ph-t{ font-size:17px; font-weight:800; }
  .thread{ padding:14px 16px; gap:12px; }
  .thread.on{ border-left-width:3px; }

  /* Chat header on mobile */
  .chat-h{ padding:10px 14px; gap:10px; min-height:56px; }
  .mob-back{ display:flex !important; align-items:center; justify-content:center; width:36px; height:36px; background:none; border:none; cursor:pointer; color:var(--g); font-size:22px; padding:0; flex-shrink:0; border-radius:50%; transition:background .15s; }
  .mob-back:active{ background:rgba(10,102,64,.1); }
  .msgs{ padding:14px 14px 8px; gap:8px; }
  .cinput-bar{ padding:10px 12px; padding-bottom:calc(10px + env(safe-area-inset-bottom,0px)); }
  .cinput{ font-size:15px; }
  .msg{ max-width:82%; }

  /* ── Orders mobile ── */
  .ord-hdr{ padding:14px 16px; flex-wrap:nowrap; }
  .ord-title{ font-size:17px; }
  .stats-row{ grid-template-columns:1fr 1fr; padding:12px 14px; gap:10px; }
  .sv{ font-size:22px; }
  .sl{ font-size:10px; }
  .ords{ padding:0 12px 20px; }
  .ocard .ocin{ flex-wrap:wrap; gap:8px; padding:12px 14px; }
  .oi{ width:100%; flex:none; }
  .oacts{ width:100%; justify-content:flex-start; flex-wrap:wrap; gap:6px; padding:0 14px 12px; border-top:1px solid var(--bd); }
  .abtn{ padding:7px 12px; font-size:12px; }

  /* Filters */
  .ord-filters{ padding:0 14px 8px !important; gap:6px !important; flex-wrap:nowrap !important; overflow-x:auto !important; -webkit-overflow-scrolling:touch; }
  .ord-filters::-webkit-scrollbar{ display:none; }

  /* Profile inner content padding on mobile */
  .profile-wrap > div:last-child{ padding:16px 16px 32px !important; }

  /* Modals — bottom sheet on mobile */
  .ov{ align-items:flex-end !important; }
  .modal{ width:100% !important; margin:0 !important; border-bottom-left-radius:0 !important; border-bottom-right-radius:0 !important; border-radius:20px 20px 0 0 !important; padding-bottom:calc(26px + env(safe-area-inset-bottom,0px)) !important; max-height:90vh !important; }

  .toast{ width:calc(100vw - 32px); right:16px; bottom:calc(var(--mob-nav) + 10px); }
}

/* ── BOTTOM NAV BAR (mobile only) ── */
.mob-nav{
  display:none;
  position:fixed;
  bottom:0; left:0; right:0;
  height:var(--mob-nav,60px);
  padding-bottom:env(safe-area-inset-bottom,0px);
  background:var(--sb-bg);
  border-top:1px solid rgba(255,255,255,.07);
  z-index:100;
  align-items:stretch;
  box-shadow:0 -8px 30px rgba(0,0,0,.25);
}
.mob-nav-item{
  flex:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:3px;
  background:none;
  border:none;
  cursor:pointer;
  color:rgba(255,255,255,.38);
  font-family:var(--f);
  font-size:10px;
  font-weight:600;
  position:relative;
  transition:color .15s;
  padding:0;
  -webkit-tap-highlight-color:transparent;
}
.mob-nav-item.on{ color:#10B981; }
.mob-nav-item:active{ color:rgba(255,255,255,.7); }
.mob-nav-icon{ font-size:20px; line-height:1; }
.mob-nav-badge{
  position:absolute;
  top:6px; right:calc(50% - 18px);
  min-width:17px; height:17px;
  padding:0 4px;
  background:#25D366;
  border-radius:9px;
  font-size:10px; font-weight:800;
  color:white;
  display:flex; align-items:center; justify-content:center;
}
/* Mobile chat back button hidden on desktop */
.mob-back{ display:none; }

@media (max-width: 480px) {
  .stats-row{ gap:8px; padding:10px 12px; }
  .chat-h{ padding:8px 12px; }
  .ph{ padding:12px 14px 8px; }
}

/* ── LANDING PAGE MOBILE ── */
@media (max-width: 768px) {
  .auth-card{ padding:32px 24px !important; }
  .lp-nav-login{ display:none !important; }
  .lp-hero-inner{ grid-template-columns:1fr !important; gap:32px !important; padding:32px 5vw 24px !important; }
  .lp-mock-card{ display:none !important; }
  .lp-h1{ font-size:32px !important; letter-spacing:-1px !important; }
  .lp-hero-btns{ flex-direction:column !important; }
  .lp-hero-btns > button{ width:100% !important; text-align:center !important; }
  .lp-trust{ flex-direction:column !important; gap:8px !important; font-size:12px !important; }
  .lp-section{ padding:56px 5vw !important; }
  .lp-steps{ grid-template-columns:1fr 1fr !important; gap:28px !important; }
  .lp-steps-line{ display:none !important; }
  .lp-pricing{ grid-template-columns:1fr !important; }
  .lp-stats-grid{ grid-template-columns:1fr 1fr !important; gap:12px !important; }
  .lp-cta-btns{ flex-direction:column !important; align-items:stretch !important; }
  .lp-cta-btns > button{ width:100% !important; }
  .lp-footer{ flex-direction:column !important; align-items:center !important; text-align:center !important; }
  .lp-footer-links{ flex-wrap:wrap !important; justify-content:center !important; gap:12px 16px !important; }
}
`

function injectCSS() {
  if (!document.getElementById('op-css')) {
    const s = document.createElement('style')
    s.id = 'op-css'
    s.textContent = CSS
    document.head.appendChild(s)
  }
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_FLOW = ['new','confirmed','packed','dispatched','delivered']
const STATUS_CFG = {
  new:        { label:'New',        color:'#3B82F6', bg:'#EFF6FF' },
  confirmed:  { label:'Confirmed',  color:'#8B5CF6', bg:'#F5F3FF' },
  packed:     { label:'Packed',     color:'#F59E0B', bg:'#FFFBEB' },
  dispatched: { label:'Dispatched', color:'#EF4444', bg:'#FFF5F5' },
  delivered:  { label:'Delivered',  color:'#10B981', bg:'#F0FFF4' },
  cancelled:  { label:'Cancelled',  color:'#6B7280', bg:'#F9FAFB' },
}
const STATUS_COLORS = { new:'#3B82F6', confirmed:'#8B5CF6', packed:'#F59E0B', dispatched:'#EF4444', delivered:'#10B981' }
const AVATARCOLORS = ['#E8F5E9','#FFF3E0','#F3E5F5','#E3F2FD','#FFEBEE','#E0F7FA']

function avatarFor(name) {
  if (!name) return { initials: '?', bg: '#E0E0E0' }
  const words = name.trim().split(' ')
  const initials = words.length >= 2 ? words[0][0] + words[words.length-1][0] : words[0].slice(0,2)
  let hash = 0; for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  const bg = AVATARCOLORS[Math.abs(hash) % AVATARCOLORS.length]
  return { initials: initials.toUpperCase(), bg }
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
}

function intentOf(text) {
  if (!text) return null
  const l = text.toLowerCase()
  if (l.includes('same as last') || l.includes('repeat')) return { cls:'ir', label:'Repeat Order' }
  if (l.includes('paid') || l.includes('gpay') || l.includes('upi') || l.includes('phonepe') || l.includes('paytm')) return { cls:'ip', label:'Payment Update' }
  if (l.includes('kg') || l.includes('order') || l.includes('want') || l.includes('need') || l.includes('send') || l.includes('dozen') || l.includes('litre') || l.includes('packet') || l.includes('bottle')) return { cls:'io', label:'New Order' }
  return null
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Spinner({ lg }) {
  return lg
    ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1 }}>
        <div className="spinner-lg" /><div style={{ fontSize:13, color:'#6B7F72' }}>Loading...</div>
      </div>
    : <span className="spinner-sm" />
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.new
  return <span className="sbadge" style={{ background:c.bg, color:c.color }}>{c.label}</span>
}

function StatusBar({ status }) {
  const idx = STATUS_FLOW.indexOf(status)
  if (idx < 0) return null
  const pct = status === 'delivered' ? 100 : (idx / (STATUS_FLOW.length - 1)) * 100
  return <div className="sbar"><div className="sfill" style={{ width:pct+'%', background:STATUS_COLORS[status]||'#ccc' }} /></div>
}

function Toast({ msg, type, onDone, action }) {
  useEffect(() => { const t = setTimeout(onDone, 5000); return () => clearTimeout(t) }, [])
  const isWA = type === 'wa'
  const isErr = type === 'error'
  return (
    <div className="toast" style={{ borderLeft: `4px solid ${isWA ? '#25D366' : isErr ? '#EF4444' : '#0A6640'}` }}>
      {isWA ? <>
        <div className="th2"><span style={{ fontSize:18 }}>💬</span><span className="ta">WhatsApp · Sent via Whats-Order</span><span className="tm">{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>
        <div className="tsn">Customer notified</div>
        <div className="tmsg">{msg}</div>
      </> : <>
        <div className="th2"><span style={{ fontSize:18 }}>{isErr ? '❌' : '✅'}</span><span style={{ fontSize:12, fontWeight:700, color:isErr?'#EF4444':'#0A6640' }}>{isErr ? 'Error' : 'Success'}</span></div>
        <div className="tmsg">{msg}</div>
        {action && <button onClick={() => { action(); onDone() }} style={{ marginTop:8, background:'var(--g)', color:'white', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--f)' }}>View Orders →</button>}
      </>}
    </div>
  )
}

// ─── CREATE ORDER MODAL ───────────────────────────────────────────────────────
function CreateOrderModal({ contact, msgs, onClose, onCreated }) {
  // Pre-fill from most recent extracted_order in messages
  const extracted = useMemo(() => {
    if (!msgs) return []

    // Try extracted_order from backend first
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (!m.extracted_order) continue
      try {
        const parsed = typeof m.extracted_order === 'string'
          ? JSON.parse(m.extracted_order)
          : m.extracted_order
        if (parsed?.items?.length) {
          return parsed.items.map(it => ({ name: it.name, qty: it.qty || 1, unit: it.unit || '', price: 0 }))
        }
      } catch {}
    }

    // Fallback: parse the last inbound message body directly in the browser
    // Handles common formats: "2 butter chicken", "1kg rice", "3 naan, 2 lassi"
    const parseBody = (body) => {
      if (!body) return []
      const items = []
      const lines = body.split(/[,\n+&]/).map(s => s.trim()).filter(Boolean)
      for (const line of lines) {
        // "2 butter chicken" or "2kg rice" or "rice 2"
        const unitRe = /kg|kgs|kilo|gms?|grams?|ml|ltr|litres?|pcs?|pieces?|packets?|pack|nos?|dozen/i
        const m1 = line.match(/^(\d+(?:\.\d+)?)\s*(kg|kgs?|kilo|gms?|grams?|ml|ltr|litres?|pcs?|pieces?|packets?|pack|nos?|dozen)?\s+(?:of\s+)?([a-zA-Z].{1,40})$/i)
        if (m1) { items.push({ name: m1[3].trim(), qty: parseFloat(m1[1]) || 1, unit: m1[2] || '', price: 0 }); continue }
        // "butter chicken 2" or "rice 1kg"
        const m2 = line.match(/^([a-zA-Z][^0-9]{1,40}?)\s+(\d+(?:\.\d+)?)\s*(kg|kgs?|gms?|grams?|ml|ltr|pcs?|pieces?|packets?)?$/i)
        if (m2) { items.push({ name: m2[1].trim(), qty: parseFloat(m2[2]) || 1, unit: m2[3] || '', price: 0 }); continue }
        // Single word/phrase with no qty — treat as qty 1
        if (/^[a-zA-Z][a-zA-Z\s]{2,40}$/.test(line)) {
          items.push({ name: line, qty: 1, unit: '', price: 0 })
        }
      }
      return items
    }

    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (m.direction !== 'inbound' || !m.body) continue
      const items = parseBody(m.body)
      if (items.length > 0) return items
    }

    return []
  }, [msgs])

  const [items, setItems] = useState(() => extracted.length ? extracted : [{ name:'', qty:1, unit:'', price:0 }])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const total = items.reduce((s,i) => s + i.qty * i.price, 0)
  const upd = (i,f,v) => { const n=[...items]; n[i]={...n[i],[f]:(f==='name'||f==='unit')?v:Number(v)}; setItems(n) }
  const submit = async () => {
    const valid = items.filter(i => i.name.trim())
    if (!valid.length) return
    setLoading(true)
    try { await onCreated(valid, total, notes) }
    finally { setLoading(false) }
  }
  const av = avatarFor(contact?.name || contact?.wa_number)
  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
          <div><div className="mt">Create Order</div><div className="ms2">For {contact?.name || contact?.wa_number}</div></div>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:'#6B7080', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Items</div>
        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 56px 80px 72px 32px', gap:8, marginBottom:4 }}>
          {['Item','Qty','Unit','₹ Price',''].map((h,i) => (
            <div key={i} style={{ fontSize:11, color:'#9CA3AF', fontWeight:600, textAlign: i>=1?'center':'left' }}>{h}</div>
          ))}
        </div>
        {items.map((item,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 56px 80px 72px 32px', gap:8, marginBottom:8 }}>
            <input className="inp" placeholder="Item name" value={item.name} onChange={e => upd(i,'name',e.target.value)} style={{ padding:'8px 10px' }} />
            <input className="inp" type="number" min="1" value={item.qty} onChange={e => upd(i,'qty',e.target.value)} style={{ padding:'8px 6px', textAlign:'center' }} />
            <input className="inp" placeholder="kg/pcs…" value={item.unit||''} onChange={e => upd(i,'unit',e.target.value)} style={{ padding:'8px 6px', textAlign:'center' }} />
            <input className="inp" type="number" min="0" placeholder="0" value={item.price||''} onChange={e => upd(i,'price',e.target.value)} style={{ padding:'8px 6px', textAlign:'right' }} />
            <button onClick={() => setItems(items.filter((_,j)=>j!==i))} style={{ border:'none', background:'#FFF5F5', borderRadius:8, cursor:'pointer', color:'#EF4444', fontSize:16 }}>×</button>
          </div>
        ))}
        <button onClick={() => setItems([...items,{name:'',qty:1,unit:'',price:0}])} style={{ fontSize:13, color:'#0A6640', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:'4px 0', marginBottom:12 }}>+ Add item</button>
        <div className="fg">
          <label className="lbl">Notes (optional)</label>
          <input className="inp" placeholder="Delivery address, special instructions..." value={notes} onChange={e => setNotes(e.target.value)} style={{ padding:'8px 12px' }} />
        </div>
        <div style={{ fontSize:18, fontWeight:800, textAlign:'right', color:'#0F1A14', marginBottom:16 }}>Total: ₹{total.toLocaleString('en-IN')}</div>
        <button className="btn" onClick={submit} disabled={loading || !items.some(i=>i.name.trim())}>
          {loading ? <><Spinner /> Creating...</> : 'Confirm Order & Notify Customer'}
        </button>
      </div>
    </div>
  )
}

// ─── UPI MODAL ────────────────────────────────────────────────────────────────
function UPIModal({ order, onClose, onSent }) {
  const [vpa, setVpa] = useState('')
  const [loading, setLoading] = useState(false)
  const send = async () => {
    if (!vpa.trim()) return
    setLoading(true)
    try { await onSent(order.id, vpa.trim()) } finally { setLoading(false) }
  }
  return (
    <div className="ov" onClick={onClose}>
      <div className="modal upi-modal" style={{ width:380 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <div><div className="mt">Send UPI Payment Link</div><div className="ms2">{order.order_number} · ₹{order.total_amount?.toLocaleString('en-IN')}</div></div>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>
        <div className="fg">
          <label className="lbl">Your UPI VPA (Virtual Payment Address)</label>
          <input className="inp" placeholder="yourname@okicici" value={vpa} onChange={e => setVpa(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} />
          <div style={{ fontSize:12, color:'#6B7F72', marginTop:6 }}>e.g. priya@okicici, 9876543210@paytm</div>
        </div>
        <button className="btn" onClick={send} disabled={loading || !vpa.trim()}>
          {loading ? <Spinner /> : '💳 Send UPI Link on WhatsApp'}
        </button>
      </div>
    </div>
  )
}

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────
function PaymentModal({ order, onClose, onConfirm }) {
  const [method, setMethod] = useState('upi')
  const [ref, setRef] = useState('')
  const [loading, setLoading] = useState(false)
  const confirm = async () => {
    setLoading(true)
    try { await onConfirm(order.id, order.total_amount, method, ref) } finally { setLoading(false) }
  }
  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" style={{ width:380 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <div><div className="mt">Confirm Payment</div><div className="ms2">{order.order_number} · ₹{order.total_amount?.toLocaleString('en-IN')}</div></div>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>
        <div className="fg">
          <label className="lbl">Payment Method</label>
          <div style={{ display:'flex', gap:8 }}>
            {['upi','cod','bank'].map(m => (
              <button key={m} onClick={() => setMethod(m)} style={{ flex:1, padding:'10px', border:`2px solid ${method===m?'#0A6640':'#E4EDE6'}`, borderRadius:10, background:method===m?'#E8F5E9':'white', fontFamily:'var(--f)', fontWeight:600, fontSize:13, cursor:'pointer', textTransform:'uppercase', color:method===m?'#0A6640':'#6B7F72' }}>{m}</button>
            ))}
          </div>
        </div>
        <div className="fg">
          <label className="lbl">Transaction Reference (optional)</label>
          <input className="inp" placeholder="UPI ref / bank ref no." value={ref} onChange={e => setRef(e.target.value)} />
        </div>
        <button className="btn" onClick={confirm} disabled={loading}>
          {loading ? <Spinner /> : '✓ Mark as Paid'}
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING SCREEN ────────────────────────────────────────────────────────
const PIPELINE_STEPS = ['token_exchange','token_extend','waba_discovery','phone_fetch','webhook_subscribe','db_save']
const STEP_LABELS = {
  token_exchange:'Exchange code for access token',
  token_extend:'Extend to 60-day long-lived token',
  waba_discovery:'Discover WhatsApp Business Account',
  phone_fetch:'Fetch registered phone numbers',
  webhook_subscribe:'Subscribe to shared webhook',
  db_save:'Activate your account',
}

function OnboardingScreen({ user, onDone, addToast }) {
  const [phase, setPhase] = useState('idle')
  const [steps, setSteps] = useState({})
  const [errMsg, setErrMsg] = useState('')
  const [sdkReady, setSdkReady] = useState(!!window.FB)

  const [appId, setAppId] = useState(import.meta.env.VITE_META_APP_ID || '')
  const [configId, setConfigId] = useState(import.meta.env.VITE_META_CONFIG_ID || '')

  // Fetch Meta config from backend at runtime (no build args needed)
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        if (data.meta_app_id) setAppId(data.meta_app_id)
        if (data.meta_config_id) setConfigId(data.meta_config_id)
      })
      .catch(() => {})
  }, [])

  const [pendingLaunch, setPendingLaunch] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [manualWabaId, setManualWabaId] = useState('')
  const [manualPhoneId, setManualPhoneId] = useState('')
  const [manualToken, setManualToken] = useState('')

  // Load FB SDK — poll for window.FB since fbAsyncInit can miss if script loads fast
  useEffect(() => {
    if (!appId) return
    const initFB = () => {
      if (!window.FB) return
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: 'v19.0' })
      setSdkReady(true)
    }
    if (window.FB) { initFB(); return }
    // Set fbAsyncInit before injecting script (catches normal async load)
    window.fbAsyncInit = initFB
    // Inject script only once
    if (!document.getElementById('fb-sdk')) {
      const s = document.createElement('script')
      s.id = 'fb-sdk'
      s.src = 'https://connect.facebook.net/en_US/sdk.js'
      s.async = true
      document.body.appendChild(s)
    }
    // Fallback: poll every 200ms in case fbAsyncInit was missed
    const poll = setInterval(() => {
      if (window.FB) { clearInterval(poll); initFB() }
    }, 200)
    return () => clearInterval(poll)
  }, [appId])

  // Auto-launch once SDK becomes ready (user clicked before SDK finished loading)
  useEffect(() => {
    if (sdkReady && pendingLaunch) {
      setPendingLaunch(false)
      launchFBLogin()
    }
  }, [sdkReady, pendingLaunch])

  const connectWA = () => {
    if (!appId || !configId) {
      setErrMsg('Meta App ID or Config ID missing. Check Railway Variables.')
      setPhase('error')
      return
    }
    if (!sdkReady || !window.FB) {
      // SDK still loading — queue the launch, it will auto-fire when ready
      setPendingLaunch(true)
      return
    }
    launchFBLogin()
  }

  const launchFBLogin = () => {
    setPhase('popup')
    // waba_id and phone_number_id come via postMessage from the popup,
    // NOT from authResponse. Must be captured before FB.login() is called.
    let wabaId = ''
    let phoneNumberId = ''
    const sessionInfoListener = (event) => {
      if (!['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin)) return
      try {
        const data = JSON.parse(event.data)
        console.log('WA Embedded Signup event:', JSON.stringify(data))
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
            wabaId = data.data?.waba_id || ''
            phoneNumberId = data.data?.phone_number_id || ''
            console.log('Got WABA ID:', wabaId, 'Phone ID:', phoneNumberId)
          }
        }
      } catch {}
    }
    window.addEventListener('message', sessionInfoListener)

    window.FB.login((response) => {
      window.removeEventListener('message', sessionInfoListener)
      console.log('FB.login response:', JSON.stringify(response))
      if (response.status !== 'connected' || !response?.authResponse) {
        setPhase('idle')
        return
      }
      setPhase('pipeline')
      const code = response.authResponse.code
      const accessToken = response.authResponse.accessToken
      const redirectUri = 'https://www.facebook.com/connect/login_success.html'
      const token = code || accessToken
      console.log('wabaId:', wabaId, 'phoneNumberId:', phoneNumberId)
      api.connectWABA(token, redirectUri, wabaId, phoneNumberId)
        .then(() => { setPhase('done'); setTimeout(onDone, 2000) })
        .catch(err => { setErrMsg(err.error || 'Connection failed'); setPhase('error') })
    }, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      scope: 'public_profile,business_management,whatsapp_business_management,whatsapp_business_messaging',
      extras: {
        setup: {},
        sessionInfoVersion: 3,
      },
    })
  }

  const submitManual = () => {
    if (!manualWabaId.trim() || !manualPhoneId.trim() || !manualToken.trim()) return
    setPhase('pipeline')
    setManualMode(false)
    api.connectWABA(manualToken.trim(), '', manualWabaId.trim(), manualPhoneId.trim())
      .then(() => { setPhase('done'); setTimeout(onDone, 2000) })
      .catch(err => { setErrMsg(err.error || 'Connection failed'); setPhase('error') })
  }

  // Poll onboarding status to show real pipeline steps
  useEffect(() => {
    if (phase !== 'pipeline') return
    const poll = setInterval(async () => {
      try {
        const s = await api.getOnboardingStatus()
        const stepMap = {}
        for (const e of (s.steps || [])) {
          stepMap[e.step] = e.status === 'success' ? 'done' : 'failed'
        }
        setSteps(stepMap)
        if (s.status === 'active') { setPhase('done'); setTimeout(onDone, 2000) }
        if (s.status === 'failed') { setErrMsg(s.error || 'Step failed'); setPhase('error') }
      } catch {}
    }, 800)
    return () => clearInterval(poll)
  }, [phase])

  const stepState = s => steps[s] || (phase === 'pipeline' ? 'pending' : 'pending')

  return (
    <div className="onb-screen">
      <div className="onb-top">
        <div style={{ width:32, height:32, background:'#0A6640', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'white', fontWeight:900 }}>W</div>
        <span style={{ fontWeight:800, color:'#0A6640' }}>Whats-Order</span>
        <span style={{ marginLeft:'auto', fontSize:13, color:'#6B7F72' }}>Signed in as {user?.name || user?.email}</span>
      </div>
      <div className="onb-body">
        <div className="onb-card">
          <div className="steps-ind">
            <div className="step-dot on" /><div className={`step-dot ${phase!=='idle'?'on':''}`} /><div className={`step-dot ${phase==='done'?'on':''}`} />
          </div>

          {phase === 'done' ? (
            <div className="pop-in" style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0F1A14', marginBottom:8 }}>You're connected!</div>
              <div style={{ fontSize:14, color:'#6B7F72', marginBottom:20, lineHeight:1.6 }}>
                Your WhatsApp Business Account is now linked to Whats-Order.<br/>A confirmation message was sent to your number.
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                {['Messages auto-routed','Webhook subscribed','60-day token'].map((t,i) => (
                  <span key={i} style={{ background:'#E8F5E9', color:'#0A6640', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>{t} ✓</span>
                ))}
              </div>
              <div style={{ fontSize:13, color:'#6B7F72', marginTop:14 }}>Redirecting to dashboard...</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:22, fontWeight:800, color:'#0F1A14', marginBottom:6 }}>Connect WhatsApp</div>
              <div style={{ fontSize:14, color:'#6B7F72', marginBottom:24, lineHeight:1.6 }}>
                Link your WhatsApp Business Account. Takes 10 seconds — no technical setup needed.
              </div>

              {!accepted ? (
                <div style={{ marginBottom:20 }}>
                  {/* What we do */}
                  <div style={{ background:'#F8FFFE', border:'1.5px solid #BBE0CC', borderRadius:14, padding:20, marginBottom:16 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'#0F1A14', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>🔗</span> What happens when you connect
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {[
                        { icon:'📲', title:'We link your WhatsApp number', desc:"Your WhatsApp Business number gets connected to Whats-Order so we can show you incoming messages in the dashboard." },
                        { icon:'📥', title:'Incoming messages are routed here', desc:"When customers message you on WhatsApp, those messages appear in your Whats-Order inbox in real time. We don't block or intercept — your WhatsApp app still works normally." },
                        { icon:'📤', title:'You send replies from here', desc:"When you reply from the dashboard, the message is sent on behalf of your WhatsApp Business number — it looks exactly like a normal WhatsApp message to your customer." },
                        { icon:'🛒', title:'We help you create orders', desc:"We help you convert messages into tracked orders. We never auto-send messages or create orders without your action." },
                      ].map((item, i) => (
                        <div key={i} style={{ display:'flex', gap:12, padding:'10px 12px', background:'white', borderRadius:10, border:'1px solid #E4EDE6' }}>
                          <span style={{ fontSize:20, flexShrink:0 }}>{item.icon}</span>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13, color:'#0F1A14', marginBottom:3 }}>{item.title}</div>
                            <div style={{ fontSize:12, color:'#6B7F72', lineHeight:1.6 }}>{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security & privacy */}
                  <div style={{ background:'#F0FAF5', border:'1.5px solid #BBE0CC', borderRadius:14, padding:20, marginBottom:16 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'#0F1A14', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>🔒</span> Your messages are safe
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[
                        "Your messages are stored securely in an encrypted database — only you can see them.",
                        "We never read, share, or sell your messages or customer data to anyone.",
                        "Your WhatsApp access token is stored encrypted and never exposed outside the server.",
                        "We don't send any message to your customers without you clicking Send.",
                        "You can disconnect your WhatsApp account from Whats-Order at any time from your profile.",
                      ].map((point, i) => (
                        <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:13, color:'#1A2E22' }}>
                          <span style={{ color:'#0A6640', fontWeight:800, flexShrink:0, marginTop:1 }}>✓</span>
                          <span style={{ lineHeight:1.6 }}>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost info */}
                  <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:14, padding:20, marginBottom:20 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'#0F1A14', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>💰</span> About costs
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:13, color:'#1A2E22' }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ color:'#0A6640', fontWeight:800, flexShrink:0, marginTop:1 }}>✓</span>
                        <span style={{ lineHeight:1.6 }}><strong>Whats-Order is free</strong> for up to 50 orders/month. Pro plan is ₹299 for 3 months (just ₹100/month) for unlimited orders.</span>
                      </div>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ color:'#D97706', fontWeight:800, flexShrink:0, marginTop:1 }}>ℹ</span>
                        <span style={{ lineHeight:1.6 }}><strong>WhatsApp API costs:</strong> Meta gives you <strong>1,000 free conversations/month</strong> per WhatsApp number. Beyond that, Meta charges approximately ₹0.58–₹0.83 per conversation. This is a Meta charge — not us. At typical small business usage you will stay within the free limit.</span>
                      </div>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ color:'#0A6640', fontWeight:800, flexShrink:0, marginTop:1 }}>✓</span>
                        <span style={{ lineHeight:1.6 }}>We have <strong>no hidden fees</strong>. You can see your WhatsApp API usage anytime at business.facebook.com.</span>
                      </div>
                    </div>
                  </div>

                  {/* Accept button */}
                  <button
                    onClick={() => setAccepted(true)}
                    style={{ width:'100%', padding:'14px', background:'#0A6640', color:'white', border:'none', borderRadius:12, fontFamily:'var(--f)', fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 16px rgba(10,102,64,0.3)' }}>
                    I understand — Continue to connect →
                  </button>
                  <div style={{ textAlign:'center', marginTop:10, fontSize:12, color:'#9CA3AF' }}>
                    By continuing you agree to our <a href="/terms" style={{ color:'#0A6640' }} target="_blank">Terms of Service</a> and <a href="/privacy" style={{ color:'#0A6640' }} target="_blank">Privacy Policy</a>
                  </div>
                </div>
              ) : null}

              {phase === 'popup' && (
                <div style={{ background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:12, padding:'14px 16px', marginBottom:16, fontSize:13, color:'#92400E', display:'flex', gap:10, alignItems:'center' }}>
                  <span className="pulse" style={{ fontSize:18 }}>⏳</span>
                  <span><strong>Facebook popup is open.</strong> Select your WhatsApp Business Account and approve permissions...</span>
                </div>
              )}

              {phase === 'error' && !manualMode && (
                <div style={{ marginBottom:16 }}>
                  <div className="err" style={{ marginBottom:10 }}>
                    <strong>Connection failed:</strong> {errMsg}
                  </div>
                  {errMsg.includes('WABA') || errMsg.includes('waba') || errMsg.includes('step 3') ? (
                    <div style={{ background:'#F0FAF5', border:'1px solid #BBE0CC', borderRadius:10, padding:'14px 16px', fontSize:13, color:'#1A2E22' }}>
                      <div style={{ fontWeight:700, marginBottom:6 }}>📋 Connect manually instead</div>
                      <div style={{ color:'#6B7F72', marginBottom:10, lineHeight:1.5 }}>
                        Get your details from <strong>business.facebook.com → WhatsApp Accounts → your account → API Setup</strong>
                      </div>
                      <button onClick={() => setManualMode(true)} style={{ background:'#0A6640', color:'white', border:'none', borderRadius:8, padding:'8px 16px', fontFamily:'var(--f)', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                        Enter details manually →
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {manualMode && (
                <div style={{ background:'#F0FAF5', border:'1px solid #BBE0CC', borderRadius:12, padding:20, marginBottom:16 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'#0F1A14', marginBottom:4 }}>Manual Setup</div>
                  <div style={{ fontSize:12, color:'#6B7F72', marginBottom:16, lineHeight:1.5 }}>
                    Find these in <strong>Meta Business Suite → WhatsApp Accounts → your WABA → API Setup</strong>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#1A2E22', marginBottom:4 }}>WABA ID</label>
                    <input className="inp" placeholder="e.g. 191254092271447" value={manualWabaId} onChange={e => setManualWabaId(e.target.value)} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#1A2E22', marginBottom:4 }}>Phone Number ID</label>
                    <input className="inp" placeholder="e.g. 123456789012345" value={manualPhoneId} onChange={e => setManualPhoneId(e.target.value)} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#1A2E22', marginBottom:4 }}>Access Token <span style={{ color:'#6B7F72', fontWeight:400 }}>(from API Setup → Generate token)</span></label>
                    <input className="inp" placeholder="EAAxxxxxxxx..." value={manualToken} onChange={e => setManualToken(e.target.value)} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={submitManual} disabled={!manualWabaId.trim() || !manualPhoneId.trim() || !manualToken.trim()} style={{ flex:1, padding:'10px', background:'#0A6640', color:'white', border:'none', borderRadius:8, fontFamily:'var(--f)', fontSize:14, fontWeight:700, cursor:'pointer', opacity: (!manualWabaId || !manualPhoneId || !manualToken) ? 0.5 : 1 }}>
                      Connect
                    </button>
                    <button onClick={() => { setManualMode(false); setPhase('idle') }} style={{ padding:'10px 16px', background:'white', color:'#6B7F72', border:'1.5px solid #E4EDE6', borderRadius:8, fontFamily:'var(--f)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {phase === 'pipeline' && (
                <div className="pip-steps">
                  {PIPELINE_STEPS.map(s => {
                    const st = stepState(s)
                    const icon = st==='running' ? <div style={{ width:16,height:16,border:'2px solid #F59E0B',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite' }} /> : st==='done' ? <span style={{ color:'#10B981',fontWeight:700 }}>✓</span> : st==='failed' ? <span style={{ color:'#EF4444' }}>✗</span> : <span style={{ color:'#9CA3AF' }}>○</span>
                    return (
                      <div key={s} className={`pip-step ${st}`}>
                        <div style={{ width:20,display:'flex',alignItems:'center',justifyContent:'center' }}>{icon}</div>
                        <span style={{ color:st==='done'?'#0A6640':st==='running'?'#92400E':'#6B7080', fontWeight:st!=='pending'?600:400 }}>{STEP_LABELS[s]}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {accepted && (phase === 'idle' || phase === 'error') && !manualMode && (
                <>
                  <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:4, fontWeight:600,
                      background: appId ? '#E8F5E9' : '#FFF5F5',
                      color: appId ? '#0A6640' : '#DC2626' }}>
                      {appId ? '✓ App ID set' : '✗ VITE_META_APP_ID missing'}
                    </span>
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:4, fontWeight:600,
                      background: configId ? '#E8F5E9' : '#FFF5F5',
                      color: configId ? '#0A6640' : '#DC2626' }}>
                      {configId ? '✓ Config ID set' : '✗ VITE_META_CONFIG_ID missing'}
                    </span>
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:4, fontWeight:600,
                      background: sdkReady ? '#E8F5E9' : '#FFF8E1',
                      color: sdkReady ? '#0A6640' : '#D97706' }}>
                      {sdkReady ? '✓ FB SDK ready' : '⏳ FB SDK loading...'}
                    </span>
                  </div>
                  <button className="wa-btn" onClick={connectWA} disabled={!appId || !configId || pendingLaunch}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {pendingLaunch ? 'Loading Facebook SDK...' : phase === 'error' ? 'Try Again' : 'Connect WhatsApp Business'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── NOTIFICATION SOUND ──────────────────────────────────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    o.start(); o.stop(ctx.currentTime + 0.4)
  } catch {}
}

let _tabFlash = null
function flashTab(msg) {
  clearInterval(_tabFlash)
  const orig = document.title
  let on = true
  _tabFlash = setInterval(() => {
    document.title = on ? `🔔 ${msg}` : orig
    on = !on
  }, 800)
  setTimeout(() => { clearInterval(_tabFlash); document.title = orig }, 8000)
}

// ─── INBOX ────────────────────────────────────────────────────────────────────
function InboxView({ addToast, onNavOrders, onUnreadChange }) {
  const [threads, setThreads] = useState([])
  const [active, setActive] = useState(null)
  const activeRef = useRef(null)
  const setActiveWithRef = (t) => { activeRef.current = t; setActive(t) }
  const [msgs, setMsgs] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(null)
  const [hoveredMsg, setHoveredMsg] = useState(null)
  const [search, setSearch] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState([
    { id:1, label:'Order Ready', text:'Your order is ready for pickup! 🎉' },
    { id:2, label:'Out for Delivery', text:'Your order is out for delivery 🚚 Will reach you shortly!' },
    { id:3, label:'Order Confirmed', text:'Your order has been confirmed ✅ We will start preparing it now.' },
    { id:4, label:'Payment Reminder', text:'Friendly reminder: Payment is pending for your order. Please complete payment at your earliest convenience.' },
    { id:5, label:'Thank You', text:'Thank you for your order! 🙏 We appreciate your business.' },
  ])
  const [editingTemplates, setEditingTemplates] = useState(false)
  const chatEnd = useRef(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  // onUnreadChange ref — avoids stale closure in useCallback
  const onUnreadChangeRef = useRef(onUnreadChange)
  useEffect(() => { onUnreadChangeRef.current = onUnreadChange }, [onUnreadChange])

  const prevUnreadRef = useRef(-1)
  // lastSeenRef tracks last-known message timestamp per contact
  // On first load all entries are null → no "new" detection yet → all zeroed
  // From 2nd poll onward, genuinely new messages are detected by timestamp comparison
  const lastSeenRef = useRef({})
  const loadInbox = useCallback(async () => {
    try {
      const data = await api.getInbox()

      // Compare with last known state to detect truly new messages
      // lastSeenMsgAt: { contactId -> ISO timestamp of last message we saw }
      const lastSeen = lastSeenRef.current
      let newMsgCount = 0

      const display = data.map(t => {
        const cid = t.contact?.id
        const msgAt = t.last_message?.created_at
        const prevAt = lastSeen[cid]

        // A message is "new" only if it arrived after the last time we polled
        const isNew = msgAt && prevAt && new Date(msgAt) > new Date(prevAt)

        if (isNew) {
          newMsgCount++
          return { ...t, unread_count: 1 }  // always show 1, not total server count
        }
        return { ...t, unread_count: 0 }  // zero out stale counts
      })

      // Update our snapshot of last-seen timestamps
      const newSeen = {}
      data.forEach(t => {
        if (t.contact?.id) newSeen[t.contact.id] = t.last_message?.created_at
      })
      lastSeenRef.current = newSeen

      setThreads(display)

      // Notify if new messages arrived while tab was hidden
      if (newMsgCount > 0 && document.hidden) {
        playNotifSound()
        flashTab('New WhatsApp message!')
      }

      // Sidebar badge = new message count only (0 if none)
      onUnreadChangeRef.current?.(newMsgCount)

      // Mark all read in DB (persists 0 after refresh for stale messages)
      api.markAllRead().catch(() => {})

      // Auto-select first thread
      if (!activeRef.current && data.length) setActiveWithRef(data[0])
    }
    catch { addToast('Failed to load inbox', 'error') }
    finally { setLoading(false) }
  }, [])

  const loadMsgs = useCallback(async (contact) => {
    if (!contact) return
    try { setMsgs(await api.getMessages(contact.id)) }
    catch {}
  }, [])

  useEffect(() => {
    loadInbox()
  }, [])


  useEffect(() => { if (active?.contact) loadMsgs(active.contact) }, [active])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])

  // Poll for new messages every 5s
  useEffect(() => {
    const t = setInterval(() => {
      loadInbox()
      if (active?.contact) loadMsgs(active.contact)
    }, 5000)
    return () => clearInterval(t)
  }, [active])

  const send = async () => {
    if (!reply.trim() || !active?.contact) return
    setSending(true)
    try {
      await api.sendReply(active.contact.id, reply)
      setReply('')
      await loadMsgs(active.contact)
    } catch (e) { addToast(e.error || 'Failed to send', 'error') }
    finally { setSending(false) }
  }

  const handleCreateOrder = async (items, total, notes) => {
    try {
      const result = await api.createOrder(active.contact.id, items, notes)
      setCreateModal(null)
      addToast(`Order ${result.order_number} created! Customer notified.`, 'success', onNavOrders)
    } catch (e) {
      if (e.code === 'plan_limit_exceeded') {
        addToast('You\'ve reached 50 orders this month. Upgrade to Pro (₹299 / 3 months) for unlimited orders.', 'error', () => window.open('mailto:whatsorder.help@gmail.com?subject=Upgrade to Pro&body=I want to upgrade to Pro plan (₹299 for 3 months).', '_blank'))
      } else {
        addToast(e.error || 'Failed to create order', 'error')
      }
    }
  }

  if (loading) return <div style={{ flex:1 }}><Spinner lg /></div>

  const contact = active?.contact
  const lastMsg = active?.last_message
  const av = contact ? avatarFor(contact.name || contact.wa_number) : null

  const isMobile = () => window.innerWidth < 768

  return (
    <>
    <div className="inbox-wrap">
      <div className={`inbox-p${active && isMobile() ? ' chat-open' : ''}`}>
        <div className="ph">
          <div className="ph-t">Inbox</div>
          <div className="ph-s">{threads.length} conversations</div>
        </div>
        <div style={{ padding:'8px 12px', borderBottom:'1px solid #E4EDE6' }}>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts or messages..."
              style={{ width:'100%', padding:'7px 10px 7px 30px', borderRadius:8, border:'1.5px solid #E4EDE6', fontFamily:'var(--f)', fontSize:13, color:'#1A2E22', outline:'none', boxSizing:'border-box', background:'#FAFAF7' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:16, padding:0 }}>×</button>}
          </div>
        </div>
        <div className="threads">
          {threads.length === 0 && (
            <div style={{ padding:24, textAlign:'center', color:'#6B7F72', fontSize:13 }}>
              No messages yet. Waiting for customers to WhatsApp you...
            </div>
          )}
          {threads.filter(t => {
            if (!search.trim()) return true
            const q = search.toLowerCase()
            return (t.contact?.name || '').toLowerCase().includes(q) ||
                   (t.contact?.wa_number || '').includes(q) ||
                   (t.last_message?.body || '').toLowerCase().includes(q)
          }).map(t => {
            const a = avatarFor(t.contact?.name || t.contact?.wa_number)
            const intent = intentOf(t.last_message?.body)
            return (
              <div key={t.contact?.id} className={`thread ${active?.contact?.id===t.contact?.id?'on':''}`} onClick={() => {
                setActiveWithRef(t)
                api.markRead(t.contact?.id).catch(() => {})
              }}>
                <div className="av" style={{ width:42, height:42, background:a.bg }}>{a.initials}</div>
                <div className="ti">
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div className="tn">{t.contact?.name || t.contact?.wa_number}</div>
                    <div className="tt">{fmtTime(t.last_message?.created_at)}</div>
                  </div>
                  <div className="tp">{t.last_message?.body || '[media]'}</div>
                  {intent && <span className={`itag ${intent.cls}`}>{intent.label}</span>}
                </div>
                {t.unread_count > 0 && <div className="ubadge">{t.unread_count}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className={`chat-p${!active && isMobile() ? ' no-chat' : ''}`}>
        {!active ? (
          <div className="loading">Select a conversation</div>
        ) : (
          <>
            <div className="chat-h">
              <button className="mob-back" onClick={() => setActiveWithRef(null)} title="Back">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <div className="av" style={{ width:40, height:40, background:av.bg }}>{av.initials}</div>
              <div style={{ flex:'none' }}>
                {editingName ? (
                  <form onSubmit={async e => { e.preventDefault(); if(nameInput.trim()){await api.updateContactName(contact.id, nameInput.trim()); setActiveWithRef({...active, contact:{...contact, name:nameInput.trim()}}); setThreads(ts=>ts.map(t=>t.contact?.id===contact.id?{...t,contact:{...t.contact,name:nameInput.trim()}}:t))}; setEditingName(false) }} style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <input autoFocus value={nameInput} onChange={e=>setNameInput(e.target.value)} style={{ border:'1.5px solid var(--g)', borderRadius:7, padding:'4px 8px', fontFamily:'var(--f)', fontSize:14, fontWeight:700, outline:'none', width:160 }} />
                    <button type="submit" style={{ background:'var(--g)', color:'white', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Save</button>
                    <button type="button" onClick={()=>setEditingName(false)} style={{ background:'none', border:'1px solid var(--bd)', borderRadius:6, padding:'4px 8px', fontSize:12, cursor:'pointer', color:'var(--mt)' }}>✕</button>
                  </form>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{contact?.name || contact?.wa_number}</div>
                    <button onClick={()=>{setNameInput(contact?.name||'');setEditingName(true)}} title="Edit name" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--mt)', fontSize:13, padding:'2px 4px', borderRadius:4, lineHeight:1 }}>✏️</button>
                  </div>
                )}
                <div className="chat-online">● {contact?.wa_number}</div>
              </div>
              <div className="chat-acts">
                <button className="abtn" onClick={() => setCreateModal({contact, msgs})}>🛒 Create Order</button>
              </div>
            </div>
            <div className="msgs">
              {msgs.map((m,i) => (
                <div key={i}
                  className={`msg ${m.direction==='inbound'?'in':'out'}`}
                  style={{ position:'relative' }}
                  onMouseEnter={() => m.direction==='inbound' && m.body && setHoveredMsg(i)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  {m.direction==='inbound' && <div className="ms">{contact?.name || contact?.wa_number}</div>}
                  <div className="mb">{m.body || '[media message]'}</div>
                  <div className="mt2">{fmtTime(m.created_at)}{m.direction==='outbound'&&' ✓✓'}</div>
                  {hoveredMsg === i && m.direction === 'inbound' && m.body && (
                    <button
                      onClick={() => setCreateModal({ contact, msgs: [m] })}
                      style={{
                        position:'absolute', top:-10, right:-8,
                        background:'#0A6640', color:'white', border:'none',
                        borderRadius:20, padding:'4px 10px', fontSize:11,
                        fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                        boxShadow:'0 2px 8px rgba(0,0,0,0.2)', zIndex:10,
                        fontFamily:'var(--f)'
                      }}
                    >
                      🛒 Order this
                    </button>
                  )}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            {/* Quick Reply Templates */}
            {showTemplates && (
              <div style={{ background:'white', borderTop:'1px solid #E4EDE6', padding:'10px 12px', maxHeight:200, overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#6B7F72', textTransform:'uppercase', letterSpacing:0.5 }}>Quick Replies</span>
                  <button onClick={() => setShowTemplates(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:16, padding:0 }}>×</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => { setReply(t.text); setShowTemplates(false) }}
                      style={{ textAlign:'left', padding:'8px 12px', borderRadius:8, border:'1.5px solid #E4EDE6', background:'#FAFAF7', cursor:'pointer', fontFamily:'var(--f)', fontSize:13, color:'#1A2E22', transition:'all .15s' }}
                      onMouseOver={e => { e.currentTarget.style.background='#E8F5E9'; e.currentTarget.style.borderColor='#0A6640' }}
                      onMouseOut={e => { e.currentTarget.style.background='#FAFAF7'; e.currentTarget.style.borderColor='#E4EDE6' }}
                    >
                      <div style={{ fontWeight:600, fontSize:12, color:'#0A6640', marginBottom:2 }}>{t.label}</div>
                      <div style={{ color:'#6B7F72', fontSize:12 }}>{t.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="cinput-bar" style={{ alignItems:'flex-end' }}>
              <button
                onClick={() => setShowTemplates(v => !v)}
                title="Quick replies"
                style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 6px', color: showTemplates ? '#0A6640' : '#9CA3AF', fontSize:18, flexShrink:0 }}
              >⚡</button>
              <textarea className="cinput" rows={1} placeholder={`Reply to ${contact?.name || contact?.wa_number}...`} value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
              <button className="sbtn" onClick={send} disabled={sending}>{sending ? <Spinner /> : '▶'}</button>
            </div>
          </>
        )}
      </div>

    </div>

    {createModal && <CreateOrderModal contact={createModal.contact} msgs={createModal.msgs} onClose={() => setCreateModal(null)} onCreated={handleCreateOrder} />}
  </>
  )
}

// ─── PRINT INVOICE MODAL ──────────────────────────────────────────────────────
function PrintInvoiceModal({ order, onClose }) {
  const printRef = useRef()
  const print = () => {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Invoice ${order.order_number}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; color: #111; padding: 40px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #0A6640; }
        .brand { font-size:22px; font-weight:800; color:#0A6640; }
        .brand-sub { font-size:11px; color:#6B7F72; margin-top:2px; }
        .inv-title { font-size:13px; color:#6B7F72; text-align:right; }
        .inv-num { font-size:20px; font-weight:800; color:#111; }
        .section { margin-bottom:24px; }
        .section-title { font-size:11px; font-weight:700; color:#6B7F72; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
        .customer-name { font-size:16px; font-weight:700; }
        .customer-phone { font-size:13px; color:#6B7F72; margin-top:2px; }
        table { width:100%; border-collapse:collapse; margin-bottom:20px; }
        th { background:#F0FAF5; color:#0A6640; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; padding:10px 12px; text-align:left; border-bottom:1px solid #BBE0CC; }
        td { padding:10px 12px; border-bottom:1px solid #F0F0F0; font-size:13px; }
        .total-row td { font-weight:700; font-size:15px; border-bottom:none; padding-top:14px; }
        .status-row { display:flex; gap:12px; margin-top:20px; }
        .badge { padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; }
        .paid { background:#D1FAE5; color:#065F46; }
        .unpaid { background:#FEF3C7; color:#92400E; }
        .footer { margin-top:40px; padding-top:16px; border-top:1px solid #E4EDE6; font-size:11px; color:#9CA3AF; text-align:center; }
      </style></head><body>
      <div class="header">
        <div><div class="brand">Whats-Order</div><div class="brand-sub">Order Management</div></div>
        <div><div class="inv-title">INVOICE</div><div class="inv-num">${order.order_number}</div><div style="font-size:12px;color:#6B7F72;margin-top:4px;">${new Date(order.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Bill To</div>
        <div class="customer-name">${order.contact?.name || 'Customer'}</div>
        <div class="customer-phone">${order.contact?.wa_number || ''}</div>
      </div>
      <div class="section">
        <div class="section-title">Order Items</div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th style="text-align:right">Price (₹)</th></tr></thead>
          <tbody>
            ${(order.items||[]).map((item,i) => `
              <tr>
                <td style="color:#9CA3AF">${i+1}</td>
                <td style="font-weight:600">${item.name}</td>
                <td>${item.qty}</td>
                <td style="color:#6B7F72">${item.unit||'—'}</td>
                <td style="text-align:right">${item.price ? '₹'+Number(item.price).toLocaleString('en-IN') : '—'}</td>
              </tr>`).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align:right;color:#6B7F72;font-size:13px;">Total Amount</td>
              <td style="text-align:right;color:#0A6640">₹${Number(order.total_amount||0).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        <div class="status-row">
          <span class="badge ${order.payment_status==='paid'?'paid':'unpaid'}">${order.payment_status==='paid'?'✓ Paid':'⏳ Payment Pending'}</span>
          <span class="badge" style="background:#F3F4F6;color:#374151">${order.status?.toUpperCase()}</span>
        </div>
      </div>
      <div class="footer">Generated by Whats-Order • ${new Date().toLocaleString('en-IN')}</div>
      </body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:'#0F1A14' }}>Invoice Preview</div>
            <div style={{ fontSize:13, color:'#6B7F72', marginTop:2 }}>{order.order_number} • {order.contact?.name || order.contact?.wa_number}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>

        {/* Preview */}
        <div style={{ background:'#F9FAFB', border:'1px solid #E4EDE6', borderRadius:10, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, paddingBottom:12, borderBottom:'2px solid #0A6640' }}>
            <div style={{ fontWeight:800, color:'#0A6640', fontSize:16 }}>Whats-Order</div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'#6B7F72' }}>INVOICE</div>
              <div style={{ fontWeight:800, fontSize:15 }}>{order.order_number}</div>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'#6B7F72', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Bill To</div>
            <div style={{ fontWeight:700 }}>{order.contact?.name || 'Customer'}</div>
            <div style={{ fontSize:12, color:'#6B7F72' }}>{order.contact?.wa_number}</div>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr style={{ background:'#F0FAF5' }}>
              <th style={{ padding:'6px 8px', textAlign:'left', color:'#0A6640', fontSize:11 }}>Item</th>
              <th style={{ padding:'6px 8px', textAlign:'center', color:'#0A6640', fontSize:11 }}>Qty</th>
              <th style={{ padding:'6px 8px', textAlign:'right', color:'#0A6640', fontSize:11 }}>Price</th>
            </tr></thead>
            <tbody>
              {(order.items||[]).map((item,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #F0F0F0' }}>
                  <td style={{ padding:'6px 8px', fontWeight:600 }}>{item.name}</td>
                  <td style={{ padding:'6px 8px', textAlign:'center', color:'#6B7F72' }}>{item.qty}{item.unit?' '+item.unit:''}</td>
                  <td style={{ padding:'6px 8px', textAlign:'right' }}>{item.price ? '₹'+Number(item.price).toLocaleString('en-IN') : '—'}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ padding:'10px 8px', textAlign:'right', fontWeight:700, color:'#6B7F72', fontSize:12 }}>Total</td>
                <td style={{ padding:'10px 8px', textAlign:'right', fontWeight:800, color:'#0A6640', fontSize:15 }}>₹{Number(order.total_amount||0).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background: order.payment_status==='paid'?'#D1FAE5':'#FEF3C7', color: order.payment_status==='paid'?'#065F46':'#92400E' }}>
              {order.payment_status==='paid'?'✓ Paid':'⏳ Pending'}
            </span>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'#F3F4F6', color:'#374151' }}>
              {order.status?.toUpperCase()}
            </span>
          </div>
        </div>

        <button onClick={print} style={{ width:'100%', padding:'12px', background:'#0A6640', color:'white', border:'none', borderRadius:10, fontFamily:'var(--f)', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          🖨️ Print Invoice
        </button>
      </div>
    </div>
  )
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
// ─── EDIT ORDER MODAL ────────────────────────────────────────────────────────
function EditOrderModal({ order, onClose, onSaved }) {
  const [items, setItems] = useState(() => (order.items || []).map(i => ({ name:i.name, qty:i.qty, unit:i.unit||'', price:i.unit_price||0 })))
  const [notes, setNotes] = useState(order.notes || '')
  const [loading, setLoading] = useState(false)
  const total = items.reduce((s,i) => s + i.qty * i.price, 0)
  const upd = (i,f,v) => { const n=[...items]; n[i]={...n[i],[f]:(f==='name'||f==='unit')?v:Number(v)}; setItems(n) }
  const submit = async () => {
    setLoading(true)
    try { await api.updateOrderItems(order.id, items.filter(i=>i.name.trim()), notes); onSaved() }
    catch { alert('Failed to update order') }
    finally { setLoading(false) }
  }
  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
          <div><div className="mt">Edit Order</div><div className="ms2">{order.order_number} · {order.contact?.name || order.contact?.wa_number}</div></div>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:'#6B7080', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Items</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 56px 80px 72px 32px', gap:8, marginBottom:4 }}>
          {['Item','Qty','Unit','₹ Price',''].map((h,i) => (
            <div key={i} style={{ fontSize:11, color:'#9CA3AF', fontWeight:600, textAlign:i>=1?'center':'left' }}>{h}</div>
          ))}
        </div>
        {items.map((item,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 56px 80px 72px 32px', gap:8, marginBottom:8 }}>
            <input className="inp" value={item.name} onChange={e=>upd(i,'name',e.target.value)} style={{ padding:'8px 10px' }} />
            <input className="inp" type="number" min="1" value={item.qty} onChange={e=>upd(i,'qty',e.target.value)} style={{ padding:'8px 6px', textAlign:'center' }} />
            <input className="inp" value={item.unit} onChange={e=>upd(i,'unit',e.target.value)} style={{ padding:'8px 6px', textAlign:'center' }} />
            <input className="inp" type="number" min="0" value={item.price||''} onChange={e=>upd(i,'price',e.target.value)} style={{ padding:'8px 6px', textAlign:'right' }} />
            <button onClick={() => setItems(items.filter((_,j)=>j!==i))} style={{ border:'none', background:'#FFF5F5', borderRadius:8, cursor:'pointer', color:'#EF4444', fontSize:16 }}>×</button>
          </div>
        ))}
        <button onClick={() => setItems([...items,{name:'',qty:1,unit:'',price:0}])} style={{ fontSize:13, color:'#0A6640', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:'4px 0', marginBottom:12 }}>+ Add item</button>
        <div className="fg">
          <label className="lbl">Notes</label>
          <input className="inp" value={notes} onChange={e=>setNotes(e.target.value)} style={{ padding:'8px 12px' }} />
        </div>
        <div style={{ fontSize:18, fontWeight:800, textAlign:'right', color:'var(--dk)', marginBottom:16 }}>Total: ₹{total.toLocaleString('en-IN')}</div>
        <button className="btn" onClick={submit} disabled={loading || !items.some(i=>i.name.trim())}>
          {loading ? <><Spinner /> Saving...</> : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

function OrdersView({ addToast }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [upiModal, setUpiModal] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [printModal, setPrintModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [showTopItems, setShowTopItems] = useState(true)

  const load = useCallback(async () => {
    try {
      const [ords, st] = await Promise.all([api.getOrders(), api.getStats()])
      setOrders(ords)
      setStats(st)
    } catch { addToast('Failed to load orders', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const advance = async (order) => {
    const nextIdx = STATUS_FLOW.indexOf(order.status) + 1
    if (nextIdx >= STATUS_FLOW.length) return
    const next = STATUS_FLOW[nextIdx]
    try {
      await api.updateOrderStatus(order.id, next)
      addToast(`Order ${order.order_number} → ${next}. Customer notified on WhatsApp.`, 'wa')
      load()
    } catch (e) { addToast(e.error || 'Failed to update', 'error') }
  }

  const [cancelTarget, setCancelTarget] = useState(null)
  const cancel = async (order) => {
    setCancelTarget(order)
  }
  const confirmCancel = async () => {
    const order = cancelTarget
    setCancelTarget(null)
    if (!order) return
    try {
      await api.cancelOrder(order.id)
      addToast(`Order ${order.order_number} cancelled. Customer notified.`, 'wa')
      load()
    } catch (e) { addToast(e.error || 'Failed to cancel', 'error') }
  }

  const sendUPI = async (orderId, vpa) => {
    try {
      const r = await api.sendUPILink(orderId, vpa)
      setUpiModal(null)
      addToast('UPI payment link sent to customer on WhatsApp.', 'wa')
    } catch (e) { addToast(e.error || 'Failed to send UPI', 'error') }
  }

  const confirmPay = async (orderId, amount, method, ref) => {
    try {
      await api.confirmPayment(orderId, amount, method, ref)
      setPayModal(null)
      addToast('Payment confirmed!', 'success')
      load()
    } catch (e) { addToast(e.error || 'Failed to confirm', 'error') }
  }

  const filtered = orders.filter(o => {
    if (filter === 'new') return o.status === 'new'
    if (filter === 'active') return ['confirmed','packed','dispatched'].includes(o.status)
    if (filter === 'delivered') return o.status === 'delivered'
    return true
  }).filter(o => {
    if (!searchQ.trim()) return true
    const q = searchQ.toLowerCase()
    return (o.order_number||'').toLowerCase().includes(q) ||
           (o.contact?.name||'').toLowerCase().includes(q) ||
           (o.contact?.wa_number||'').includes(q) ||
           (o.items||[]).some(i => (i.name||'').toLowerCase().includes(q))
  })

  if (loading) return <div style={{ flex:1 }}><Spinner lg /></div>

  const fmtExportDate = d => d ? new Date(d).toLocaleString('en-IN') : ''

  const exportCSV = () => {
    const rows = [
      ['Order No','Customer','Phone','Items','Total (₹)','Status','Payment','Date']
    ]
    orders.forEach(o => {
      rows.push([
        o.order_number,
        o.contact?.name || '',
        o.contact?.wa_number || '',
        (o.items||[]).map(i => `${i.name} x${i.qty}${i.unit?' '+i.unit:''}`).join(' | '),
        o.total_amount || 0,
        o.status,
        o.payment_status,
        fmtExportDate(o.created_at)
      ])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    setExportOpen(false)
    addToast('Orders exported as CSV', 'success')
  }

  const exportExcel = () => {
    // Build a simple HTML table that Excel can open
    const rows = orders.map(o => `
      <tr>
        <td>${o.order_number}</td>
        <td>${o.contact?.name || ''}</td>
        <td>${o.contact?.wa_number || ''}</td>
        <td>${(o.items||[]).map(i => `${i.name} x${i.qty}${i.unit?' '+i.unit:''}`).join(', ')}</td>
        <td>${o.total_amount || 0}</td>
        <td>${o.status}</td>
        <td>${o.payment_status}</td>
        <td>${fmtExportDate(o.created_at)}</td>
      </tr>`).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8">
      <style>td,th{border:1px solid #ccc;padding:6px 10px;font-family:Arial;}th{background:#0A6640;color:white;font-weight:bold;}</style>
      </head><body><table>
      <tr><th>Order No</th><th>Customer</th><th>Phone</th><th>Items</th><th>Total (₹)</th><th>Status</th><th>Payment</th><th>Date</th></tr>
      ${rows}</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `orders-${new Date().toISOString().slice(0,10)}.xls`
    a.click(); URL.revokeObjectURL(url)
    setExportOpen(false)
    addToast('Orders exported as Excel', 'success')
  }

  return (
    <div className="ord-view">
      <div className="ord-hdr">
        <div className="ord-title">Orders</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {[['all','All'],['new','New'],['active','Active'],['delivered','Delivered']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding:'7px 16px', borderRadius:8, border:`1.5px solid ${filter===k?'#0A6640':'#E4EDE6'}`, background:filter===k?'#0A6640':'white', color:filter===k?'white':'#1A2E22', fontFamily:'var(--f)', fontSize:13, fontWeight:600, cursor:'pointer' }}>{l}</button>
          ))}
          {/* Export dropdown */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={orders.length === 0}
              style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #E4EDE6', background:'white', color:'#1A2E22', fontFamily:'var(--f)', fontSize:13, fontWeight:600, cursor:orders.length?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:6, opacity:orders.length?1:0.5 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
            {exportOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'white', border:'1.5px solid #E4EDE6', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:100, minWidth:160, overflow:'hidden' }}
                onMouseLeave={() => setExportOpen(false)}>
                <button onClick={exportCSV} style={{ width:'100%', padding:'11px 16px', border:'none', background:'none', fontFamily:'var(--f)', fontSize:13, fontWeight:600, color:'#1A2E22', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10 }}
                  onMouseOver={e=>e.currentTarget.style.background='#F0FAF5'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                  <span style={{ fontSize:16 }}>📄</span> Export as CSV
                </button>
                <div style={{ height:1, background:'#E4EDE6' }} />
                <button onClick={exportExcel} style={{ width:'100%', padding:'11px 16px', border:'none', background:'none', fontFamily:'var(--f)', fontSize:13, fontWeight:600, color:'#1A2E22', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10 }}
                  onMouseOver={e=>e.currentTarget.style.background='#F0FAF5'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                  <span style={{ fontSize:16 }}>📊</span> Export as Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Orders search bar */}
      <div style={{ padding:'12px 24px 4px', display:'flex' }}>
        <div style={{ position:'relative', width:'100%', maxWidth:340 }}>
          <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search orders, customers, items..."
            style={{ width:'100%', padding:'8px 10px 8px 32px', borderRadius:8, border:'1.5px solid #E4EDE6', fontFamily:'var(--f)', fontSize:13, color:'#1A2E22', outline:'none', background:'white' }} />
          {searchQ && <button onClick={() => setSearchQ('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:16, padding:0 }}>×</button>}
        </div>
      </div>
      <div className="stats-row">
        <div className="stat dark"><div className="sl">Total Orders</div><div className="sv">{stats.total_orders||0}</div><div className="ss">All time</div></div>
        <div className="stat blue"><div className="sl">New</div><div className="sv" style={{ color:'#3B82F6' }}>{stats.new_orders||0}</div><div className="ss">Need attention</div></div>
        <div className="stat amber"><div className="sl">Pending Payment</div><div className="sv" style={{ color:'#D97706' }}>{stats.pending_payment||0}</div><div className="ss">Follow up</div></div>
        <div className="stat green"><div className="sl">Today Revenue</div><div className="sv" style={{ color:'#059669' }}>₹{(stats.today_revenue||0).toLocaleString('en-IN')}</div><div className="ss">Paid orders</div></div>
      </div>
      {/* Top Selling Items */}
      {stats.top_items && stats.top_items.length > 0 && (
        <div style={{ background:'white', border:'1.5px solid #E4EDE6', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showTopItems ? 14 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>🔥</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#0F1A14' }}>Top Selling Items</span>
            </div>
            <button onClick={() => setShowTopItems(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:13 }}>{showTopItems ? '▲ Hide' : '▼ Show'}</button>
          </div>
          {showTopItems && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {stats.top_items.map((item, i) => {
                const maxQty = stats.top_items[0].total_qty
                const pct = Math.round((item.total_qty / maxQty) * 100)
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background: i===0?'#FEF3C7': i===1?'#F3F4F6': i===2?'#FDE8D8':'#F9FAFB', color: i===0?'#92400E':i===1?'#6B7280':i===2?'#C2410C':'#9CA3AF', fontWeight:800, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontWeight:600, fontSize:13, color:'#0F1A14', textTransform:'capitalize' }}>{item.name}</span>
                        <span style={{ fontSize:12, color:'#6B7F72', whiteSpace:'nowrap', marginLeft:8 }}>{item.total_qty} units • {item.order_count} orders</span>
                      </div>
                      <div style={{ height:5, background:'#F0F0F0', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background: i===0?'#0A6640':i===1?'#6B7280':'#BBE0CC', borderRadius:3, transition:'width .5s' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      <div className="ords">
        {filtered.length === 0 && <div style={{ textAlign:'center', padding:'48px 0', color:'#6B7F72', fontSize:14 }}>No orders yet. Create one from the Inbox!</div>}
        {filtered.map(order => {
          const av = avatarFor(order.contact?.name || order.contact?.wa_number)
          const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status)+1]
          return (
            <div key={order.id} className="ocard">
              <div className="ocin">
                <div className="av" style={{ width:44, height:44, background:av.bg, fontSize:14 }}>{av.initials}</div>
                <div className="oi">
                  <div className="on2">{order.order_number}</div>
                  <div className="oc">{order.contact?.name || order.contact?.wa_number}</div>
                  <div className="oit">{order.items?.map(i=>`${i.name} ×${i.qty}`).join(', ')}</div>
                  <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center', flexWrap:'wrap' }}>
                    <StatusBadge status={order.status} />
                    <span className={`pbadge ${order.payment_status==='paid'?'ppaid':'ppen'}`}>{order.payment_status==='paid'?'✓ Paid':'⏳ Unpaid'}</span>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>{fmtTime(order.created_at)}</span>
                  </div>
                </div>
                <div style={{ marginLeft:'auto', paddingRight:4 }}><div className="oa">₹{order.total_amount?.toLocaleString('en-IN')}</div></div>
                <div className="oacts">
                  {nextStatus && order.status!=='cancelled' && (
                    <button className="abtn pr" style={{ fontSize:12 }} onClick={() => advance(order)}>
                      {STATUS_CFG[nextStatus]?.label} →
                    </button>
                  )}
                  {order.payment_status==='pending' && order.status!=='cancelled' && (
                    <>
                      <button className="abtn" style={{ fontSize:12 }} onClick={() => setUpiModal(order)}>💳 UPI</button>
                      <button className="abtn" style={{ fontSize:12, color:'#059669' }} onClick={() => setPayModal(order)}>✓ Paid</button>
                    </>
                  )}
                  {['new','confirmed'].includes(order.status) && (
                    <button className="abtn" style={{ fontSize:12, color:'#EF4444' }} onClick={() => setCancelTarget(order)}>Cancel</button>
                  )}
                  <button className="abtn" style={{ fontSize:12 }} onClick={() => setEditModal(order)} title="Edit Order">✏️</button>
                  <button className="abtn" style={{ fontSize:12 }} onClick={() => setPrintModal(order)} title="Print Invoice">🖨️</button>
                </div>
              </div>
              <StatusBar status={order.status} />
            </div>
          )
        })}
      </div>
      {upiModal && <UPIModal order={upiModal} onClose={() => setUpiModal(null)} onSent={sendUPI} />}
      {payModal && <PaymentModal order={payModal} onClose={() => setPayModal(null)} onConfirm={confirmPay} />}
      {printModal && <PrintInvoiceModal order={printModal} onClose={() => setPrintModal(null)} />}
      {editModal && <EditOrderModal order={editModal} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); load(); addToast('Order updated!', 'success') }} />}
      {cancelTarget && (
        <div className="ov" onClick={() => setCancelTarget(null)}>
          <div className="modal" style={{ width:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:17, fontWeight:800, color:'var(--dk)', textAlign:'center', marginBottom:8 }}>Cancel Order?</div>
            <div style={{ fontSize:14, color:'var(--mt)', textAlign:'center', marginBottom:24, lineHeight:1.6 }}>
              Cancel <strong>{cancelTarget.order_number}</strong> for {cancelTarget.contact?.name || cancelTarget.contact?.wa_number}?<br/>Customer will be notified on WhatsApp.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setCancelTarget(null)} style={{ flex:1, padding:'11px', background:'white', border:'1.5px solid var(--bd)', borderRadius:9, fontFamily:'var(--f)', fontSize:14, fontWeight:600, cursor:'pointer', color:'var(--mt)' }}>Keep Order</button>
              <button onClick={confirmCancel} style={{ flex:1, padding:'11px', background:'#EF4444', border:'none', borderRadius:9, fontFamily:'var(--f)', fontSize:14, fontWeight:700, cursor:'pointer', color:'white' }}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── CHANGE PASSWORD FORM ─────────────────────────────────────────────────────
function ChangePasswordForm({ onDone }) {
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [conf, setConf] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async () => {
    if (nw !== conf) { setMsg({ type:'err', text:'New passwords do not match' }); return }
    if (nw.length < 8) { setMsg({ type:'err', text:'Password must be at least 8 characters' }); return }
    setLoading(true); setMsg(null)
    try {
      await api.changePassword(cur, nw)
      setMsg({ type:'ok', text:'Password changed successfully!' })
      setCur(''); setNw(''); setConf('')
      setTimeout(() => onDone?.(), 1200)
    } catch(e) {
      setMsg({ type:'err', text: e.error || 'Failed to change password' })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding:'12px 0 16px' }}>
      {msg && <div style={{ fontSize:13, padding:'8px 12px', borderRadius:8, marginBottom:12, background:msg.type==='ok'?'#ECFDF5':'#FFF5F5', color:msg.type==='ok'?'#059669':'#DC2626', border:`1px solid ${msg.type==='ok'?'#A7F3D0':'#FCA5A5'}` }}>{msg.text}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <label className="lbl" style={{ marginBottom:4 }}>Current Password</label>
          <input className="inp" type="password" value={cur} onChange={e=>setCur(e.target.value)} placeholder="Enter current password" style={{ padding:'9px 12px' }} />
        </div>
        <div>
          <label className="lbl" style={{ marginBottom:4 }}>New Password</label>
          <input className="inp" type="password" value={nw} onChange={e=>setNw(e.target.value)} placeholder="At least 8 characters" style={{ padding:'9px 12px' }} />
        </div>
        <div>
          <label className="lbl" style={{ marginBottom:4 }}>Confirm New Password</label>
          <input className="inp" type="password" value={conf} onChange={e=>setConf(e.target.value)} placeholder="Repeat new password" style={{ padding:'9px 12px' }} />
        </div>
        <button onClick={submit} disabled={loading || !cur || !nw || !conf}
          style={{ padding:'10px', background:'var(--g)', color:'white', border:'none', borderRadius:9, fontFamily:'var(--f)', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(!cur||!nw||!conf)?0.5:1, marginTop:4 }}>
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  )
}

// ─── SECURITY SECTION ────────────────────────────────────────────────────────
function SecuritySection() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ background:'white', borderRadius:16, marginBottom:16, border:'1px solid #E4EDE6', overflow:'hidden' }}>
      {/* Header row — always visible */}
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:15 }}>🔒</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#0F1A14' }}>Password</div>
            <div style={{ fontSize:12, color:'#9CA3AF', marginTop:1 }}>Last changed: unknown</div>
          </div>
        </div>
        <button style={{ background: open ? '#F0F4F1' : '#F7F8F6', border:'1px solid #E4EDE6', borderRadius:8, padding:'6px 14px', fontFamily:'var(--f)', fontSize:12, fontWeight:700, color:'#374151', cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap' }}>
          {open ? 'Cancel' : 'Change Password'}
        </button>
      </div>

      {/* Collapsible form */}
      {open && (
        <div style={{ borderTop:'1px solid #F0F4F1', padding:'4px 20px 16px' }}>
          <ChangePasswordForm onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

// ─── PROFILE VIEW ─────────────────────────────────────────────────────────────
function ProfileView({ user, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState('')

  useEffect(() => {
    Promise.all([api.getMe(), api.getStats()])
      .then(([p, s]) => { setProfile(p); setStats(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const av = avatarFor(user?.name || user?.email || 'U')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '—'
  const copy = (val, key) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  const Section = ({ title, icon, children }) => (
    <div style={{ background:'white', borderRadius:16, marginBottom:16, border:'1px solid #E4EDE6', overflow:'hidden' }}>
      <div style={{ padding:'14px 20px 12px', borderBottom:'1px solid #F0F4F1', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:15 }}>{icon}</span>
        <span style={{ fontSize:12, fontWeight:800, color:'#374151', textTransform:'uppercase', letterSpacing:.8 }}>{title}</span>
      </div>
      <div style={{ padding:'4px 0' }}>{children}</div>
    </div>
  )

  const Row = ({ label, value, mono, copyKey }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid #F7F8F6' }}>
      <span style={{ fontSize:13, color:'#6B7F72', fontWeight:500, flexShrink:0 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
        <span style={{ fontSize: mono?11.5:13.5, fontWeight:600, color:'#0F1A14', fontFamily: mono?'monospace':'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{value || '—'}</span>
        {copyKey && value && (
          <button onClick={() => copy(value, copyKey)} title="Copy" style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', borderRadius:4, color: copied===copyKey ? '#0A6640' : '#9CA3AF', fontSize:12, flexShrink:0 }}>
            {copied===copyKey ? '✓' : '⧉'}
          </button>
        )}
      </div>
    </div>
  )

  const isActive = profile?.onboarding_status === 'active'

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#F7F8F6' }} className="profile-wrap">

      {/* ── Hero banner ── */}
      <div style={{ background:'linear-gradient(135deg,#0C1710 0%,#1A3A24 100%)', padding:'32px 28px 28px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:.035, backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)', backgroundSize:'28px 28px' }} />
        <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, background:'radial-gradient(circle,rgba(16,185,129,.15) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ width:68, height:68, borderRadius:'50%', background:av.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:900, color:'#0F1A14', border:'3px solid rgba(255,255,255,.12)', flexShrink:0, boxShadow:'0 8px 24px rgba(0,0,0,.3)' }}>{av.initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:21, fontWeight:900, color:'white', letterSpacing:-0.4, marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.name || user?.name || user?.email?.split('@')[0]}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(16,185,129,.18)', color:'#10B981', fontWeight:700, textTransform:'uppercase', letterSpacing:.3 }}>{profile?.role || 'Owner'}</span>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background: isActive ? 'rgba(16,185,129,.18)' : 'rgba(245,158,11,.18)', color: isActive ? '#10B981' : '#F59E0B', fontWeight:700, letterSpacing:.3 }}>
                {isActive ? '● Connected' : '○ Not connected'}
              </span>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:.3 }}>
                {profile?.plan === 'pro' ? '⭐ Pro' : 'Free'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:24, position:'relative', zIndex:1 }}>
            {[
              { label:'Total Orders', value: stats.total_orders || 0, color:'#10B981' },
              { label:'This Month', value: stats.new_orders || 0, color:'#60A5FA' },
              { label:'Revenue Today', value: `₹${(stats.today_revenue||0).toLocaleString('en-IN')}`, color:'#FBBF24' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.06)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(255,255,255,.07)', backdropFilter:'blur(8px)' }}>
                <div style={{ fontSize:18, fontWeight:900, color:s.color, letterSpacing:-0.5 }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2, fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding:'20px 20px 32px', maxWidth:600, margin:'0 auto' }}>
        {loading ? <div style={{ textAlign:'center', padding:60 }}><Spinner lg /></div> : (
          <>
            {/* Account */}
            <Section title="Account" icon="👤">
              <Row label="Full Name"  value={profile?.name} />
              <Row label="Email"      value={profile?.email} />
              <Row label="Role"       value={profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)} />
              <Row label="Member Since" value={fmtDate(profile?.activated_at)} />
            </Section>

            {/* Business */}
            <Section title="Business" icon="🏪">
              <Row label="Business Name"    value={profile?.business_name} />
              <Row label="WhatsApp Number"  value={profile?.whatsapp_number} copyKey="phone" />
              <Row label="WABA ID"          value={profile?.waba_id} mono copyKey="waba" />
              <Row label="Connection"       value={isActive ? 'Connected ✓' : (profile?.onboarding_status || 'Pending')} />
            </Section>

            {/* Plan */}
            <div style={{ marginBottom:16 }}>
              {profile?.plan !== 'pro' ? (
                <div style={{ background:'white', borderRadius:16, border:'1px solid #E4EDE6', overflow:'hidden' }}>
                  <div style={{ padding:'14px 20px 12px', borderBottom:'1px solid #F0F4F1', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15 }}>💳</span>
                    <span style={{ fontSize:12, fontWeight:800, color:'#374151', textTransform:'uppercase', letterSpacing:.8 }}>Plan</span>
                  </div>
                  <div style={{ padding:20 }}>
                    {/* Free plan usage bar */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:800, color:'#0F1A14' }}>Free Plan</span>
                        <span style={{ fontSize:11, fontWeight:700, color:'#0A6640', background:'#E8F5E9', padding:'2px 8px', borderRadius:20, marginLeft:8 }}>50 orders/month FREE</span>
                      </div>
                      <span style={{ fontSize:12, color:'#6B7F72' }}>{stats?.total_orders||0} / 50 used</span>
                    </div>
                    <div style={{ height:6, background:'#F0F4F1', borderRadius:3, marginBottom:20, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(((stats?.total_orders||0)/50)*100,100)}%`, background: (stats?.total_orders||0) >= 45 ? '#EF4444' : (stats?.total_orders||0) >= 35 ? '#F59E0B' : '#0A6640', borderRadius:3, transition:'width .6s' }} />
                    </div>
                    {/* Upgrade card */}
                    <div style={{ background:'linear-gradient(135deg,#0A6640,#0D8A52)', borderRadius:12, padding:18, color:'white', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, background:'rgba(255,255,255,.05)', borderRadius:'50%' }} />
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, opacity:.7, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>Upgrade to</div>
                          <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.3 }}>Pro Plan</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>₹299</div>
                          <div style={{ fontSize:11, color:'#86EFAC', fontWeight:700 }}>/ 3 months</div>
                          <div style={{ fontSize:11, opacity:.5, marginTop:1 }}>₹100/month</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
                        {['Unlimited orders','Priority support','All features'].map((f,i) => (
                          <span key={i} style={{ fontSize:12, display:'flex', alignItems:'center', gap:5, opacity:.9 }}><span style={{ color:'#86EFAC' }}>✓</span>{f}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => window.open('mailto:whatsorder.help@gmail.com?subject=Upgrade to Pro&body=I would like to upgrade to the Pro plan (₹299 for 3 months) for my account: ' + (profile?.email||''), '_blank')}
                        style={{ width:'100%', padding:'11px', background:'white', color:'#0A6640', border:'none', borderRadius:9, fontFamily:'var(--f)', fontSize:14, fontWeight:800, cursor:'pointer', transition:'opacity .15s' }}
                        onMouseOver={e=>e.currentTarget.style.opacity='.9'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>
                        Upgrade Now →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background:'linear-gradient(135deg,#0A6640,#0D8A52)', borderRadius:16, padding:20, color:'white', border:'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, opacity:.7, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>Current Plan</div>
                      <div style={{ fontSize:22, fontWeight:900 }}>Pro ⭐</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:18, fontWeight:900 }}>₹299<span style={{ fontSize:12, fontWeight:500, opacity:.6 }}> / 3 months</span></div>
                      <span style={{ fontSize:11, background:'rgba(255,255,255,.15)', padding:'3px 10px', borderRadius:20, fontWeight:700 }}>Active</span>
                    </div>
                  </div>
                  {['Unlimited orders','Priority support','All features included'].map((f,i)=>(
                    <div key={i} style={{ fontSize:13, display:'flex', alignItems:'center', gap:8, marginBottom:4, opacity:.9 }}><span style={{ color:'#86EFAC' }}>✓</span>{f}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Security */}
            <SecuritySection />

            {/* Sign out */}
            <button onClick={onLogout}
              style={{ width:'100%', padding:'13px', background:'white', color:'#DC2626', border:'1.5px solid #FECACA', borderRadius:12, fontFamily:'var(--f)', fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
              onMouseOver={e=>e.currentTarget.style.background='#FFF5F5'}
              onMouseOut={e=>e.currentTarget.style.background='white'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ user, onNav }) {
  const [stats, setStats] = useState({})
  useEffect(() => {
    api.getStats().then(s => setStats(s)).catch(() => {})
  }, [])
  const av = avatarFor(user?.name || user?.email || 'U')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#F7F8F6' }} className="home-wrap">
      {/* Hero banner */}
      <div style={{ background:'linear-gradient(135deg, #0A6640 0%, #0D8A52 60%, #10B981 100%)', padding:'36px 36px 40px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:.06, backgroundImage:'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize:'24px 24px' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:av.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#0F1A14', border:'3px solid rgba(255,255,255,.3)', flexShrink:0 }}>{av.initials}</div>
            <div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', fontWeight:600, marginBottom:2 }}>{greeting} 👋</div>
              <div style={{ fontSize:22, fontWeight:900, color:'white', letterSpacing:-0.5 }}>{user?.name || user?.email?.split('@')[0]}</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Total Orders', value: stats.total_orders || 0, sub:'All time', icon:'📦' },
              { label:'New Orders', value: stats.new_orders || 0, sub:'Need attention', icon:'🔔' },
              { label:"Today's Revenue", value: '₹' + (stats.today_revenue || 0).toLocaleString('en-IN'), sub:'Paid orders', icon:'💰' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:12, padding:'14px 16px', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,.15)' }}>
                <div style={{ fontSize:18, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:900, color:'white', letterSpacing:-0.5 }}>{s.value}</div>
                <div style={{ fontSize:11.5, color:'rgba(255,255,255,.65)', marginTop:2, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding:'24px 28px 0' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#7A8E82', textTransform:'uppercase', letterSpacing:.6, marginBottom:12 }}>Quick actions</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
          {[
            { icon:'💬', label:'Open Inbox', sub:'View WhatsApp messages', view:'inbox', color:'#3B82F6', bg:'#EFF6FF' },
            { icon:'📋', label:'View Orders', sub:'Manage all orders', view:'orders', color:'#0A6640', bg:'#ECFDF5' },
          ].map((a,i) => (
            <button key={i} onClick={() => onNav(a.view)}
              style={{ background:'white', border:'1px solid #E2EBE4', borderRadius:12, padding:'16px', cursor:'pointer', textAlign:'left', transition:'all .15s', display:'flex', gap:12, alignItems:'center', fontFamily:'var(--f)' }}
              onMouseOver={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}
              onMouseOut={e => e.currentTarget.style.boxShadow='none'}>
              <div style={{ width:42, height:42, borderRadius:10, background:a.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{a.icon}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'#0C1710', marginBottom:2 }}>{a.label}</div>
                <div style={{ fontSize:12, color:'#7A8E82' }}>{a.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* About section */}
        <div style={{ fontSize:12, fontWeight:700, color:'#7A8E82', textTransform:'uppercase', letterSpacing:.6, marginBottom:12 }}>About Whats-Order</div>
        <div style={{ background:'white', border:'1px solid #E2EBE4', borderRadius:14, overflow:'hidden', marginBottom:24 }}>
          {[
            { icon:'📲', title:'Receive orders from WhatsApp', desc:'Customers message your WhatsApp Business number. Messages appear in your inbox in real time.' },
            { icon:'🛒', title:'Convert messages into orders', desc:'One click to turn any message into a tracked order with items, quantity, and price.' },
            { icon:'🚀', title:'Update customers automatically', desc:'When you advance an order status, we notify the customer on WhatsApp instantly.' },
            { icon:'📊', title:'Track revenue and analytics', desc:'See your top-selling items, daily revenue, and order stats at a glance.' },
            { icon:'🖨️', title:'Print invoices', desc:'Generate professional invoice PDFs for any order in one click.' },
          ].map((f, i, arr) => (
            <div key={i} style={{ display:'flex', gap:14, padding:'16px 18px', borderBottom: i<arr.length-1 ? '1px solid #F0F4F1' : 'none' }}>
              <div style={{ width:38, height:38, borderRadius:9, background:'#F0FAF5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13.5, color:'#0C1710', marginBottom:3 }}>{f.title}</div>
                <div style={{ fontSize:12.5, color:'#7A8E82', lineHeight:1.55 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div style={{ display:'flex', gap:16, paddingBottom:28 }}>
          {[['Privacy Policy','/privacy'],['Terms of Service','/terms'],['whatsorder.help@gmail.com','mailto:whatsorder.help@gmail.com']].map(([label,href],i) => (
            <a key={i} href={href} target="_blank" style={{ fontSize:12, color:'#7A8E82', textDecoration:'none', fontWeight:600 }}
              onMouseOver={e=>e.currentTarget.style.color='#0A6640'} onMouseOut={e=>e.currentTarget.style.color='#7A8E82'}>{label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('home')
  const [dark, setDark] = useState(() => localStorage.getItem('wo_dark') === '1')
  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('wo_dark', dark ? '1' : '0')
  }, [dark])
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((msg, type='success', action=null) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type, action }])
  }, [])
  const removeToast = id => setToasts(t => t.filter(x => x.id!==id))
  const av = avatarFor(user?.name || user?.email || 'U')

  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)

  // Orders badge: poll stats independently (lightweight)
  useEffect(() => {
    const refresh = async () => {
      try { const s = await api.getStats(); setPendingOrders(s.new_orders || 0) } catch {}
    }
    refresh()
    const t = setInterval(refresh, 10000)
    return () => clearInterval(t)
  }, [])

  const handleUnreadChange = useCallback((n) => setUnreadCount(n), [])

  const NAV = [
    { id:'inbox', icon:'💬', label:'Inbox', badge: view === 'inbox' ? 0 : unreadCount },
    { id:'orders', icon:'📋', label:'Orders', badge: view === 'orders' ? 0 : pendingOrders },
  ]

  return (
    <div className="layout">
      <div className="sidebar">
        {/* Brand */}
        <div className="sb-header">
          <div className="sb-logo" onClick={() => setView('home')}>W</div>
          <div className="sb-brand">Whats<span>-</span>Order</div>
        </div>

        {/* Nav */}
        <div className="sb-nav">
          {NAV.map(n => (
            <button key={n.id} className={`sb-item ${view===n.id?'on':''}`} onClick={() => setView(n.id)}>
              <span className="sb-icon">{n.icon}</span>
              <span className="sb-label">{n.label}</span>
              {n.badge > 0 && <span className="sb-badge">{n.badge}</span>}
            </button>
          ))}
        </div>

        {/* Footer user */}
        <div className="sb-footer">
          <button onClick={() => setDark(d => !d)} title={dark ? 'Light mode' : 'Dark mode'}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', marginBottom:4, fontFamily:'var(--f)', transition:'background .15s' }}
            onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
            onMouseOut={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ fontSize:16 }}>{dark ? '☀️' : '🌙'}</span>
            <span className="sb-dark-label" style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.45)' }}>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <div className="sb-user" onClick={() => setView('profile')}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:av.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#0F1A14', flexShrink:0, border: view==='profile' ? '2px solid #10B981' : '2px solid transparent' }}>{av.initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="sb-uname">{user?.name || 'Account'}</div>
              <div className="sb-uemail">{user?.email}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </div>

      {view==='home'    && <HomeView user={user} onNav={setView} />}
      {view==='inbox'   && <InboxView addToast={addToast} onNavOrders={() => setView('orders')} onUnreadChange={handleUnreadChange} />}
      {view==='orders'  && <OrdersView addToast={addToast} />}
      {view==='profile' && <ProfileView user={user} onLogout={onLogout} />}

      {/* ── Mobile bottom nav ── */}
      <nav className="mob-nav">
        {[
          { id:'home',    icon:'🏠', label:'Home'    },
          { id:'inbox',   icon:'💬', label:'Inbox',   badge: unreadCount },
          { id:'orders',  icon:'📋', label:'Orders',  badge: view==='orders' ? 0 : pendingOrders },
          { id:'profile', icon:'👤', label:'Profile'  },
        ].map(n => (
          <button key={n.id} className={`mob-nav-item${view===n.id?' on':''}`} onClick={() => setView(n.id)}>
            {n.badge > 0 && <span className="mob-nav-badge">{n.badge}</span>}
            <span className="mob-nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} action={t.action} onDone={() => removeToast(t.id)} />)}
    </div>
  )
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ onLogin, onSignup, onBack, onSetupGuide }) {
  useEffect(() => {
    document.body.classList.add('scrollable')
    document.querySelector('.app')?.classList.add('scrollable')
    return () => {
      document.body.classList.remove('scrollable')
      document.querySelector('.app')?.classList.remove('scrollable')
    }
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#060E09', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'white' }}>

      {/* ── Navbar ── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, padding:'0 5vw', display:'flex', alignItems:'center', justifyContent:'space-between', height:68, background:'rgba(6,14,9,0.85)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, background:'linear-gradient(135deg,#0A6640,#10B981)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:21, letterSpacing:-1, boxShadow:'0 0 20px rgba(16,185,129,0.4)' }}>W</div>
          <span style={{ fontWeight:900, fontSize:17, color:'white', letterSpacing:-0.5 }}>Whats<span style={{ color:'#10B981' }}>-</span>Order</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={onSetupGuide} className='lp-nav-login' style={{ background:'transparent', border:'none', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:'8px 14px', borderRadius:8, transition:'all .2s' }}
            onMouseOver={e=>{e.currentTarget.style.color='white'}}
            onMouseOut={e=>{e.currentTarget.style.color='rgba(255,255,255,0.5)'}}>
            Setup Guide
          </button>
          <button onClick={onLogin} className='lp-nav-login' style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.12)', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)', cursor:'pointer', padding:'8px 18px', borderRadius:8, transition:'all .2s' }}
            onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='white'}}
            onMouseOut={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.7)'}}>
            Log in
          </button>
          <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#0D8A52)', color:'white', border:'none', borderRadius:8, padding:'9px 20px', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 0 20px rgba(10,102,64,0.5)', transition:'all .2s' }}
            onMouseOver={e=>e.currentTarget.style.boxShadow='0 0 30px rgba(16,185,129,0.6)'}
            onMouseOut={e=>e.currentTarget.style.boxShadow='0 0 20px rgba(10,102,64,0.5)'}>
            Get Started Free →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ paddingTop:68, minHeight:'100vh', display:'flex', alignItems:'center', position:'relative', boxSizing:'border-box' }}>
        {/* Background glows */}
        <div style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:700, height:700, background:'radial-gradient(circle, rgba(10,102,64,0.25) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'20%', right:'5%', width:300, height:300, background:'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'10%', left:'5%', width:250, height:250, background:'radial-gradient(circle, rgba(10,102,64,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Grid pattern overlay */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'80px 5vw 60px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,460px),1fr))', gap:48, alignItems:'center', width:'100%' }} className='lp-hero-inner'>
          {/* Left */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:600, color:'#10B981', marginBottom:28, letterSpacing:.3 }}>
              <span style={{ width:7, height:7, background:'#10B981', borderRadius:'50%', display:'inline-block', boxShadow:'0 0 6px #10B981' }} />
              Built for WhatsApp Business · India
            </div>
            <h1 style={{ fontSize:'clamp(36px,4.5vw,60px)', fontWeight:900, lineHeight:1.05, letterSpacing:-2, margin:'0 0 24px', color:'white' }} className='lp-h1'>
              Your WhatsApp<br/>
              <span style={{ background:'linear-gradient(90deg,#10B981,#0D8A52)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>order manager</span><br/>
              is here.
            </h1>
            <p style={{ fontSize:17, color:'rgba(255,255,255,0.55)', lineHeight:1.75, margin:'0 0 36px', maxWidth:460 }}>
              Stop copying orders from WhatsApp into notebooks. One platform to receive, track, and fulfill every order — with automatic customer updates.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:32 }} className='lp-hero-btns'>
              <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:10, padding:'14px 28px', fontFamily:'inherit', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 8px 32px rgba(10,102,64,0.5)', letterSpacing:-.3, transition:'transform .15s, box-shadow .15s' }}
                onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(16,185,129,0.5)'}}
                onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 32px rgba(10,102,64,0.5)'}}>
                Start for free →
              </button>
              <button onClick={onLogin} style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'14px 24px', fontFamily:'inherit', fontSize:15, fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='white'}}
                onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='rgba(255,255,255,0.7)'}}>
                Log in
              </button>
            </div>
            <div style={{ display:'flex', gap:12, color:'rgba(255,255,255,0.35)', fontSize:12.5, flexWrap:'wrap' }} className='lp-trust'>
              {['No credit card required','50 orders/month FREE forever','Cancel anytime'].map((t,i)=>(
                <span key={i} style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ color:'#10B981' }}>✓</span>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — mock UI card */}
          <div style={{ position:'relative' }} className='lp-mock-card'>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.6)', backdropFilter:'blur(20px)' }}>
              {/* Mock header */}
              <div style={{ background:'rgba(10,102,64,0.15)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'14px 20px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ display:'flex', gap:6 }}>{['#FF5F57','#FFBD2E','#28C840'].map((c,i)=><div key={i} style={{ width:11,height:11,borderRadius:'50%',background:c }} />)}</div>
                <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:6, height:22, marginLeft:8 }} />
              </div>
              {/* Mock order rows */}
              <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { name:'Priya S.', item:'Idli × 10, Sambar × 2', status:'Confirmed', color:'#10B981', amt:'₹180' },
                  { name:'Ravi K.', item:'Chicken Biryani × 3', status:'Packed', color:'#F59E0B', amt:'₹450' },
                  { name:'Meena T.', item:'Veg Meals × 5', status:'Delivered', color:'#6366F1', amt:'₹375' },
                ].map((o,i)=>(
                  <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:34,height:34,borderRadius:'50%',background:`hsl(${i*80+120},50%,25%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'white',flexShrink:0 }}>{o.name[0]}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'white', marginBottom:2 }}>{o.name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{o.item}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:'white', marginBottom:3 }}>{o.amt}</div>
                      <span style={{ background:`${o.color}22`, color:o.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{o.status}</span>
                    </div>
                  </div>
                ))}
                <div style={{ background:'linear-gradient(135deg,rgba(10,102,64,0.3),rgba(16,185,129,0.1))', border:'1px dashed rgba(16,185,129,0.3)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:13, color:'rgba(16,185,129,0.8)', cursor:'pointer' }}>
                  <span style={{ fontSize:16 }}>+</span> New order from WhatsApp
                </div>
              </div>
              {/* Mock stats bar */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'12px 20px', display:'flex', justifyContent:'space-around' }}>
                {[['12','Orders today'],['₹2,340','Revenue'],['3','Pending']].map(([v,l],i)=>(
                  <div key={i} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:900, color: i===1?'#10B981':'white' }}>{v}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating notification card */}
            <div style={{ marginTop:16, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:14, padding:'10px 16px', display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#0A6640,#10B981)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🚀</div>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:'white' }}>Order dispatched!</div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,0.45)' }}>Customer notified on WhatsApp</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrolling business types ── */}
      <div style={{ background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'16px 0', overflow:'hidden' }}>
        <div style={{ display:'flex', gap:48, animation:'scroll 20s linear infinite', width:'max-content' }}>
          {['🍱 Tiffin Services','🧁 Bakeries','🥬 Grocery Stores','👗 Boutiques','🍔 Cloud Kitchens','💊 Medical Shops','🌸 Flower Shops','🎂 Cake Makers','🧴 Beauty Products','🫙 Pickle & Homemade Food','🍱 Tiffin Services','🧁 Bakeries','🥬 Grocery Stores','👗 Boutiques','🍔 Cloud Kitchens','💊 Medical Shops'].map((b,i)=>(
            <span key={i} style={{ fontSize:13, color:'rgba(255,255,255,0.35)', fontWeight:500, whiteSpace:'nowrap' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'100px 5vw' }} className='lp-section'>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>How it works</div>
          <h2 style={{ fontSize:'clamp(26px,3.5vw,42px)', fontWeight:900, color:'white', margin:0, letterSpacing:-1 }}>From WhatsApp message to fulfilled order</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:32 }} className='lp-steps'>
          {[
            { n:'01', icon:'📲', title:'Customer messages', desc:'They send order on WhatsApp as usual. Nothing changes for them.' },
            { n:'02', icon:'⚡', title:'Auto-detected', desc:'Whats-Order detects order intent and pre-fills items for you.' },
            { n:'03', icon:'📦', title:'Track & notify', desc:'Move through 6 stages. Customer gets WhatsApp updates automatically.' },
            { n:'04', icon:'💳', title:'Collect payment', desc:'Send UPI links via WhatsApp. Mark as paid. Done.' },
          ].map((s,i)=>(
            <div key={i} style={{ padding:'0 20px', textAlign:'center' }}>
              <div style={{ width:56,height:56,borderRadius:16,background:`rgba(10,102,64,${0.15+i*0.05})`,border:'1px solid rgba(16,185,129,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 16px',position:'relative',zIndex:1 }}>
                {s.icon}
                <div style={{ position:'absolute', top:-8, right:-8, width:22, height:22, background:'#10B981', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'white' }}>{s.n}</div>
              </div>
              <div style={{ fontWeight:800, fontSize:14, color:'white', marginBottom:8 }}>{s.title}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ background:'rgba(255,255,255,0.015)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'100px 5vw' }} className='lp-section'>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>Features</div>
            <h2 style={{ fontSize:'clamp(26px,3.5vw,42px)', fontWeight:900, color:'white', margin:0, letterSpacing:-1 }}>Everything in one place</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16 }}>
            {[
              { icon:'💬', title:'Smart Inbox', desc:'All WhatsApp orders in one view. Never miss a message.' },
              { icon:'⚡', title:'Quick Replies', desc:'Saved templates — Order Ready, Dispatched, and more.' },
              { icon:'🛒', title:'1-Click Orders', desc:'Convert any message to a tracked order instantly.' },
              { icon:'🔔', title:'Auto Notifications', desc:'Customers get WhatsApp updates at every stage.' },
              { icon:'💳', title:'UPI Collection', desc:'Send payment links via WhatsApp. Track instantly.' },
              { icon:'🖨️', title:'Invoices', desc:'Clean, professional invoices in one click.' },
              { icon:'📊', title:'Analytics', desc:'Top items, daily revenue, order stats.' },
              { icon:'📤', title:'Export', desc:'Download orders as CSV or Excel anytime.' },
            ].map((f,i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:22, cursor:'default', transition:'all .2s' }}
                onMouseOver={e=>{e.currentTarget.style.background='rgba(10,102,64,0.12)';e.currentTarget.style.borderColor='rgba(16,185,129,0.2)';e.currentTarget.style.transform='translateY(-3px)'}}
                onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{ fontSize:26, marginBottom:10 }}>{f.icon}</div>
                <div style={{ fontWeight:700, fontSize:14, color:'white', marginBottom:6 }}>{f.title}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div style={{ maxWidth:820, margin:'0 auto', padding:'100px 5vw' }} className='lp-section'>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>Pricing</div>
          <h2 style={{ fontSize:'clamp(26px,3.5vw,42px)', fontWeight:900, color:'white', margin:'0 0 12px', letterSpacing:-1 }}>Simple, honest pricing</h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.4)', margin:0 }}>Start free. Upgrade when your business grows.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }} className='lp-pricing'>
          {/* Free */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:32 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Free Plan</div>
            <div style={{ fontSize:48, fontWeight:900, color:'white', lineHeight:1, marginBottom:4 }}>₹0</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, margin:'6px 0 20px', flexWrap:'wrap' }}>
              <span style={{ fontSize:13, fontWeight:800, color:'#10B981', background:'rgba(16,185,129,.15)', padding:'3px 10px', borderRadius:20 }}>50 orders FREE every month</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>No credit card · Forever free</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
              {['50 orders/month — completely free','WhatsApp inbox & replies','6-stage order tracking','Quick reply templates','Invoice printing','Sales analytics'].map((f,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, color:'rgba(255,255,255,0.7)' }}>
                  <span style={{ color:'#10B981', flexShrink:0, fontWeight:700 }}>✓</span>{f}
                </div>
              ))}
            </div>
            <button onClick={onSignup} style={{ width:'100%', padding:'13px', background:'rgba(16,185,129,0.1)', color:'#10B981', border:'1px solid rgba(16,185,129,0.25)', borderRadius:12, fontFamily:'inherit', fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .15s' }}
              onMouseOver={e=>{e.currentTarget.style.background='rgba(16,185,129,0.18)'}}
              onMouseOut={e=>{e.currentTarget.style.background='rgba(16,185,129,0.1)'}}>
              Start for free
            </button>
          </div>
          {/* Pro */}
          <div style={{ background:'linear-gradient(145deg,rgba(10,102,64,0.4),rgba(16,185,129,0.15))', border:'1px solid rgba(16,185,129,0.3)', borderRadius:24, padding:32, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, right:0, background:'linear-gradient(135deg,#0A6640,#10B981)', padding:'6px 20px', fontSize:11, fontWeight:800, letterSpacing:.5, borderRadius:'0 24px 0 14px' }}>POPULAR</div>
            <div style={{ position:'absolute', bottom:-60, right:-60, width:180, height:180, background:'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Pro Plan</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
              <div style={{ fontSize:48, fontWeight:900, color:'white', lineHeight:1 }}>₹299</div>
              <div style={{ fontSize:16, color:'rgba(255,255,255,.5)', fontWeight:500 }}>/ 3 months</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0 20px', flexWrap:'wrap' }}>
              <span style={{ fontSize:13, fontWeight:800, color:'#10B981', background:'rgba(16,185,129,.15)', padding:'3px 10px', borderRadius:20 }}>₹100/month</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>Unlimited orders</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
              {['Unlimited orders','Everything in Free','Priority support','Early access to new features'].map((f,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, color:'rgba(255,255,255,0.85)' }}>
                  <span style={{ color:'#10B981', flexShrink:0, fontWeight:700 }}>✓</span>{f}
                </div>
              ))}
            </div>
            <button onClick={onSignup} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:12, fontFamily:'inherit', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(10,102,64,0.5)', transition:'all .15s' }}
              onMouseOver={e=>{e.currentTarget.style.boxShadow='0 8px 32px rgba(16,185,129,0.5)';e.currentTarget.style.transform='translateY(-1px)'}}
              onMouseOut={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(10,102,64,0.5)';e.currentTarget.style.transform='translateY(0)'}}>
              Get Pro →
            </button>
          </div>
        </div>
      </div>

      {/* ── About us ── */}
      <div style={{ background:'rgba(255,255,255,0.015)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'100px 5vw' }}>
        <div style={{ maxWidth:760, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>About us</div>
          <h2 style={{ fontSize:'clamp(26px,3.5vw,42px)', fontWeight:900, color:'white', margin:'0 0 24px', letterSpacing:-1 }}>We built this because we needed it</h2>
          <p style={{ fontSize:17, color:'rgba(255,255,255,0.5)', lineHeight:1.8, marginBottom:20 }}>
            Millions of small businesses in India run entirely on WhatsApp. They get orders over chat, manually note them down, and forget to follow up on payments. We saw this happen every day — and decided to fix it.
          </p>
          <p style={{ fontSize:17, color:'rgba(255,255,255,0.5)', lineHeight:1.8, marginBottom:56 }}>
            Whats-Order is purpose-built for these businesses — <strong style={{ color:'rgba(255,255,255,0.75)' }}>zero technical knowledge required</strong>, works with your existing WhatsApp Business number.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }} className='lp-stats-grid'>
            {[['50','Free orders every month'],['₹0','Setup cost'],['6','Order stages'],['₹100','Per month on Pro']].map(([n,l],i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'20px 16px' }}>
                <div style={{ fontSize:28, fontWeight:900, color:'#10B981', marginBottom:4 }}>{n}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div style={{ padding:'100px 5vw', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, background:'radial-gradient(circle, rgba(10,102,64,0.2) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:900, color:'white', margin:'0 0 16px', letterSpacing:-1.5 }}>
            Start managing orders<br/>smarter today.
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.4)', margin:'0 0 8px', lineHeight:1.7 }}>Start free — <strong style={{ color:'#10B981' }}>50 orders/month free forever.</strong> No credit card. No setup.</p>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', margin:'0 0 40px' }}>Need more? Upgrade to Pro for just ₹299 for 3 months (₹100/month).</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }} className='lp-cta-btns'>
            <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:12, padding:'15px 36px', fontFamily:'inherit', fontSize:16, fontWeight:800, cursor:'pointer', boxShadow:'0 8px 40px rgba(10,102,64,0.5)', letterSpacing:-.3, transition:'all .15s' }}
              onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(16,185,129,0.5)'}}
              onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 40px rgba(10,102,64,0.5)'}}>
              Create free account →
            </button>
            <button onClick={onLogin} style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'15px 28px', fontFamily:'inherit', fontSize:16, fontWeight:600, cursor:'pointer', transition:'all .15s' }}
              onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='white'}}
              onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='rgba(255,255,255,0.6)'}}>
              I already have an account
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'24px 5vw', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }} className='lp-footer'>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, background:'linear-gradient(135deg,#0A6640,#10B981)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:15 }}>W</div>
          <span style={{ fontWeight:800, color:'white', fontSize:14 }}>Whats<span style={{ color:'#10B981' }}>-</span>Order</span>
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>© 2026 Whats-Order. All rights reserved.</div>
        <div style={{ display:'flex', gap:20 }} className='lp-footer-links'>
          <button onClick={onLogin} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontFamily:'inherit', fontSize:12, cursor:'pointer', transition:'color .15s' }}
            onMouseOver={e=>e.currentTarget.style.color='white'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>Log In</button>
          <button onClick={onSignup} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontFamily:'inherit', fontSize:12, cursor:'pointer', transition:'color .15s' }}
            onMouseOver={e=>e.currentTarget.style.color='white'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>Sign Up</button>
          <button onClick={onSetupGuide} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontFamily:'inherit', fontSize:12, cursor:'pointer', transition:'color .15s' }}
            onMouseOver={e=>e.currentTarget.style.color='white'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>Setup Guide</button>
          <a href="/privacy" style={{ color:'rgba(255,255,255,0.3)', fontSize:12, textDecoration:'none', transition:'color .15s' }}
            onMouseOver={e=>e.currentTarget.style.color='white'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>Privacy Policy</a>
          <a href="/terms" style={{ color:'rgba(255,255,255,0.3)', fontSize:12, textDecoration:'none', transition:'color .15s' }}
            onMouseOver={e=>e.currentTarget.style.color='white'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>Terms of Service</a>
        </div>
      </div>

      <style>{`
        @keyframes scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes pulse { 0%,100% { opacity:1; box-shadow:0 0 6px #10B981 } 50% { opacity:.5; box-shadow:0 0 12px #10B981 } }
      `}</style>
    </div>
  )
}


// ─── LEGAL PAGE SHELL ─────────────────────────────────────────────────────────
function LegalPage({ title, onBack, children }) {
  useEffect(() => {
    document.body.classList.add('scrollable')
    document.querySelector('.app')?.classList.add('scrollable')
    return () => {
      document.body.classList.remove('scrollable')
      document.querySelector('.app')?.classList.remove('scrollable')
    }
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#060E09', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'white' }}>
      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(6,14,9,0.9)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 5vw', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36,height:36,background:'linear-gradient(135deg,#0A6640,#10B981)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:20 }}>W</div>
          <span style={{ fontWeight:900,fontSize:17,color:'white',letterSpacing:-0.5 }}>Whats<span style={{ color:'#10B981' }}>-</span>Order</span>
        </div>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',padding:'8px 18px',borderRadius:8 }}>← Back</button>
      </nav>
      <div style={{ maxWidth:760, margin:'0 auto', padding:'60px 5vw 100px' }}>
        <h1 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:900, letterSpacing:-1, marginBottom:8 }}>{title}</h1>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:48 }}>Last updated: March 2026</div>
        <div style={{ display:'flex', flexDirection:'column', gap:40, fontSize:15, lineHeight:1.8, color:'rgba(255,255,255,0.7)' }}>
          {children}
        </div>
      </div>
      {/* Footer */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'20px 5vw', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>© 2026 Whats-Order. All rights reserved.</span>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>whatsorder.help@gmail.com</span>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:800, color:'white', marginBottom:12, letterSpacing:-0.3 }}>{title}</h2>
      <div>{children}</div>
    </div>
  )
}

// ─── PRIVACY POLICY ────────────────────────────────────────────────────────────
function PrivacyPage({ onBack }) {
  return (
    <LegalPage title="Privacy Policy" onBack={onBack}>
      <Section title="1. Who we are">
        Whats-Order ("we", "our", "us") is an order management platform for WhatsApp Business, operated by Akil Abi, Dharmapuri, Tamil Nadu, India. We are reachable at <strong style={{ color:'#10B981' }}>whatsorder.help@gmail.com</strong>.
      </Section>

      <Section title="2. What data we collect">
        <p style={{ marginBottom:12 }}>When you use Whats-Order, we collect:</p>
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li><strong style={{ color:'white' }}>Account data:</strong> Your name, email address, and password (stored as a secure hash — never in plain text).</li>
          <li><strong style={{ color:'white' }}>Business data:</strong> Your business name, WhatsApp Business Account (WABA) ID, and WhatsApp phone number.</li>
          <li><strong style={{ color:'white' }}>Customer data:</strong> Names and WhatsApp numbers of your customers, as captured from inbound WhatsApp messages.</li>
          <li><strong style={{ color:'white' }}>Order data:</strong> Order items, quantities, prices, status updates, and payment status created within our platform.</li>
          <li><strong style={{ color:'white' }}>Message data:</strong> WhatsApp messages sent to and from your business number, routed through the Meta WhatsApp Cloud API.</li>
          <li><strong style={{ color:'white' }}>Usage data:</strong> Basic logs of API requests for debugging and security purposes.</li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>To provide and operate the Whats-Order service</li>
          <li>To display your WhatsApp conversations and orders in the dashboard</li>
          <li>To send WhatsApp messages on your behalf via the Meta Cloud API</li>
          <li>To generate invoices and order reports</li>
          <li>To send you service-related notifications (e.g. password reset emails)</li>
          <li>To improve our product based on aggregate, anonymised usage patterns</li>
        </ul>
        <p style={{ marginTop:12 }}>We <strong style={{ color:'white' }}>never</strong> sell your data or your customers' data to third parties. We do not use your data for advertising.</p>
      </Section>

      <Section title="4. WhatsApp & Meta">
        Whats-Order uses the <strong style={{ color:'white' }}>Meta WhatsApp Cloud API</strong>. By connecting your WhatsApp Business Account, you agree that message data passes through Meta's infrastructure. Meta's own privacy policy applies to this data. We act as a data processor on your behalf — you remain the data controller for your customers' information.
      </Section>

      <Section title="5. Data storage & security">
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>All data is stored on secure servers hosted on Railway (cloud infrastructure in the US/EU).</li>
          <li>Passwords are hashed using bcrypt and never stored in plain text.</li>
          <li>All communication between your browser and our servers is encrypted via HTTPS/TLS.</li>
          <li>Access tokens for WhatsApp API are stored encrypted and never exposed to the frontend.</li>
        </ul>
      </Section>

      <Section title="6. Data retention">
        We retain your account data for as long as your account is active. Order and message data is retained for 12 months after creation. You may request deletion of your data at any time (see Section 8).
      </Section>

      <Section title="7. Third-party services">
        <p>We use the following third-party services:</p>
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
          <li><strong style={{ color:'white' }}>Meta WhatsApp Cloud API</strong> — for sending and receiving WhatsApp messages</li>
          <li><strong style={{ color:'white' }}>Railway</strong> — cloud hosting provider for our servers and database</li>
        </ul>
      </Section>

      <Section title="8. Your rights & data deletion">
        <p style={{ marginBottom:12 }}>You have the right to:</p>
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your account and all associated data</li>
          <li>Export your order data (via the CSV/Excel export feature)</li>
        </ul>
        <p style={{ marginTop:12 }}>To request data deletion, email us at <strong style={{ color:'#10B981' }}>whatsorder.help@gmail.com</strong> with the subject "Data Deletion Request". We will delete your data within 30 days.</p>
      </Section>

      <Section title="9. Cookies">
        Whats-Order uses browser localStorage to store your login session token. We do not use tracking cookies or third-party analytics cookies.
      </Section>

      <Section title="10. Changes to this policy">
        We may update this Privacy Policy from time to time. We will notify you of significant changes by email. Continued use of the service after changes constitutes acceptance.
      </Section>

      <Section title="11. Contact">
        For any privacy-related questions or requests, contact us at <strong style={{ color:'#10B981' }}>whatsorder.help@gmail.com</strong>.
      </Section>
    </LegalPage>
  )
}

// ─── TERMS OF SERVICE ──────────────────────────────────────────────────────────
function TermsPage({ onBack }) {
  return (
    <LegalPage title="Terms of Service" onBack={onBack}>
      <Section title="1. Acceptance of terms">
        By creating an account on Whats-Order ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users of Whats-Order, operated by Akil Abi, Dharmapuri, Tamil Nadu, India.
      </Section>

      <Section title="2. Description of service">
        Whats-Order is a SaaS (Software as a Service) platform that allows businesses to manage orders received via WhatsApp. The Service connects to your WhatsApp Business Account via the Meta WhatsApp Cloud API and provides an order management dashboard.
      </Section>

      <Section title="3. Account registration">
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>You must provide accurate and complete information when creating an account.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must notify us immediately of any unauthorised access to your account.</li>
          <li>One account per business. You may not share your account with multiple businesses.</li>
        </ul>
      </Section>

      <Section title="4. Plans & billing">
        <p style={{ marginBottom:12 }}><strong style={{ color:'white' }}>Free Plan:</strong> Allows up to 50 orders per month at no charge. Free forever with no credit card required.</p>
        <p style={{ marginBottom:12 }}><strong style={{ color:'white' }}>Pro Plan:</strong> ₹299 per 3 months (₹100/month). Provides unlimited orders and priority support. Billed quarterly.</p>
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>Pro plan payments are processed manually — contact us at whatsorder.help@gmail.com to upgrade.</li>
          <li>We reserve the right to change pricing with 30 days notice.</li>
          <li>No refunds are provided for partial months of Pro service.</li>
          <li>Free plan limits (50 orders/month) are enforced automatically. Cancelled orders do not count toward the limit.</li>
        </ul>
      </Section>

      <Section title="5. Acceptable use">
        <p style={{ marginBottom:12 }}>You agree NOT to use Whats-Order to:</p>
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>Send spam, unsolicited messages, or marketing messages to WhatsApp users who have not contacted you first</li>
          <li>Violate Meta's WhatsApp Business Policy or Commerce Policy</li>
          <li>Sell or promote prohibited products (alcohol, tobacco, weapons, adult content, gambling, etc.)</li>
          <li>Engage in any fraudulent, misleading, or deceptive activity</li>
          <li>Attempt to reverse engineer, hack, or disrupt the Service</li>
        </ul>
        <p style={{ marginTop:12 }}>Violation of these terms may result in immediate account suspension without refund.</p>
      </Section>

      <Section title="6. WhatsApp & Meta compliance">
        By using Whats-Order you agree to comply with Meta's <strong style={{ color:'white' }}>WhatsApp Business Policy</strong> and <strong style={{ color:'white' }}>Commerce Policy</strong>. You are solely responsible for the content of messages sent through our platform. We are not liable for any account suspension by Meta due to policy violations on your part.
      </Section>

      <Section title="7. Data & privacy">
        Our collection and use of personal data is governed by our <strong style={{ color:'#10B981', cursor:'pointer' }} onClick={() => { window.history.pushState({}, '', '/privacy'); window.location.reload() }}>Privacy Policy</strong>, which is incorporated into these Terms by reference. You are the data controller for your customers' data. We act as a data processor.
      </Section>

      <Section title="8. Service availability">
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>We aim for high availability but do not guarantee 100% uptime.</li>
          <li>We are not liable for downtime caused by Meta's WhatsApp API, Railway infrastructure, or internet disruptions beyond our control.</li>
          <li>We may perform scheduled maintenance with advance notice where possible.</li>
        </ul>
      </Section>

      <Section title="9. Limitation of liability">
        To the maximum extent permitted by applicable law, Whats-Order shall not be liable for any indirect, incidental, special, or consequential damages, including loss of revenue, loss of data, or business interruption, arising from your use of the Service. Our total liability to you shall not exceed the amount you paid us in the 3 months preceding the claim.
      </Section>

      <Section title="10. Account termination">
        <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:8 }}>
          <li>You may delete your account at any time by contacting us at whatsorder.help@gmail.com.</li>
          <li>We may suspend or terminate accounts that violate these Terms, with or without notice.</li>
          <li>Upon termination, your data will be deleted within 30 days per our Privacy Policy.</li>
        </ul>
      </Section>

      <Section title="11. Changes to terms">
        We may update these Terms at any time. We will notify you by email for material changes. Continued use of the Service after changes constitutes acceptance of the new Terms.
      </Section>

      <Section title="12. Governing law">
        These Terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Dharmapuri, Tamil Nadu, India.
      </Section>

      <Section title="13. Contact">
        For any questions about these Terms, contact us at <strong style={{ color:'#10B981' }}>whatsorder.help@gmail.com</strong>.
      </Section>
    </LegalPage>
  )
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage({ onBack }) {
  useEffect(() => {
    document.body.classList.add('scrollable')
    document.querySelector('.app')?.classList.add('scrollable')
    return () => {
      document.body.classList.remove('scrollable')
      document.querySelector('.app')?.classList.remove('scrollable')
    }
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#FAFAF7', fontFamily:'var(--f)' }}>
      {/* Nav */}
      <div style={{ background:'white', borderBottom:'1px solid #E4EDE6', padding:'0 40px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:'#0A6640', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:20 }}>W</div>
          <span style={{ fontWeight:800, fontSize:18, color:'#0A6640' }}>Whats-Order</span>
        </div>
        <button onClick={onBack} style={{ background:'#0A6640', color:'white', border:'none', borderRadius:8, padding:'8px 20px', fontFamily:'var(--f)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Get Started →
        </button>
      </div>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg, #0A6640 0%, #0D8A52 60%, #10B981 100%)', padding:'80px 40px', textAlign:'center', color:'white' }}>
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.15)', borderRadius:20, padding:'6px 16px', fontSize:13, fontWeight:600, marginBottom:24 }}>
            <span>🟢</span> Built for WhatsApp Business
          </div>
          <h1 style={{ fontSize:48, fontWeight:900, margin:'0 0 16px', lineHeight:1.1 }}>
            Turn WhatsApp messages<br/>into managed orders
          </h1>
          <p style={{ fontSize:18, opacity:.85, margin:'0 0 32px', lineHeight:1.6 }}>
            Whats-Order helps small businesses receive, track and fulfill orders directly from WhatsApp — no coding, no complicated setup.
          </p>
          <button onClick={onBack} style={{ background:'white', color:'#0A6640', border:'none', borderRadius:10, padding:'14px 32px', fontFamily:'var(--f)', fontSize:16, fontWeight:800, cursor:'pointer' }}>
            Start for free →
          </button>
        </div>
      </div>

      {/* What we do */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'64px 40px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#0F1A14', margin:'0 0 12px' }}>What we do</h2>
          <p style={{ fontSize:16, color:'#6B7F72', maxWidth:560, margin:'0 auto', lineHeight:1.6 }}>
            We connect your WhatsApp Business account to a powerful order management system — so you spend less time in chats and more time running your business.
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:24 }}>
          {[
            { icon:'💬', title:'Smart Inbox', desc:'All your WhatsApp conversations in one place. Auto-detects order messages so you never miss a customer.' },
            { icon:'🛒', title:'One-click Orders', desc:'Convert any WhatsApp message into a tracked order with items, quantities, and price — in seconds.' },
            { icon:'📦', title:'Order Tracking', desc:'Track every order from New → Confirmed → Packed → Dispatched → Delivered. Customers get WhatsApp notifications at every step.' },
            { icon:'💳', title:'Payment Tracking', desc:'Send UPI payment links via WhatsApp, mark orders as paid, track pending payments.' },
            { icon:'🖨️', title:'Invoice Generation', desc:'Print clean, professional invoices for any order with one click.' },
            { icon:'📊', title:'Business Insights', desc:'See your top selling items, daily revenue, and order stats at a glance.' },
          ].map((f, i) => (
            <div key={i} style={{ background:'white', border:'1.5px solid #E4EDE6', borderRadius:16, padding:24 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontWeight:800, fontSize:16, color:'#0F1A14', marginBottom:8 }}>{f.title}</div>
              <div style={{ fontSize:14, color:'#6B7F72', lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Who is it for */}
      <div style={{ background:'#F0FAF5', padding:'64px 40px' }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#0F1A14', margin:'0 0 12px' }}>Built for small businesses</h2>
          <p style={{ fontSize:16, color:'#6B7F72', marginBottom:40, lineHeight:1.6 }}>
            If your customers order from you on WhatsApp, Whats-Order is for you.
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
            {['🍱 Home cooks & tiffin services','🧁 Bakeries & sweet shops','🥬 Vegetable & grocery sellers','🍔 Cloud kitchens','👗 Boutiques & tailors','💊 Medical shops','🌸 Flower shops','📦 Any WhatsApp business'].map((b,i) => (
              <span key={i} style={{ background:'white', border:'1.5px solid #BBE0CC', borderRadius:20, padding:'8px 16px', fontSize:14, fontWeight:600, color:'#1A2E22' }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth:800, margin:'0 auto', padding:'64px 40px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#0F1A14', margin:'0 0 12px' }}>Simple pricing</h2>
          <p style={{ fontSize:16, color:'#6B7F72' }}>Start free. Upgrade when you grow.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24 }}>
          {/* Free */}
          <div style={{ background:'white', border:'1.5px solid #E4EDE6', borderRadius:20, padding:32 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#6B7F72', textTransform:'uppercase', letterSpacing:.8, marginBottom:8 }}>Free Plan</div>
            <div style={{ fontSize:40, fontWeight:900, color:'#0F1A14', marginBottom:4 }}>₹0</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, fontWeight:800, color:'#0A6640', background:'#E8F5E9', padding:'3px 10px', borderRadius:20 }}>50 orders FREE/month</span>
              <span style={{ fontSize:12, color:'#9CA3AF' }}>No credit card</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
              {['50 orders per month','WhatsApp inbox & replies','Order tracking (6 stages)','Invoice printing','Top selling items report','Quick reply templates'].map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:14 }}>
                  <span style={{ color:'#0A6640', fontWeight:700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={onBack} style={{ width:'100%', padding:'12px', background:'#F0FAF5', color:'#0A6640', border:'1.5px solid #BBE0CC', borderRadius:10, fontFamily:'var(--f)', fontSize:15, fontWeight:700, cursor:'pointer' }}>
              Get started free
            </button>
          </div>
          {/* Pro */}
          <div style={{ background:'linear-gradient(135deg, #0A6640 0%, #0D8A52 100%)', borderRadius:20, padding:32, color:'white', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>POPULAR</div>
            <div style={{ fontSize:13, fontWeight:700, opacity:.8, textTransform:'uppercase', letterSpacing:.8, marginBottom:8 }}>Pro Plan</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
              <div style={{ fontSize:40, fontWeight:900 }}>₹299</div>
              <div style={{ fontSize:15, opacity:.6, fontWeight:500 }}>/ 3 months</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, fontWeight:800, color:'#86EFAC', background:'rgba(255,255,255,.1)', padding:'3px 10px', borderRadius:20 }}>₹100/month</span>
              <span style={{ fontSize:12, opacity:.5 }}>Unlimited orders</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
              {['Unlimited orders','Everything in Free','Priority support','Early access to new features'].map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:14 }}>
                  <span style={{ fontWeight:700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={onBack} style={{ width:'100%', padding:'12px', background:'white', color:'#0A6640', border:'none', borderRadius:10, fontFamily:'var(--f)', fontSize:15, fontWeight:800, cursor:'pointer' }}>
              Start with Pro →
            </button>
          </div>
        </div>
      </div>

      {/* About us */}
      <div style={{ background:'#0F1A14', color:'white', padding:'64px 40px' }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:32, fontWeight:900, margin:'0 0 16px' }}>About us</h2>
          <p style={{ fontSize:16, opacity:.7, lineHeight:1.8, marginBottom:32 }}>
            Whats-Order is built for the millions of small business owners in India who run their business over WhatsApp. We saw business owners manually copying orders from chats into notebooks, missing messages, and losing track of payments — and decided to fix it.
          </p>
          <p style={{ fontSize:16, opacity:.7, lineHeight:1.8, marginBottom:40 }}>
            Our mission is simple: make it effortless for any small business to manage orders on WhatsApp, without any technical knowledge or expensive software.
          </p>
          <div style={{ display:'flex', gap:40, justifyContent:'center', flexWrap:'wrap' }}>
            {[['50+','Free orders/month'],['0','Setup cost'],['6','Order stages'],['1-click','Invoice printing']].map(([n,l],i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:32, fontWeight:900, color:'#10B981' }}>{n}</div>
                <div style={{ fontSize:13, opacity:.6, marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:'#0A0F0D', color:'white', padding:'24px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, background:'#0A6640', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:14 }}>W</div>
          <span style={{ fontWeight:700, color:'white' }}>Whats-Order</span>
        </div>
        <div style={{ fontSize:13, opacity:.5 }}>© 2026 Whats-Order. All rights reserved.</div>
        <button onClick={onBack} style={{ background:'#0A6640', color:'white', border:'none', borderRadius:8, padding:'8px 20px', fontFamily:'var(--f)', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          Get Started →
        </button>
      </div>
    </div>
  )
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(null) // { reset_link?, dev_note? }
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!email) return
    setLoading(true); setErr('')
    try {
      const d = await api.forgotPassword(email)
      setSent(d)
    } catch (e) { setErr(e.error || 'Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-screen"><div className="auth-bg" />
      <div className="auth-card" style={{ position:"relative" }}>
        <div className="logo">
          <div className="logo-icon" style={{ background:"#0A6640", borderRadius:10, color:"white", fontWeight:900, fontSize:22, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>W</div>
          <div className="logo-text">Whats-Order</div>
        </div>
        {!sent ? (
          <>
            <div className="auth-title">Forgot password?</div>
            <div className="auth-sub">Enter your email and we'll send you a reset link.</div>
            {err && <div className="err">{err}</div>}
            <div className="fg">
              <label className="lbl">Email</label>
              <input className="inp" type="email" placeholder="you@business.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&submit()} autoFocus />
            </div>
            <button className="btn" onClick={submit} disabled={loading || !email}>{loading ? <><Spinner /> Sending...</> : 'Send Reset Link'}</button>
            <div className="switch"><a onClick={onBack}>← Back to login</a></div>
          </>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📬</div>
              <div className="auth-title" style={{ fontSize:20 }}>Check your email</div>
              <div className="auth-sub">{sent.message}</div>
            </div>
            {sent.reset_link && (
              <div style={{ background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:10, padding:'14px 16px', marginBottom:16, fontSize:13 }}>
                <div style={{ fontWeight:700, color:'#92400E', marginBottom:6 }}>⚠️ Dev Mode — SMTP not configured</div>
                <div style={{ color:'#6B7F72', marginBottom:8, fontSize:12 }}>Copy this link to reset password:</div>
                <div style={{ wordBreak:'break-all', fontFamily:'monospace', fontSize:11, color:'#1A2E22', background:'white', padding:'8px', borderRadius:6, border:'1px solid #E4EDE6' }}>{sent.reset_link}</div>
                <button onClick={() => { navigator.clipboard.writeText(sent.reset_link); }} style={{ marginTop:8, fontSize:12, padding:'4px 10px', background:'#0A6640', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontFamily:'var(--f)' }}>Copy link</button>
              </div>
            )}
            <button className="btn" onClick={onBack}>Back to Login</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── RESET PASSWORD ────────────────────────────────────────────────────────────
function ResetPasswordScreen({ token, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!password || !confirm) return
    if (password !== confirm) { setErr('Passwords do not match'); return }
    if (password.length < 8) { setErr('Password must be at least 8 characters'); return }
    setLoading(true); setErr('')
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
    } catch (e) { setErr(e.error || 'Reset failed. Link may have expired.') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-screen"><div className="auth-bg" />
      <div className="auth-card" style={{ position:"relative" }}>
        <div className="logo">
          <div className="logo-icon" style={{ background:"#0A6640", borderRadius:10, color:"white", fontWeight:900, fontSize:22, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>W</div>
          <div className="logo-text">Whats-Order</div>
        </div>
        {!success ? (
          <>
            <div className="auth-title">Set new password</div>
            <div className="auth-sub">Choose a strong password for your account.</div>
            {err && <div className="err">{err}</div>}
            <div className="fg">
              <label className="lbl">New Password</label>
              <input className="inp" type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
            </div>
            <div className="fg">
              <label className="lbl">Confirm Password</label>
              <input className="inp" type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key==='Enter'&&submit()} />
            </div>
            <button className="btn" onClick={submit} disabled={loading || !password || !confirm}>{loading ? <><Spinner /> Resetting...</> : 'Reset Password'}</button>
          </>
        ) : (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
            <div className="auth-title" style={{ fontSize:20 }}>Password reset!</div>
            <div className="auth-sub" style={{ marginBottom:20 }}>Your password has been updated successfully.</div>
            <button className="btn" onClick={onDone}>Log In</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function LoginScreen({ onDone, onSignup, onForgot, onAbout, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const submit = async () => {
    if (!email || !password) return
    setLoading(true); setErr('')
    try { const d = await api.login(email, password); onDone(d) }
    catch (e) { setErr(e.error || 'Invalid credentials') }
    finally { setLoading(false) }
  }
  return (
    <div className="auth-screen"><div className="auth-bg" />
      <div className="auth-card" style={{ position:"relative" }}>
        <div className="logo"><div className="logo-icon" style={{ background:"#0A6640", borderRadius:10, color:"white", fontWeight:900, fontSize:22, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>W</div><div className="logo-text">Whats-Order</div></div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Log in to manage your WhatsApp orders</div>
        {err && <div className="err">{err}</div>}
        <div className="fg"><label className="lbl">Email</label><input className="inp" type="email" placeholder="you@business.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&submit()} /></div>
        <div className="fg"><label className="lbl">Password</label><input className="inp" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter'&&submit()} /></div>
        <button className="btn" onClick={submit} disabled={loading}>{loading ? <><Spinner /> Logging in...</> : 'Log In'}</button>
        <div className="switch" style={{ textAlign:'right', marginBottom:4 }}><a onClick={onForgot} style={{ fontSize:12, color:'#6B7F72' }}>Forgot password?</a></div>
        <div className="switch">New here? <a onClick={onSignup}>Create a free account</a></div>
        <div style={{ textAlign:'center', marginTop:8 }}><a onClick={onAbout} style={{ fontSize:12, color:'#9CA3AF' }}>About Whats-Order</a></div>
      </div>
    </div>
  )
}

function SignupScreen({ onDone, onLogin, onBack }) {
  const [form, setForm] = useState({ business:'', name:'', email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const up = (k,v) => setForm(f => ({ ...f, [k]:v }))
  const submit = async () => {
    if (!form.business||!form.name||!form.email||form.password.length<8) { setErr('All fields required. Password must be 8+ chars.'); return }
    setLoading(true); setErr('')
    try { const d = await api.signup(form.business, form.name, form.email, form.password); onDone(d) }
    catch (e) { setErr(e.error || 'Signup failed') }
    finally { setLoading(false) }
  }
  return (
    <div className="auth-screen"><div className="auth-bg" />
      <div className="auth-card" style={{ position:"relative" }}>
        {onBack && <button onClick={onBack} style={{ position:'absolute', top:20, left:20, background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:13, fontFamily:'var(--f)', display:'flex', alignItems:'center', gap:4 }}>← Back</button>}
        <div className="logo"><div className="logo-icon" style={{ background:"#0A6640", borderRadius:10, color:"white", fontWeight:900, fontSize:22, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>W</div><div className="logo-text">Whats-Order</div></div>
        <div className="auth-title">Create your account</div>
        <div className="auth-sub">Manage WhatsApp orders from one dashboard. Free to start.</div>
        {err && <div className="err">{err}</div>}
        <div className="fg"><label className="lbl">Business Name</label><input className="inp" placeholder="Priya's Fresh Kitchen" value={form.business} onChange={e => up('business',e.target.value)} /></div>
        <div className="fg"><label className="lbl">Your Name</label><input className="inp" placeholder="Full name" value={form.name} onChange={e => up('name',e.target.value)} /></div>
        <div className="fg"><label className="lbl">Email</label><input className="inp" type="email" placeholder="you@business.com" value={form.email} onChange={e => up('email',e.target.value)} /></div>
        <div className="fg"><label className="lbl">Password</label><input className="inp" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => up('password',e.target.value)} /></div>
        <button className="btn" onClick={submit} disabled={loading}>{loading ? <><Spinner /> Creating...</> : 'Create Free Account'}</button>
        <div className="switch">Already have an account? <a onClick={onLogin}>Log in</a></div>
      </div>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  injectCSS()

  // ── PWA install prompt ──────────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  useEffect(() => {
    // Capture the beforeinstallprompt event
    const handler = e => {
      e.preventDefault()
      setInstallPrompt(e)
      // Only show if user hasn't dismissed before
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setTimeout(() => setShowInstallBanner(true), 3000)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for SW update
    window.addEventListener('pwa-update-available', () => setShowUpdateBanner(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowInstallBanner(false)
    setInstallPrompt(null)
  }

  const dismissInstall = () => {
    setShowInstallBanner(false)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  const handleUpdate = () => {
    setShowUpdateBanner(false)
    window.location.reload()
  }

  // Detect reset token in URL on load
  const initialScreen = () => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('token')) return 'reset-password'
    if (window.location.pathname === '/privacy') return 'privacy'
    if (window.location.pathname === '/terms') return 'terms'
    if (api.isLoggedIn()) return 'dashboard'
    return 'landing'
  }

  const [screen, setScreen] = useState(initialScreen)
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('op_user') || 'null') } catch { return null } })
  const resetToken = new URLSearchParams(window.location.search).get('token') || ''

  const afterAuth = (data) => {
    const u = data.user || { name: data.business_name, email: data.email }
    setUser(u)
    localStorage.setItem('op_user', JSON.stringify(u))
    setScreen(data.onboarding_status === 'active' ? 'dashboard' : 'onboarding')
  }

  const afterOnboarding = () => setScreen('dashboard')

  const logout = () => {
    api.logout()
    localStorage.removeItem('op_user')
    setUser(null)
    setScreen('login')
  }

  const goLogin = () => {
    // Clear token param from URL
    window.history.replaceState({}, '', window.location.pathname)
    setScreen('login')
  }

  return (
    <div className="app">
      {screen==='landing'       && <LandingPage onLogin={() => setScreen('login')} onSignup={() => setScreen('signup')} onBack={screen === 'landing' ? null : () => setScreen('login')} onSetupGuide={() => setScreen('setup-guide')} />}
      {screen==='privacy'        && <PrivacyPage onBack={() => setScreen('landing')} />}
      {screen==='terms'          && <TermsPage onBack={() => setScreen('landing')} />}
      {screen==='about'         && <AboutPage onBack={() => setScreen('landing')} />}
      {screen==='setup-guide'    && <SetupGuidePage onBack={() => setScreen('landing')} onSignup={() => setScreen('signup')} />}
      {screen==='login'          && <LoginScreen onDone={afterAuth} onSignup={() => setScreen('signup')} onForgot={() => setScreen('forgot')} onAbout={() => setScreen('landing')} onBack={() => setScreen('landing')} />}
      {screen==='signup'         && <SignupScreen onDone={afterAuth} onLogin={() => setScreen('login')} onBack={() => setScreen('landing')} />}
      {screen==='forgot'         && <ForgotPasswordScreen onBack={() => setScreen('landing')} />}
      {screen==='reset-password' && <ResetPasswordScreen token={resetToken} onDone={goLogin} />}
      {screen==='onboarding'     && <OnboardingScreen user={user} onDone={afterOnboarding} addToast={(m,t) => console.warn('onboarding:', m)} />}
      {screen==='dashboard'      && <Dashboard user={user} onLogout={logout} />}

      {/* ── PWA Install Banner ── */}
      {showInstallBanner && installPrompt && (
        <div style={{ position:'fixed', bottom: window.innerWidth < 768 ? 'calc(60px + env(safe-area-inset-bottom,0px) + 12px)' : '20px', left:'50%', transform:'translateX(-50%)', zIndex:9999, background:'#0A6640', color:'white', borderRadius:16, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', width:'min(360px,calc(100vw - 32px))', fontFamily:'var(--f)' }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>W</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:14, marginBottom:2 }}>Install Whats-Order</div>
            <div style={{ fontSize:12, opacity:.8 }}>Add to home screen for quick access</div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={handleInstall} style={{ background:'white', color:'#0A6640', border:'none', borderRadius:8, padding:'7px 14px', fontFamily:'var(--f)', fontSize:13, fontWeight:800, cursor:'pointer' }}>Install</button>
            <button onClick={dismissInstall} style={{ background:'rgba(255,255,255,.15)', color:'white', border:'none', borderRadius:8, padding:'7px 10px', fontFamily:'var(--f)', fontSize:13, cursor:'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {/* ── PWA Update Banner ── */}
      {showUpdateBanner && (
        <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:'#1E293B', color:'white', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', width:'min(340px,calc(100vw - 32px))', fontFamily:'var(--f)' }}>
          <span style={{ fontSize:20 }}>🔄</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>Update available</div>
            <div style={{ fontSize:12, opacity:.7 }}>Refresh to get the latest version</div>
          </div>
          <button onClick={handleUpdate} style={{ background:'#10B981', color:'white', border:'none', borderRadius:8, padding:'7px 14px', fontFamily:'var(--f)', fontSize:13, fontWeight:700, cursor:'pointer' }}>Refresh</button>
        </div>
      )}
    </div>
  )
}
) {
  useEffect(() => {
    document.body.classList.add('scrollable')
    document.querySelector('.app')?.classList.add('scrollable')
    return () => {
      document.body.classList.remove('scrollable')
      document.querySelector('.app')?.classList.remove('scrollable')
    }
  }, [])

  const [activeTab, setActiveTab] = useState('new') // 'new' | 'existing'
  const [expandedFaq, setExpandedFaq] = useState(null)

  const G = '#10B981'
  const GD = '#0A6640'
  const WARN = '#F59E0B'
  const RED = '#EF4444'

  return (
    <div style={{ minHeight:'100vh', background:'#060E09', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'white' }}>

      {/* ── Nav ── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(6,14,9,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 5vw', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34,height:34,background:'linear-gradient(135deg,#0A6640,#10B981)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:18,boxShadow:'0 0 16px rgba(16,185,129,0.3)' }}>W</div>
          <span style={{ fontWeight:900,fontSize:16,color:'white',letterSpacing:-0.4 }}>Whats<span style={{ color:G }}>-</span>Order</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer', padding:'8px 16px', borderRadius:8 }}>← Back</button>
          <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:8, padding:'8px 18px', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 0 16px rgba(10,102,64,0.4)' }}>Get Started →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'56px 5vw 0', textAlign:'center', position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:600, height:300, background:'radial-gradient(circle,rgba(10,102,64,0.2) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:20, padding:'6px 16px', fontSize:12, fontWeight:700, color:G, marginBottom:20, letterSpacing:.5 }}>
          <span style={{ width:6,height:6,background:G,borderRadius:'50%',display:'inline-block',boxShadow:`0 0 6px ${G}` }} />
          SETUP GUIDE · 5 MINUTE READ
        </div>
        <h1 style={{ fontSize:'clamp(28px,4.5vw,48px)', fontWeight:900, letterSpacing:-1.5, margin:'0 0 16px', lineHeight:1.1 }}>
          Before you connect<br/>
          <span style={{ background:`linear-gradient(90deg,${G},#0D8A52)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>WhatsApp to Whats-Order</span>
        </h1>
        <p style={{ fontSize:16, color:'rgba(255,255,255,0.5)', maxWidth:560, margin:'0 auto 40px', lineHeight:1.7 }}>
          Everything you need to know about setting up your WhatsApp Business number — the right way, the first time.
        </p>

        {/* Quick stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, maxWidth:500, margin:'0 auto 56px' }}>
          {[['5 min','Setup time'],['1','WhatsApp number needed'],['Free','To get started']].map(([v,l],i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 10px' }}>
              <div style={{ fontSize:20, fontWeight:900, color:G, marginBottom:3 }}>{v}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab selector ── */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'0 5vw 40px' }}>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:5, display:'flex', gap:4, marginBottom:32 }}>
          {[
            { id:'new', label:'✨ Use a New Number', sub:'Recommended' },
            { id:'existing', label:'🔄 Migrate Existing Number', sub:'Already on WhatsApp Business' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex:1, padding:'11px 16px', borderRadius:10, border:'none', fontFamily:'inherit', cursor:'pointer', transition:'all .2s',
                background: activeTab===t.id ? `linear-gradient(135deg,${GD},${G})` : 'transparent',
                color: activeTab===t.id ? 'white' : 'rgba(255,255,255,0.45)',
                fontWeight: activeTab===t.id ? 800 : 600, fontSize:13 }}>
              {t.label}
              {activeTab===t.id && t.sub && <span style={{ display:'block', fontSize:10, opacity:.8, marginTop:2, letterSpacing:.3 }}>{t.sub}</span>}
            </button>
          ))}
        </div>

        {/* ── NEW NUMBER FLOW ── */}
        {activeTab === 'new' && (
          <div>
            {/* Recommended badge */}
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, padding:'12px 18px', marginBottom:32 }}>
              <span style={{ fontSize:20 }}>⭐</span>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:G }}>Recommended Approach</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>Fresh start, zero disruption, cleanest setup. Ideal for all new Whats-Order users.</div>
              </div>
            </div>

            {/* Flow diagram */}
            <div style={{ marginBottom:40 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:20 }}>Setup Flow</div>

              {[
                {
                  n:'01', icon:'📱', color:G, title:'Get a dedicated phone number',
                  desc:'Obtain a SIM card or landline number exclusively for your business WhatsApp. This number will be your customers\' point of contact.',
                  tips:['A new SIM from any carrier works (Airtel, Jio, BSNL)', 'A landline that can receive OTP via voice call works too', 'Virtual numbers (Google Voice, TextLocal) are not supported by Meta'],
                  tag:'One-time setup'
                },
                {
                  n:'02', icon:'🏢', color:'#60A5FA', title:'Contact our team for WABA creation',
                  desc:'Reach out to our support team. We will create a WhatsApp Business Account (WABA) for you under our platform — no technical knowledge needed.',
                  tips:['Email us at whatsorder.help@gmail.com', 'Share your business name and the new phone number', 'We set up everything within 24 hours'],
                  tag:'We handle this'
                },
                {
                  n:'03', icon:'📲', color:'#A78BFA', title:'Verify your number via OTP',
                  desc:'Meta sends a one-time code (OTP) to your number via SMS or voice call to confirm ownership. You simply share the code with us.',
                  tips:['Have your phone ready and charged', 'OTP expires in 10 minutes — be available', 'Voice call OTP is available if SMS doesn\'t arrive'],
                  tag:'~2 minutes'
                },
                {
                  n:'04', icon:'⚙️', color:WARN, title:'We configure your WhatsApp connection',
                  desc:'Our team enters your Phone Number ID and access token into the platform. Your WhatsApp Business number is now fully connected to Whats-Order.',
                  tips:['We test with a message to confirm everything works', 'You get notified once setup is complete', 'The whole process typically takes under 24 hours'],
                  tag:'We handle this'
                },
                {
                  n:'05', icon:'🚀', color:G, title:'Start receiving orders',
                  desc:'You\'re live. Share your new WhatsApp number with your customers. Every message lands in your Whats-Order inbox, ready to convert into tracked orders.',
                  tips:['Set up quick reply templates for common responses', 'Create your first order from any incoming message', 'Orders from WhatsApp appear in real-time'],
                  tag:'You\'re live!'
                },
              ].map((step, i, arr) => (
                <div key={i} style={{ display:'flex', gap:0, position:'relative' }}>
                  {/* Connector line */}
                  {i < arr.length-1 && (
                    <div style={{ position:'absolute', left:27, top:56, bottom:-16, width:2, background:`linear-gradient(to bottom, ${step.color}40, transparent)`, zIndex:0 }} />
                  )}
                  {/* Step circle */}
                  <div style={{ flexShrink:0, width:56, display:'flex', flexDirection:'column', alignItems:'center', zIndex:1 }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', background:`${step.color}18`, border:`2px solid ${step.color}50`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:4, boxShadow:`0 0 20px ${step.color}20` }}>
                      {step.icon}
                    </div>
                    <div style={{ fontSize:9, fontWeight:800, color:step.color, letterSpacing:.5, opacity:.7 }}>{step.n}</div>
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, paddingLeft:16, paddingBottom: i<arr.length-1 ? 32 : 8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'white' }}>{step.title}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:step.color, background:`${step.color}18`, padding:'2px 10px', borderRadius:20, letterSpacing:.3 }}>{step.tag}</span>
                    </div>
                    <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.5)', lineHeight:1.7, margin:'0 0 12px' }}>{step.desc}</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {step.tips.map((tip,j) => (
                        <div key={j} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:12.5, color:'rgba(255,255,255,0.35)' }}>
                          <span style={{ color:step.color, marginTop:1, flexShrink:0, fontWeight:700 }}>→</span>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ background:'linear-gradient(135deg,rgba(10,102,64,0.3),rgba(16,185,129,0.1))', border:'1px solid rgba(16,185,129,0.25)', borderRadius:16, padding:24, textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'white', marginBottom:6 }}>Ready to get started?</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:20 }}>Create your account first, then email us to set up your WhatsApp connection.</div>
              <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:10, padding:'11px 24px', fontFamily:'inherit', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(10,102,64,0.4)' }}>Create Free Account →</button>
                <a href="mailto:whatsorder.help@gmail.com?subject=WABA Setup Request&body=Hi, I would like to set up WhatsApp Business for Whats-Order. My business name is: " style={{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'11px 24px', fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer', textDecoration:'none', display:'inline-flex', alignItems:'center' }}>✉ Email Our Team</a>
              </div>
            </div>
          </div>
        )}

        {/* ── EXISTING NUMBER FLOW ── */}
        {activeTab === 'existing' && (
          <div>
            {/* Warning banner */}
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, padding:'16px 20px', marginBottom:32, display:'flex', gap:14, alignItems:'flex-start' }}>
              <span style={{ fontSize:22, flexShrink:0, marginTop:2 }}>⚠️</span>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:WARN, marginBottom:6 }}>Important: Understand the trade-offs before migrating</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.7 }}>
                  Migrating an existing number to WhatsApp Business API is a <strong style={{ color:'white' }}>one-way process</strong>. Once migrated, the WhatsApp Business App on your phone will stop working for that number. Read carefully before proceeding.
                </div>
              </div>
            </div>

            {/* What changes vs what stays */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:32 }}>
              <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:12, fontWeight:800, color:G, textTransform:'uppercase', letterSpacing:.8, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                  <span>✓</span> What stays the same
                </div>
                {['Your WhatsApp number is unchanged','Customers see the same number','All previous customer chat history on their phones','Business profile and display name'].map((t,i) => (
                  <div key={i} style={{ display:'flex', gap:8, fontSize:12.5, color:'rgba(255,255,255,0.55)', marginBottom:8, lineHeight:1.5 }}>
                    <span style={{ color:G, flexShrink:0, fontWeight:700 }}>✓</span>{t}
                  </div>
                ))}
              </div>
              <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:12, fontWeight:800, color:RED, textTransform:'uppercase', letterSpacing:.8, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                  <span>✕</span> What changes
                </div>
                {['WhatsApp Business App stops working on your phone','Cannot send/receive from the mobile app anymore','Your own chat history disappears from the app','Cannot revert without going through migration again'].map((t,i) => (
                  <div key={i} style={{ display:'flex', gap:8, fontSize:12.5, color:'rgba(255,255,255,0.55)', marginBottom:8, lineHeight:1.5 }}>
                    <span style={{ color:RED, flexShrink:0, fontWeight:700 }}>✕</span>{t}
                  </div>
                ))}
              </div>
            </div>

            {/* Migration flow */}
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:20 }}>Migration Flow</div>

            {[
              {
                n:'01', icon:'💾', color:'#60A5FA', title:'Back up your chat history',
                desc:'Optional but recommended. Export your existing WhatsApp Business chats before migration for your own records.',
                tips:['Open WhatsApp Business App → Settings → Chats → Chat Backup', 'Back up to Google Drive or locally', 'This is for your personal records — backups cannot be restored into Whats-Order'],
                tag:'Before you start', warn: false
              },
              {
                n:'02', icon:'🔓', color:WARN, title:'Disable Two-Step Verification',
                desc:'This is mandatory. If 2-step verification is active on your number, Meta will block the migration with a PIN prompt.',
                tips:['WhatsApp Business App → Settings → Account → Two-step verification → Turn Off', 'Wait 7 days after disabling if recently enabled', 'Do NOT skip this step — migration will fail'],
                tag:'Critical step', warn: true
              },
              {
                n:'03', icon:'🏢', color:'#A78BFA', title:'Contact our team with your number',
                desc:'Email us your business number. We will initiate the migration process on Meta\'s end and guide you through the OTP step.',
                tips:['Email: whatsorder.help@gmail.com', 'Include your country code (e.g. +91 98765 43210)', 'Be available for ~30 minutes during this step'],
                tag:'We take over', warn: false
              },
              {
                n:'04', icon:'📲', color:G, title:'Approve the OTP verification',
                desc:'Meta sends an OTP to your existing number. Enter it to confirm ownership and complete the migration.',
                tips:['Keep your phone in hand — OTP expires in 10 minutes', 'Choose SMS or voice call (voice call is more reliable)', 'The moment you enter the OTP, the WhatsApp Business App stops receiving messages'],
                tag:'~2 minutes', warn: false
              },
              {
                n:'05', icon:'⚙️', color:G, title:'We complete your connection',
                desc:'Our team connects your migrated number to your Whats-Order account. A test message confirms everything is working.',
                tips:['We add the Phone Number ID and token to your account', 'You receive a confirmation message on the number', 'Any incoming WhatsApp messages now appear in your Whats-Order inbox'],
                tag:'We handle this', warn: false
              },
            ].map((step, i, arr) => (
              <div key={i} style={{ display:'flex', gap:0, position:'relative' }}>
                {i < arr.length-1 && (
                  <div style={{ position:'absolute', left:27, top:56, bottom:-16, width:2, background:`linear-gradient(to bottom, ${step.color}40, transparent)`, zIndex:0 }} />
                )}
                <div style={{ flexShrink:0, width:56, display:'flex', flexDirection:'column', alignItems:'center', zIndex:1 }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:`${step.color}18`, border:`2px solid ${step.warn ? WARN+'80' : step.color+'50'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:4, boxShadow:`0 0 20px ${step.color}20`, position:'relative' }}>
                    {step.icon}
                    {step.warn && <div style={{ position:'absolute', top:-4, right:-4, width:16, height:16, background:WARN, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'#000' }}>!</div>}
                  </div>
                  <div style={{ fontSize:9, fontWeight:800, color:step.color, letterSpacing:.5, opacity:.7 }}>{step.n}</div>
                </div>
                <div style={{ flex:1, paddingLeft:16, paddingBottom: i<arr.length-1 ? 32 : 8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:15, fontWeight:800, color:'white' }}>{step.title}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:step.warn?WARN:step.color, background:`${step.warn?WARN:step.color}18`, padding:'2px 10px', borderRadius:20, letterSpacing:.3 }}>{step.tag}</span>
                  </div>
                  <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.5)', lineHeight:1.7, margin:'0 0 12px' }}>{step.desc}</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {step.tips.map((tip,j) => (
                      <div key={j} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:12.5, color:'rgba(255,255,255,0.35)' }}>
                        <span style={{ color:step.warn&&j===2?RED:step.color, marginTop:1, flexShrink:0, fontWeight:700 }}>→</span>
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Recommendation box */}
            <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:14, padding:20, marginTop:32, display:'flex', gap:14 }}>
              <span style={{ fontSize:24, flexShrink:0 }}>💡</span>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:WARN, marginBottom:6 }}>Our recommendation</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.7 }}>
                  If your existing number receives active orders from real customers, we strongly recommend getting a <strong style={{ color:'white' }}>new SIM</strong> instead and sharing the new number with customers gradually. This ensures <strong style={{ color:'white' }}>zero downtime</strong> during migration and no risk to your current customer communications.
                </div>
                <button onClick={() => setActiveTab('new')} style={{ marginTop:12, background:'transparent', border:`1px solid ${WARN}50`, color:WARN, fontFamily:'inherit', fontSize:12, fontWeight:700, cursor:'pointer', padding:'6px 14px', borderRadius:8 }}>
                  View New Number Guide →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        <div style={{ marginTop:56 }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:700, color:G, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>FAQ</div>
            <h2 style={{ fontSize:'clamp(20px,3vw,30px)', fontWeight:900, color:'white', margin:0, letterSpacing:-0.8 }}>Common questions</h2>
          </div>

          {[
            { q:'Can I use my personal WhatsApp number?', a:'No. Meta requires a dedicated business number. Personal WhatsApp accounts use a different infrastructure and cannot be connected to the WhatsApp Business API. You need a number that is either fresh (never registered on WhatsApp) or currently on the WhatsApp Business App.' },
            { q:'What is a WABA and why do I need one?', a:'WABA stands for WhatsApp Business Account — it\'s the Meta-issued account that holds your registered business phone number, display name, and business profile. Think of it as the business entity that owns your WhatsApp presence. Whats-Order connects to your WABA to send and receive messages on your behalf.' },
            { q:'How long does the setup take?', a:'For a new number, typically under 24 hours. For an existing number migration, it depends on when you\'re available for the OTP step — the migration itself takes under 30 minutes once started. Our team handles everything technical.' },
            { q:'Will my customers know I switched systems?', a:'No. Customers continue to message the same number. They see no difference — they just notice that responses may be faster and more consistent now that you\'re using Whats-Order.' },
            { q:'What happens if my number isn\'t verified by Meta?', a:'Meta requires phone numbers to pass a quality rating check. Numbers that have received spam complaints or policy violations may face messaging restrictions. Fresh numbers automatically start clean. If you\'re migrating an existing number, our team will check its quality status beforehand.' },
            { q:'Is there any cost from Meta to set up WhatsApp Business API?', a:'No. Setting up the API itself is free. Meta charges for conversations above 1,000 per month per number (approximately ₹0.50–₹0.83 per conversation beyond the free tier). At typical small business volumes, most users stay within the free limit entirely.' },
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
              <button onClick={() => setExpandedFaq(expandedFaq===i ? null : i)}
                style={{ width:'100%', padding:'18px 0', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, fontFamily:'inherit', textAlign:'left' }}>
                <span style={{ fontSize:14, fontWeight:700, color: expandedFaq===i ? G : 'rgba(255,255,255,0.8)', lineHeight:1.4 }}>{faq.q}</span>
                <span style={{ fontSize:18, color: expandedFaq===i ? G : 'rgba(255,255,255,0.3)', flexShrink:0, transition:'transform .2s', transform: expandedFaq===i ? 'rotate(45deg)' : 'none' }}>+</span>
              </button>
              {expandedFaq===i && (
                <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.45)', lineHeight:1.75, paddingBottom:18 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* ── Final CTA ── */}
        <div style={{ textAlign:'center', padding:'56px 0 80px', position:'relative' }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:400, height:200, background:'radial-gradient(circle,rgba(10,102,64,0.15) 0%,transparent 70%)', pointerEvents:'none' }} />
          <h2 style={{ fontSize:'clamp(20px,3vw,32px)', fontWeight:900, color:'white', margin:'0 0 10px', letterSpacing:-1 }}>Still have questions?</h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.35)', margin:'0 0 28px' }}>Our team is happy to walk you through the entire setup over email.</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:11, padding:'13px 28px', fontFamily:'inherit', fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:'0 6px 28px rgba(10,102,64,0.45)', letterSpacing:-.2 }}>Create Free Account →</button>
            <a href="mailto:whatsorder.help@gmail.com?subject=Setup Help&body=Hi, I need help setting up WhatsApp for Whats-Order." style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:11, padding:'13px 24px', fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer', textDecoration:'none', display:'inline-flex', alignItems:'center' }}>✉ Contact Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SETUP GUIDE PAGE ──────────────────────────────────────────────────────────
function SetupGuidePage({ onBack, onSignup }) {
  const [tab, setTab] = useState('new')
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    document.body.classList.add('scrollable')
    document.querySelector('.app')?.classList.add('scrollable')
    window.scrollTo(0,0)
    return () => {
      document.body.classList.remove('scrollable')
      document.querySelector('.app')?.classList.remove('scrollable')
    }
  }, [])

  const C = { g:'#10B981', gd:'#0A6640', amber:'#F59E0B', red:'#EF4444', blue:'#60A5FA', purple:'#A78BFA', bg:'#060E09', card:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.08)' }
  const ff = "'Plus Jakarta Sans', sans-serif"

  /* ── SVG Flow Diagram – New Number ── */
  const NewNumberDiagram = () => (
    <svg viewBox="0 0 780 340" style={{ width:'100%', maxWidth:780, display:'block', margin:'0 auto', overflow:'visible' }}>
      <defs>
        <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.2"/>
        </linearGradient>
        <linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A6640"/>
          <stop offset="100%" stopColor="#10B981"/>
        </linearGradient>
        <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1D4ED8"/>
          <stop offset="100%" stopColor="#60A5FA"/>
        </linearGradient>
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED"/>
          <stop offset="100%" stopColor="#A78BFA"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#10B981" opacity="0.5"/>
        </marker>
      </defs>

      {/* Connecting lines */}
      <line x1="136" y1="170" x2="196" y2="170" stroke="url(#arrowGrad)" strokeWidth="2" markerEnd="url(#arrowHead)" strokeDasharray="4 3"/>
      <line x1="292" y1="170" x2="352" y2="170" stroke="url(#arrowGrad)" strokeWidth="2" markerEnd="url(#arrowHead)" strokeDasharray="4 3"/>
      <line x1="448" y1="170" x2="508" y2="170" stroke="url(#arrowGrad)" strokeWidth="2" markerEnd="url(#arrowHead)" strokeDasharray="4 3"/>
      <line x1="604" y1="170" x2="654" y2="170" stroke="url(#arrowGrad)" strokeWidth="2" markerEnd="url(#arrowHead)" strokeDasharray="4 3"/>

      {/* Step 1 – Get Number */}
      <rect x="8" y="130" width="128" height="80" rx="14" fill="url(#gGrad)" opacity="0.15" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x="72" y="158" textAnchor="middle" fill="#10B981" fontSize="22">📱</text>
      <text x="72" y="178" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>Get a New</text>
      <text x="72" y="192" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>SIM / Number</text>
      <rect x="28" y="108" width="88" height="18" rx="9" fill="#10B981" opacity="0.2"/>
      <text x="72" y="121" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 01</text>

      {/* Step 2 – Contact Team */}
      <rect x="196" y="130" width="128" height="80" rx="14" fill="url(#blueGrad)" opacity="0.15" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x="260" y="158" textAnchor="middle" fill="#60A5FA" fontSize="22">✉️</text>
      <text x="260" y="178" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>Contact Our</text>
      <text x="260" y="192" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>Team</text>
      <rect x="208" y="108" width="102" height="18" rx="9" fill="#60A5FA" opacity="0.2"/>
      <text x="260" y="121" textAnchor="middle" fill="#60A5FA" fontSize="9" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 02</text>
      <rect x="212" y="218" width="96" height="16" rx="8" fill="#60A5FA" opacity="0.15"/>
      <text x="260" y="230" textAnchor="middle" fill="#60A5FA" fontSize="9" fontFamily={ff} fontWeight="700">We handle this</text>

      {/* Step 3 – OTP */}
      <rect x="352" y="130" width="128" height="80" rx="14" fill="url(#purpleGrad)" opacity="0.15" stroke="#A78BFA" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x="416" y="158" textAnchor="middle" fill="#A78BFA" fontSize="22">🔐</text>
      <text x="416" y="178" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>OTP</text>
      <text x="416" y="192" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>Verification</text>
      <rect x="368" y="108" width="96" height="18" rx="9" fill="#A78BFA" opacity="0.2"/>
      <text x="416" y="121" textAnchor="middle" fill="#A78BFA" fontSize="9" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 03</text>
      <rect x="368" y="218" width="96" height="16" rx="8" fill="#A78BFA" opacity="0.15"/>
      <text x="416" y="230" textAnchor="middle" fill="#A78BFA" fontSize="9" fontFamily={ff} fontWeight="700">~2 minutes</text>

      {/* Step 4 – We Configure */}
      <rect x="508" y="130" width="128" height="80" rx="14" fill="rgba(245,158,11,0.08)" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x="572" y="158" textAnchor="middle" fill="#F59E0B" fontSize="22">⚙️</text>
      <text x="572" y="178" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>Platform</text>
      <text x="572" y="192" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily={ff}>Configuration</text>
      <rect x="524" y="108" width="96" height="18" rx="9" fill="#F59E0B" opacity="0.2"/>
      <text x="572" y="121" textAnchor="middle" fill="#F59E0B" fontSize="9" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 04</text>
      <rect x="524" y="218" width="96" height="16" rx="8" fill="#F59E0B" opacity="0.15"/>
      <text x="572" y="230" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily={ff} fontWeight="700">We handle this</text>

      {/* Step 5 – Live */}
      <rect x="654" y="120" width="118" height="100" rx="14" fill="url(#gGrad)" opacity="0.25" stroke="#10B981" strokeWidth="2" filter="url(#glow)"/>
      <text x="713" y="152" textAnchor="middle" fill="#10B981" fontSize="26">🚀</text>
      <text x="713" y="174" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily={ff}>You're</text>
      <text x="713" y="190" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily={ff}>Live!</text>
      <rect x="670" y="100" width="86" height="18" rx="9" fill="#10B981" opacity="0.3"/>
      <text x="713" y="113" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 05</text>

      {/* Timeline bar at bottom */}
      <text x="390" y="290" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily={ff}>Total setup time: under 24 hours · Most of it handled by our team</text>
    </svg>
  )

  /* ── SVG Flow Diagram – Existing Number ── */
  const ExistingNumberDiagram = () => (
    <svg viewBox="0 0 780 380" style={{ width:'100%', maxWidth:780, display:'block', margin:'0 auto', overflow:'visible' }}>
      <defs>
        <linearGradient id="warnGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#92400E"/>
          <stop offset="100%" stopColor="#F59E0B"/>
        </linearGradient>
        <marker id="arrowHead2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F59E0B" opacity="0.5"/>
        </marker>
        <marker id="arrowHead3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#10B981" opacity="0.5"/>
        </marker>
      </defs>

      {/* Warning banner at top */}
      <rect x="8" y="8" width="764" height="40" rx="10" fill="rgba(245,158,11,0.08)" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.3"/>
      <text x="390" y="23" textAnchor="middle" fill="#F59E0B" fontSize="10" fontFamily={ff} fontWeight="700">⚠ ONE-WAY PROCESS</text>
      <text x="390" y="39" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9.5" fontFamily={ff}>Once migrated, the WhatsApp Business App on your phone will no longer work for this number</text>

      {/* Steps */}
      {/* Step 1 */}
      <rect x="8" y="72" width="138" height="90" rx="14" fill="rgba(96,165,250,0.08)" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x="77" y="100" textAnchor="middle" fill="#60A5FA" fontSize="22">💾</text>
      <text x="77" y="120" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="700" fontFamily={ff}>Back Up</text>
      <text x="77" y="134" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="700" fontFamily={ff}>Chat History</text>
      <rect x="24" y="54" width="106" height="16" rx="8" fill="#60A5FA" opacity="0.15"/>
      <text x="77" y="66" textAnchor="middle" fill="#60A5FA" fontSize="8.5" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 01 · OPTIONAL</text>

      <line x1="146" y1="117" x2="166" y2="117" stroke="#F59E0B" strokeOpacity="0.4" strokeWidth="2" markerEnd="url(#arrowHead2)" strokeDasharray="4 3"/>

      {/* Step 2 – CRITICAL */}
      <rect x="166" y="62" width="138" height="110" rx="14" fill="rgba(239,68,68,0.1)" stroke="#EF4444" strokeWidth="2"/>
      <text x="235" y="92" textAnchor="middle" fill="#EF4444" fontSize="22">🔓</text>
      <text x="235" y="114" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="800" fontFamily={ff}>Disable 2-Step</text>
      <text x="235" y="128" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="800" fontFamily={ff}>Verification</text>
      <rect x="178" y="44" width="114" height="16" rx="8" fill="#EF4444" opacity="0.25"/>
      <text x="235" y="56" textAnchor="middle" fill="#EF4444" fontSize="8.5" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 02 · CRITICAL</text>
      <rect x="182" y="178" width="106" height="16" rx="8" fill="#EF4444" opacity="0.15"/>
      <text x="235" y="190" textAnchor="middle" fill="#EF4444" fontSize="8.5" fontFamily={ff} fontWeight="700">Do not skip!</text>

      <line x1="304" y1="117" x2="324" y2="117" stroke="#F59E0B" strokeOpacity="0.4" strokeWidth="2" markerEnd="url(#arrowHead2)" strokeDasharray="4 3"/>

      {/* Step 3 */}
      <rect x="324" y="72" width="138" height="90" rx="14" fill="rgba(167,139,250,0.08)" stroke="#A78BFA" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x="393" y="100" textAnchor="middle" fill="#A78BFA" fontSize="22">✉️</text>
      <text x="393" y="120" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="700" fontFamily={ff}>Contact</text>
      <text x="393" y="134" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="700" fontFamily={ff}>Our Team</text>
      <rect x="340" y="54" width="106" height="16" rx="8" fill="#A78BFA" opacity="0.15"/>
      <text x="393" y="66" textAnchor="middle" fill="#A78BFA" fontSize="8.5" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 03</text>
      <rect x="344" y="168" width="98" height="16" rx="8" fill="#A78BFA" opacity="0.15"/>
      <text x="393" y="180" textAnchor="middle" fill="#A78BFA" fontSize="8.5" fontFamily={ff} fontWeight="700">We take over</text>

      <line x1="462" y1="117" x2="482" y2="117" stroke="#F59E0B" strokeOpacity="0.4" strokeWidth="2" markerEnd="url(#arrowHead2)" strokeDasharray="4 3"/>

      {/* Step 4 */}
      <rect x="482" y="72" width="138" height="90" rx="14" fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x="551" y="100" textAnchor="middle" fill="#10B981" fontSize="22">📲</text>
      <text x="551" y="120" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="700" fontFamily={ff}>Approve</text>
      <text x="551" y="134" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="700" fontFamily={ff}>OTP</text>
      <rect x="498" y="54" width="106" height="16" rx="8" fill="#10B981" opacity="0.15"/>
      <text x="551" y="66" textAnchor="middle" fill="#10B981" fontSize="8.5" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 04</text>
      <rect x="502" y="168" width="98" height="16" rx="8" fill="#10B981" opacity="0.15"/>
      <text x="551" y="180" textAnchor="middle" fill="#10B981" fontSize="8.5" fontFamily={ff} fontWeight="700">~2 minutes</text>

      <line x1="620" y1="117" x2="640" y2="117" stroke="#10B981" strokeOpacity="0.4" strokeWidth="2" markerEnd="url(#arrowHead3)" strokeDasharray="4 3"/>

      {/* Step 5 – Live */}
      <rect x="640" y="62" width="132" height="110" rx="14" fill="rgba(10,102,64,0.3)" stroke="#10B981" strokeWidth="2"/>
      <text x="706" y="98" textAnchor="middle" fill="#10B981" fontSize="26">🚀</text>
      <text x="706" y="122" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily={ff}>Connected</text>
      <text x="706" y="138" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily={ff}>& Live</text>
      <rect x="656" y="44" width="100" height="16" rx="8" fill="#10B981" opacity="0.3"/>
      <text x="706" y="56" textAnchor="middle" fill="#10B981" fontSize="8.5" fontWeight="800" fontFamily={ff} letterSpacing="1">STEP 05</text>

      {/* What stops working note */}
      <rect x="166" y="210" width="138" height="58" rx="10" fill="rgba(239,68,68,0.06)" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 3"/>
      <text x="235" y="228" textAnchor="middle" fill="#EF4444" fontSize="9.5" fontFamily={ff} fontWeight="700">After OTP approval:</text>
      <text x="235" y="244" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily={ff}>WA Business App stops</text>
      <text x="235" y="258" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily={ff}>receiving messages</text>

      {/* Timeline */}
      <text x="390" y="320" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily={ff}>Migration typically takes under 30 minutes once started — availability during OTP step required</text>
    </svg>
  )

  const newSteps = [
    { icon:'📱', color:C.g, tag:'You do this', title:'Obtain a dedicated business number',
      body:'Secure a phone number used exclusively for your business WhatsApp. This is the number your customers will message.',
      points:[
        'A new SIM from any carrier (Airtel, Jio, VI, BSNL) works perfectly',
        'A landline that can receive voice OTP is also supported',
        'Virtual / internet numbers (Google Voice, TextLocal) are not accepted by Meta',
        'The number must not be currently registered on any WhatsApp account',
      ]},
    { icon:'✉️', color:C.blue, tag:'We handle this', title:'Request WABA creation from our team',
      body:'Email our support team with your business name and the new number. We create a WhatsApp Business Account (WABA) on Meta\'s platform under our registered partner setup — no technical involvement needed from your side.',
      points:[
        'Email: whatsorder.help@gmail.com with subject "WABA Setup Request"',
        'Include your legal business name and the phone number (with country code)',
        'We provision the WABA and assign your number to it',
        'Turnaround: typically same business day',
      ]},
    { icon:'🔐', color:C.purple, tag:'~2 minutes', title:'Complete OTP verification with Meta',
      body:'Meta sends a one-time code to your number to confirm legal ownership. You share this with us or enter it directly — verifying that the number belongs to your business.',
      points:[
        'OTP arrives via SMS; voice call backup is available if SMS fails',
        'Code is valid for 10 minutes — have your phone ready',
        'This step happens in real time with our team on standby',
      ]},
    { icon:'⚙️', color:C.amber, tag:'We handle this', title:'Platform configuration & testing',
      body:'Our team connects your verified number to your Whats-Order tenant account. We enter the Phone Number ID and access credentials, then send a test message to confirm the full pipeline is working.',
      points:[
        'We configure your WhatsApp credentials inside the platform',
        'A test message is sent from your number to confirm delivery',
        'You are notified once your account is live',
      ]},
    { icon:'🚀', color:C.g, tag:'You\'re live', title:'Start receiving and managing orders',
      body:'Your WhatsApp number is fully connected. Share it with customers — every incoming message appears in your Whats-Order inbox in real time, ready to be converted into a tracked order.',
      points:[
        'Set up quick reply templates to respond faster',
        'Create orders directly from incoming messages in one click',
        'All order statuses automatically notify customers via WhatsApp',
      ]},
  ]

  const existingSteps = [
    { icon:'💾', color:C.blue, tag:'Recommended first', warn:false, title:'Export your existing chat history',
      body:'Before beginning, export your WhatsApp Business chats for your records. This data cannot be imported into Whats-Order, but serves as a personal archive.',
      points:[
        'Open WhatsApp Business App → Settings → Chats → Chat Backup',
        'Back up to Google Drive or save a local copy',
        'This is purely for your records — not a technical requirement',
      ]},
    { icon:'🔓', color:C.red, tag:'CRITICAL — Do not skip', warn:true, title:'Disable Two-Step Verification on the number',
      body:'Meta mandates that Two-Step Verification (2SV) is off before initiating a Business API migration. If 2SV is active, the migration is blocked at the OTP stage.',
      points:[
        'Open WhatsApp Business App → Settings → Account → Two-step verification → Disable',
        'If you recently enabled 2SV, Meta enforces a 7-day cooldown before it can be disabled',
        'Do not re-enable 2SV during the migration window — wait until we confirm completion',
      ]},
    { icon:'✉️', color:C.purple, tag:'We take over', warn:false, title:'Contact our team to initiate migration',
      body:'Email us your business number. We initiate the migration request on Meta\'s infrastructure through our partner credentials. Be available for approximately 30 minutes during this window.',
      points:[
        'Email: whatsorder.help@gmail.com with subject "Number Migration Request"',
        'Include the full number with country code and confirm 2SV is disabled',
        'We handle the Meta Business Manager steps entirely',
      ]},
    { icon:'📲', color:C.g, tag:'~2 minutes', warn:false, title:'Approve the OTP on your existing device',
      body:'Meta sends an OTP to your number — via the device that currently has the WhatsApp Business App installed. Entering this code confirms ownership and triggers the migration.',
      points:[
        'Keep the device with your WhatsApp Business App unlocked and nearby',
        'The moment the OTP is submitted, the WhatsApp Business App ceases to function for this number',
        'Voice call OTP is available as a fallback if SMS is not received',
      ]},
    { icon:'✅', color:C.g, tag:'We handle this', warn:false, title:'We complete connection and verify delivery',
      body:'Our team connects the migrated number to your Whats-Order account, runs a test message through the full pipeline, and confirms everything is functioning before handing over.',
      points:[
        'Phone Number ID and access token are entered into your tenant account',
        'Test message sent and received to confirm end-to-end delivery',
        'You receive a confirmation — your Whats-Order inbox is now live',
      ]},
  ]

  const faqs = [
    { q:'Can I use my personal WhatsApp number?',
      a:'No. Meta\'s WhatsApp Business API requires a dedicated business number. Personal WhatsApp accounts run on a different protocol and cannot be connected. The number must either be unused (no WhatsApp account), or currently active on the WhatsApp Business App (eligible for migration).' },
    { q:'What exactly is a WABA and why do I need one?',
      a:'WABA stands for WhatsApp Business Account — the Meta-issued entity that holds your registered phone number, display name, and business profile. Think of it as the business licence that authorises your number to use the WhatsApp Business API. Whats-Order communicates through your WABA to send and receive messages on your behalf.' },
    { q:'How long does the entire setup take?',
      a:'For a new number: the WABA creation and OTP verification typically completes within a few hours of your request; our team targets same-day turnaround. For number migration: the migration itself takes under 30 minutes once you are available for the OTP step. The prerequisite (disabling 2SV) may add up to 7 days if recently enabled.' },
    { q:'Will my customers notice anything different?',
      a:'Nothing changes from their perspective. They message the same number and receive responses as normal. The only difference is that your end is now managed through Whats-Order\'s inbox rather than a phone app — which typically means faster, more organised responses.' },
    { q:'Is there any cost from Meta to set this up?',
      a:'No. The API setup itself is free. Meta charges for messaging conversations beyond 1,000 per month per number (approximately ₹0.50–₹0.83 per conversation). At typical small business volumes — especially in the early stages — most businesses remain within the free tier entirely.' },
    { q:'What happens if the migration fails or something goes wrong?',
      a:'Our team monitors the migration process and will immediately diagnose any failure. Common issues are either 2SV not being fully disabled or OTP expiry. Both are recoverable. We will restart the process and walk you through it step by step. You are not alone in this — we handle the technical side entirely.' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:ff, color:'white' }}>

      {/* ── Sticky Nav ── */}
      <nav style={{ position:'sticky', top:0, zIndex:200, background:'rgba(6,14,9,0.94)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 clamp(16px,5vw,60px)', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={onBack}>
          <div style={{ width:34,height:34,background:'linear-gradient(135deg,#0A6640,#10B981)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:18,letterSpacing:-1 }}>W</div>
          <span style={{ fontWeight:900,fontSize:16,letterSpacing:-0.5 }}>Whats<span style={{ color:C.g }}>-</span>Order</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.6)', fontFamily:ff, fontSize:13, fontWeight:600, cursor:'pointer', padding:'8px 16px', borderRadius:9, letterSpacing:-.2 }}>← Back</button>
          <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:9, padding:'8px 18px', fontFamily:ff, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(10,102,64,0.4)' }}>Get Started Free →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ position:'relative', overflow:'hidden', padding:'72px clamp(16px,5vw,60px) 0', textAlign:'center' }}>
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'70vw', height:'60vh', background:'radial-gradient(ellipse,rgba(10,102,64,0.18) 0%,transparent 65%)', pointerEvents:'none' }}/>
        {/* Floating dots texture */}
        {[...Array(24)].map((_,i) => (
          <div key={i} style={{ position:'absolute', width:2, height:2, background:'rgba(16,185,129,0.2)', borderRadius:'50%',
            left:`${5 + (i*37)%92}%`, top:`${10 + (i*53)%80}%`, pointerEvents:'none' }}/>
        ))}
        <div style={{ position:'relative', zIndex:1, maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:24, padding:'6px 18px', fontSize:11, fontWeight:800, color:C.g, marginBottom:24, letterSpacing:1.2, textTransform:'uppercase' }}>
            <span style={{ width:6,height:6,background:C.g,borderRadius:'50%',display:'inline-block',animation:'none' }}/>
            Prerequisites &amp; Setup Guide
          </div>
          <h1 style={{ fontSize:'clamp(30px,5vw,52px)', fontWeight:900, letterSpacing:-2, margin:'0 0 20px', lineHeight:1.08 }}>
            Connect WhatsApp<br/>
            <span style={{ background:`linear-gradient(100deg,${C.g},#34D399,${C.g})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>the right way, once.</span>
          </h1>
          <p style={{ fontSize:'clamp(14px,1.8vw,17px)', color:'rgba(255,255,255,0.45)', lineHeight:1.75, margin:'0 auto 48px', maxWidth:520 }}>
            Everything you need to know before connecting your WhatsApp Business number to Whats-Order — including what to expect, what to avoid, and how our team supports you through the process.
          </p>
          {/* Stats strip */}
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:56 }}>
            {[['Under 24 hrs','Total setup time'],['Team-assisted','We handle the technical parts'],['Zero downtime','For new number setup']].map(([v,l],i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'14px 22px', minWidth:140 }}>
                <div style={{ fontSize:15, fontWeight:900, color:'white', marginBottom:3 }}>{v}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontWeight:500 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'0 clamp(16px,5vw,40px) 80px' }}>

        {/* ── Tab Switcher ── */}
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:5, display:'flex', gap:4, marginBottom:40 }}>
          {[
            { id:'new', icon:'✨', label:'New Business Number', note:'Recommended' },
            { id:'existing', icon:'🔄', label:'Migrate Existing Number', note:'Currently on WhatsApp Business' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:'13px 16px', borderRadius:12, border:'none', fontFamily:ff, cursor:'pointer', transition:'all .25s',
              background: tab===t.id ? `linear-gradient(135deg,${C.gd},${C.g})` : 'transparent',
              color: tab===t.id ? 'white' : 'rgba(255,255,255,0.4)',
              fontWeight: tab===t.id ? 800 : 600, fontSize:13, letterSpacing:-.2 }}>
              <span style={{ marginRight:6 }}>{t.icon}</span>{t.label}
              {tab===t.id && <span style={{ display:'block', fontSize:10, opacity:.75, marginTop:2, fontWeight:600, letterSpacing:.2 }}>{t.note}</span>}
            </button>
          ))}
        </div>

        {/* ── NEW NUMBER SECTION ── */}
        {tab === 'new' && <>

          {/* Recommendation callout */}
          <div style={{ display:'flex', gap:14, background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:14, padding:'16px 20px', marginBottom:36 }}>
            <div style={{ fontSize:22, flexShrink:0, marginTop:1 }}>⭐</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:C.g, marginBottom:5 }}>Why this is the recommended path</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>Starting with a fresh number means zero risk to any existing customer conversations, a clean WhatsApp reputation score, and no migration complexity. For most businesses, especially those setting up WhatsApp ordering for the first time, this is the fastest and safest option.</div>
            </div>
          </div>

          {/* Flow diagram */}
          <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'28px 16px 20px', marginBottom:40 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:2, marginBottom:20, textAlign:'center' }}>End-to-End Setup Flow</div>
            <NewNumberDiagram/>
          </div>

          {/* Step-by-step detail */}
          <div style={{ marginBottom:40 }}>
            {newSteps.map((s, i) => (
              <div key={i} style={{ display:'flex', gap:0, position:'relative', marginBottom: i<newSteps.length-1 ? 0 : 0 }}>
                {/* Connector */}
                {i < newSteps.length-1 && <div style={{ position:'absolute', left:23, top:52, bottom:-4, width:2, background:`linear-gradient(to bottom,${s.color}50,transparent)`, zIndex:0 }}/>}
                {/* Node */}
                <div style={{ flexShrink:0, width:48, paddingTop:4, zIndex:1 }}>
                  <div style={{ width:46, height:46, borderRadius:'50%', background:`${s.color}14`, border:`2px solid ${s.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:`0 0 18px ${s.color}18` }}>
                    {s.icon}
                  </div>
                </div>
                {/* Card */}
                <div style={{ flex:1, marginLeft:14, marginBottom:i<newSteps.length-1?28:0, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.25)', letterSpacing:.5 }}>0{i+1}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:'white' }}>{s.title}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:s.color, background:`${s.color}18`, padding:'2px 10px', borderRadius:20, letterSpacing:.3 }}>{s.tag}</span>
                  </div>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.7, margin:'0 0 12px' }}>{s.body}</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {s.points.map((p,j) => (
                      <div key={j} style={{ display:'flex', gap:9, fontSize:12.5, color:'rgba(255,255,255,0.3)', lineHeight:1.5 }}>
                        <span style={{ color:s.color, flexShrink:0, fontWeight:800, marginTop:1 }}>›</span>{p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ background:'linear-gradient(135deg,rgba(10,102,64,0.25),rgba(16,185,129,0.1))', border:'1px solid rgba(16,185,129,0.25)', borderRadius:16, padding:'28px 24px', textAlign:'center' }}>
            <div style={{ fontSize:17, fontWeight:800, color:'white', marginBottom:8 }}>Ready to connect your WhatsApp?</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:24, lineHeight:1.6 }}>Create your free account first, then email our team to handle the WABA setup.<br/>Most accounts are live within the same business day.</div>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:11, padding:'12px 28px', fontFamily:ff, fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:'0 6px 24px rgba(10,102,64,0.4)' }}>Create Free Account →</button>
              <a href="mailto:whatsorder.help@gmail.com?subject=WABA Setup Request&body=Hi, I'd like to set up WhatsApp Business for Whats-Order.%0A%0ABusiness name: %0APhone number (with country code): " style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.75)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:11, padding:'12px 22px', fontFamily:ff, fontSize:14, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}>✉ Email Our Team</a>
            </div>
          </div>
        </>}

        {/* ── EXISTING NUMBER SECTION ── */}
        {tab === 'existing' && <>

          {/* Trade-off cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:36 }}>
            {/* What stays */}
            <div style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.g, textTransform:'uppercase', letterSpacing:.8, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}><span>✓</span> What remains unchanged</div>
              {['Your WhatsApp number stays the same','Customers continue messaging the same contact','Business profile, display name, and verified status','Customer-side chat history on their devices'].map((t,i)=>(
                <div key={i} style={{ display:'flex', gap:8, fontSize:12.5, color:'rgba(255,255,255,0.5)', marginBottom:8, lineHeight:1.5 }}><span style={{ color:C.g, flexShrink:0, fontWeight:800 }}>✓</span>{t}</div>
              ))}
            </div>
            {/* What changes */}
            <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.red, textTransform:'uppercase', letterSpacing:.8, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}><span>✕</span> What changes permanently</div>
              {['WhatsApp Business App becomes non-functional for this number','All existing chats disappear from the phone app','Cannot send or receive messages via the mobile app','Reverting requires going through migration again'].map((t,i)=>(
                <div key={i} style={{ display:'flex', gap:8, fontSize:12.5, color:'rgba(255,255,255,0.5)', marginBottom:8, lineHeight:1.5 }}><span style={{ color:C.red, flexShrink:0, fontWeight:800 }}>✕</span>{t}</div>
              ))}
            </div>
          </div>

          {/* Migration flow diagram */}
          <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'24px 16px 20px', marginBottom:40 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:2, marginBottom:20, textAlign:'center' }}>Migration Flow</div>
            <ExistingNumberDiagram/>
          </div>

          {/* Step-by-step */}
          <div style={{ marginBottom:36 }}>
            {existingSteps.map((s, i) => (
              <div key={i} style={{ display:'flex', gap:0, position:'relative' }}>
                {i < existingSteps.length-1 && <div style={{ position:'absolute', left:23, top:52, bottom:-4, width:2, background:`linear-gradient(to bottom,${s.color}50,transparent)`, zIndex:0 }}/>}
                <div style={{ flexShrink:0, width:48, paddingTop:4, zIndex:1, position:'relative' }}>
                  <div style={{ width:46, height:46, borderRadius:'50%', background:`${s.color}14`, border:`2px solid ${s.warn ? C.red+'70' : s.color+'40'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:`0 0 18px ${s.color}18` }}>
                    {s.icon}
                  </div>
                  {s.warn && <div style={{ position:'absolute', top:-4, right:-2, width:16, height:16, background:C.red, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'white' }}>!</div>}
                </div>
                <div style={{ flex:1, marginLeft:14, marginBottom:i<existingSteps.length-1?28:0, background: s.warn ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)', border:`1px solid ${s.warn ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius:14, padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.25)', letterSpacing:.5 }}>0{i+1}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:'white' }}>{s.title}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:s.warn?C.red:s.color, background:`${s.warn?C.red:s.color}18`, padding:'2px 10px', borderRadius:20, letterSpacing:.3 }}>{s.tag}</span>
                  </div>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.7, margin:'0 0 12px' }}>{s.body}</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {s.points.map((p,j) => (
                      <div key={j} style={{ display:'flex', gap:9, fontSize:12.5, color:'rgba(255,255,255,0.3)', lineHeight:1.5 }}>
                        <span style={{ color:s.warn && j===2 ? C.red : s.color, flexShrink:0, fontWeight:800, marginTop:1 }}>›</span>{p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation nudge */}
          <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:14, padding:'18px 22px', display:'flex', gap:14, marginBottom:28 }}>
            <span style={{ fontSize:22, flexShrink:0 }}>💡</span>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:C.amber, marginBottom:6 }}>Our recommendation before you decide</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.75 }}>
                If your existing number is actively handling customer conversations, consider obtaining a <strong style={{ color:'white' }}>new dedicated SIM</strong> and migrating customers to it gradually. This eliminates migration risk entirely and gives you a clean, high-reputation number from day one. You can even run both numbers simultaneously during the transition period.
              </div>
              <button onClick={() => setTab('new')} style={{ marginTop:12, background:'transparent', border:`1px solid ${C.amber}40`, color:C.amber, fontFamily:ff, fontSize:12, fontWeight:700, cursor:'pointer', padding:'7px 16px', borderRadius:8 }}>
                View the New Number Guide instead →
              </button>
            </div>
          </div>

          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'20px 24px', textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:800, color:'white', marginBottom:6 }}>Ready to migrate your number?</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:20 }}>Create your account first, then contact our team to begin the migration process with full support.</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:10, padding:'11px 24px', fontFamily:ff, fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(10,102,64,0.35)' }}>Create Free Account →</button>
              <a href="mailto:whatsorder.help@gmail.com?subject=Number Migration Request&body=Hi, I'd like to migrate my existing WhatsApp Business number to Whats-Order.%0A%0ANumber (with country code): %0ABusiness name: %0A2-Step Verification disabled: Yes / No" style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'11px 20px', fontFamily:ff, fontSize:13, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}>✉ Request Migration</a>
            </div>
          </div>
        </>}

        {/* ── FAQ ── */}
        <div style={{ marginTop:64 }}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.g, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>FAQ</div>
            <h2 style={{ fontSize:'clamp(22px,3.5vw,34px)', fontWeight:900, color:'white', margin:0, letterSpacing:-1 }}>Frequently asked questions</h2>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            {faqs.map((f, i) => (
              <div key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setOpenFaq(openFaq===i ? null : i)} style={{ width:'100%', padding:'18px 0', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, fontFamily:ff, textAlign:'left' }}>
                  <span style={{ fontSize:14, fontWeight:700, color: openFaq===i ? C.g : 'rgba(255,255,255,0.75)', lineHeight:1.4, letterSpacing:-.2 }}>{f.q}</span>
                  <div style={{ width:26, height:26, borderRadius:'50%', background: openFaq===i ? `${C.g}20` : 'rgba(255,255,255,0.05)', border:`1px solid ${openFaq===i ? C.g+'40' : 'rgba(255,255,255,0.08)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s' }}>
                    <span style={{ fontSize:14, color: openFaq===i ? C.g : 'rgba(255,255,255,0.3)', transform: openFaq===i ? 'rotate(45deg)' : 'none', display:'block', transition:'transform .2s', lineHeight:1 }}>+</span>
                  </div>
                </button>
                {openFaq===i && (
                  <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.4)', lineHeight:1.8, paddingBottom:20, paddingRight:40 }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div style={{ textAlign:'center', padding:'64px 0 40px', position:'relative' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 60%,rgba(10,102,64,0.14) 0%,transparent 65%)', pointerEvents:'none' }}/>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:2, marginBottom:14 }}>Still have questions?</div>
            <h2 style={{ fontSize:'clamp(22px,3.5vw,36px)', fontWeight:900, letterSpacing:-1.2, margin:'0 0 12px' }}>Our team is here to help.</h2>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.35)', margin:'0 0 32px', lineHeight:1.7 }}>We support every customer through the WhatsApp setup process personally.<br/>No tickets, no bots — just email us.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={onSignup} style={{ background:'linear-gradient(135deg,#0A6640,#10B981)', color:'white', border:'none', borderRadius:12, padding:'14px 32px', fontFamily:ff, fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 8px 32px rgba(10,102,64,0.45)', letterSpacing:-.3 }}>Start Free — No Credit Card →</button>
              <a href="mailto:whatsorder.help@gmail.com?subject=Setup Question" style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.65)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'14px 26px', fontFamily:ff, fontSize:15, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8 }}>✉ whatsorder.help@gmail.com</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
