import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as api from './api.js'

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --g:#0A6640;--wa:#25D366;--cr:#FAFAF7;--dk:#0F1A14;
  --tx:#1A2E22;--mt:#6B7F72;--bd:#E4EDE6;--f:'Plus Jakarta Sans',sans-serif;
}
body{font-family:var(--f);background:var(--cr);color:var(--tx);overflow:hidden;}
.app{height:100vh;display:flex;flex-direction:column;}
.auth-screen{flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0A6640 0%,#082B1A 100%);position:relative;overflow:hidden;}
.auth-bg{position:absolute;inset:0;opacity:.06;background-image:radial-gradient(circle at 2px 2px,white 1px,transparent 0);background-size:32px 32px;}
.auth-card{background:white;border-radius:24px;padding:48px 40px;width:440px;position:relative;z-index:1;box-shadow:0 32px 80px rgba(0,0,0,0.35);animation:slideUp .4s ease;}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:32px;}
.logo-icon{width:40px;height:40px;background:var(--g);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;}
.logo-text{font-size:20px;font-weight:800;color:var(--g);}
.auth-title{font-size:26px;font-weight:800;color:var(--dk);margin-bottom:6px;}
.auth-sub{color:var(--mt);font-size:14px;margin-bottom:28px;line-height:1.5;}
.fg{margin-bottom:16px;}
.lbl{display:block;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px;}
.inp{width:100%;padding:12px 16px;border:1.5px solid var(--bd);border-radius:10px;font-family:var(--f);font-size:14px;color:var(--dk);background:var(--cr);transition:all .2s;outline:none;}
.inp:focus{border-color:var(--g);background:white;box-shadow:0 0 0 3px rgba(10,102,64,.08);}
.btn{width:100%;padding:13px;background:var(--g);color:white;border:none;border-radius:10px;font-family:var(--f);font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:8px;}
.btn:hover{background:#0D5533;transform:translateY(-1px);box-shadow:0 8px 20px rgba(10,102,64,.3);}
.btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.err{background:#FFF5F5;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:13px;color:#DC2626;margin-bottom:12px;}
.switch{text-align:center;margin-top:20px;font-size:14px;color:var(--mt);}
.switch a{color:var(--g);font-weight:600;cursor:pointer;}
.layout{flex:1;display:flex;overflow:hidden;}
.sidebar{width:64px;background:var(--dk);display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:8px;}
.sb-logo{width:40px;height:40px;background:var(--g);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:16px;cursor:pointer;}
.sb-btn{width:44px;height:44px;border-radius:12px;border:none;background:transparent;color:#6B7280;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;transition:all .2s;position:relative;}
.sb-btn:hover,.sb-btn.on{background:rgba(255,255,255,.1);color:white;}
.dot-badge{position:absolute;top:6px;right:6px;width:8px;height:8px;background:var(--wa);border-radius:50%;border:2px solid var(--dk);}
.inbox-p{width:320px;border-right:1px solid var(--bd);display:flex;flex-direction:column;background:white;}
.ph{padding:18px 16px 12px;border-bottom:1px solid var(--bd);}
.ph-t{font-size:16px;font-weight:800;color:var(--dk);}
.ph-s{font-size:12px;color:var(--mt);margin-top:2px;}
.threads{overflow-y:auto;flex:1;}
.thread{display:flex;align-items:flex-start;gap:10px;padding:14px 16px;cursor:pointer;transition:background .15s;border-bottom:1px solid var(--bd);}
.thread:hover,.thread.on{background:#E8F5E9;}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;}
.ti{flex:1;min-width:0;}
.tn{font-size:14px;font-weight:700;color:var(--dk);}
.tp{font-size:12px;color:var(--mt);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tt{font-size:11px;color:var(--mt);}
.ubadge{min-width:18px;height:18px;padding:0 4px;background:var(--wa);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0;}
.itag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;margin-top:4px;}
.io{background:#EFF6FF;color:#3B82F6;}.ip{background:#F0FFF4;color:#059669;}.ir{background:#FFF7ED;color:#D97706;}
.chat-p{flex:1;display:flex;flex-direction:column;}
.chat-h{padding:14px 20px;border-bottom:1px solid var(--bd);background:white;display:flex;align-items:center;gap:12px;}
.chat-online{font-size:12px;color:#059669;font-weight:500;}
.chat-acts{display:flex;gap:8px;margin-left:auto;}
.abtn{padding:7px 14px;border-radius:8px;border:1.5px solid var(--bd);background:white;font-family:var(--f);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;color:var(--tx);}
.abtn:hover{border-color:var(--g);color:var(--g);background:#E8F5E9;}
.abtn.pr{background:var(--g);color:white;border-color:var(--g);}
.abtn.pr:hover{background:#0D5533;}
.abtn:disabled{opacity:.5;cursor:not-allowed;}
.msgs{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;background:#f0f2f5;}
.msg{max-width:70%;}
.msg.in{align-self:flex-start;}.msg.out{align-self:flex-end;}
.mb{padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;}
.msg.in .mb{background:white;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.08);}
.msg.out .mb{background:#DCF8C6;border-bottom-right-radius:4px;}
.mt2{font-size:11px;color:var(--mt);margin-top:4px;padding:0 4px;}
.msg.out .mt2{text-align:right;}
.ms{font-size:12px;font-weight:600;color:var(--g);margin-bottom:4px;}
.cinput-bar{padding:14px 16px;background:white;border-top:1px solid var(--bd);display:flex;gap:10px;align-items:flex-end;}
.cinput{flex:1;padding:10px 14px;border:1.5px solid var(--bd);border-radius:24px;font-family:var(--f);font-size:14px;outline:none;resize:none;background:var(--cr);transition:border .2s;line-height:1.4;}
.cinput:focus{border-color:var(--g);background:white;}
.sbtn{width:40px;height:40px;background:var(--wa);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;color:white;font-size:18px;}
.sbtn:hover{background:#1DA851;transform:scale(1.05);}
.ord-view{flex:1;overflow-y:auto;background:var(--cr);}
.ord-hdr{padding:24px 28px 0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--cr);z-index:10;padding-bottom:16px;}
.ord-title{font-size:22px;font-weight:800;color:var(--dk);}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:0 28px 20px;}
.stat{background:white;border-radius:14px;padding:18px;border:1px solid var(--bd);transition:all .2s;}
.stat:hover{box-shadow:0 4px 24px rgba(10,102,64,.10);transform:translateY(-2px);}
.sl{font-size:12px;color:var(--mt);font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
.sv{font-size:28px;font-weight:800;color:var(--dk);margin-top:6px;}
.ss{font-size:12px;color:var(--mt);margin-top:2px;}
.ords{padding:0 28px 28px;display:flex;flex-direction:column;gap:10px;}
.ocard{background:white;border-radius:14px;border:1px solid var(--bd);overflow:hidden;transition:box-shadow .2s;}
.ocard:hover{box-shadow:0 4px 24px rgba(10,102,64,.10);}
.ocin{padding:16px 18px;display:flex;align-items:center;gap:14px;}
.oi{flex:1;min-width:0;}
.on2{font-size:13px;font-weight:700;color:var(--g);font-family:monospace;}
.oc{font-size:15px;font-weight:700;color:var(--dk);margin:2px 0;}
.oit{font-size:12px;color:var(--mt);}
.sbadge{padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:4px;}
.pbadge{padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;}
.ppen{background:#FFF8E1;color:#D97706;}.ppaid{background:#F0FFF4;color:#059669;}
.oa{font-size:18px;font-weight:800;color:var(--dk);}
.oacts{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.sbar{height:3px;background:var(--bd);}
.sfill{height:100%;border-radius:2px;transition:width .6s ease;}
.toast{position:fixed;bottom:24px;right:24px;z-index:1000;background:white;border-radius:16px;padding:16px 18px;width:340px;box-shadow:0 20px 60px rgba(0,0,0,.2);border:1px solid var(--bd);animation:siR .4s ease;}
.th2{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.ta{font-size:12px;font-weight:700;color:#25D366;}
.tm{font-size:11px;color:var(--mt);margin-left:auto;}
.tsn{font-size:13px;font-weight:700;color:var(--dk);margin-bottom:4px;}
.tmsg{font-size:13px;color:var(--tx);line-height:1.5;}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;}
.modal{background:white;border-radius:20px;padding:28px;width:480px;max-height:85vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.3);animation:slideUp .3s ease;}
.mt{font-size:20px;font-weight:800;color:var(--dk);margin-bottom:4px;}
.ms2{font-size:14px;color:var(--mt);margin-bottom:20px;}
.loading{display:flex;align-items:center;justify-content:center;flex:1;font-size:14px;color:var(--mt);}
.spinner-lg{width:32px;height:32px;border:3px solid var(--bd);border-top-color:var(--g);border-radius:50%;animation:spin .8s linear infinite;margin-bottom:12px;}
.spinner-sm{width:14px;height:14px;border:2px solid rgba(255,255,255,.5);border-top-color:white;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;}
.onb-screen{flex:1;display:flex;flex-direction:column;}
.onb-top{padding:18px 28px;background:white;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;}
.onb-body{flex:1;display:flex;align-items:center;justify-content:center;background:var(--cr);}
.onb-card{background:white;border-radius:24px;padding:48px;width:520px;box-shadow:0 4px 24px rgba(10,102,64,.10);border:1px solid var(--bd);animation:slideUp .4s ease;}
.steps-ind{display:flex;gap:8px;margin-bottom:32px;}
.step-dot{height:4px;border-radius:2px;transition:all .4s;background:var(--bd);flex:1;}
.step-dot.on{background:var(--g);}
.wa-btn{width:100%;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--wa);color:white;border:none;border-radius:14px;font-family:var(--f);font-size:16px;font-weight:700;cursor:pointer;transition:all .3s;margin-top:8px;}
.wa-btn:hover{background:#1DA851;transform:translateY(-2px);box-shadow:0 12px 30px rgba(37,211,102,.3);}
.wa-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.pip-steps{display:flex;flex-direction:column;gap:8px;margin-top:16px;}
.pip-step{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;background:var(--cr);border:1px solid var(--bd);transition:all .3s;font-size:13px;}
.pip-step.running{background:#FFF8E1;border-color:#F59E0B;}
.pip-step.done{background:#E8F5E9;border-color:var(--g);}
.pip-step.failed{background:#FFF5F5;border-color:#EF4444;}
.upi-modal input{margin-bottom:10px;}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes siR{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes popIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
.pulse{animation:pulse 1.5s ease infinite;}
.pop-in{animation:popIn .3s ease;}
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

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 5000); return () => clearTimeout(t) }, [])
  const isWA = type === 'wa'
  const isErr = type === 'error'
  return (
    <div className="toast" style={{ borderLeft: `4px solid ${isWA ? '#25D366' : isErr ? '#EF4444' : '#0A6640'}` }}>
      {isWA ? <>
        <div className="th2"><span style={{ fontSize:18 }}>💬</span><span className="ta">WhatsApp · Sent via OrderPulse</span><span className="tm">{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>
        <div className="tsn">Customer notified</div>
        <div className="tmsg">{msg}</div>
      </> : <>
        <div className="th2"><span style={{ fontSize:18 }}>{isErr ? '❌' : '✅'}</span><span style={{ fontSize:12, fontWeight:700, color:isErr?'#EF4444':'#0A6640' }}>{isErr ? 'Error' : 'Success'}</span></div>
        <div className="tmsg">{msg}</div>
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
      const redirectUri = '' // JS SDK manages redirect internally
      const token = code || accessToken
      console.log('wabaId:', wabaId, 'phoneNumberId:', phoneNumberId)
      api.connectWABA(token, redirectUri, wabaId, phoneNumberId)
        .then(() => { setPhase('done'); setTimeout(onDone, 2000) })
        .catch(err => { setErrMsg(err.error || 'Connection failed'); setPhase('error') })
    }, {
      config_id: configId,
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
        <div style={{ width:32, height:32, background:'#0A6640', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📦</div>
        <span style={{ fontWeight:800, color:'#0A6640' }}>OrderPulse</span>
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
                Your WhatsApp Business Account is now linked to OrderPulse.<br/>A confirmation message was sent to your number.
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

              {(phase === 'idle' || phase === 'error') && !manualMode && (
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

// ─── INBOX ────────────────────────────────────────────────────────────────────
function InboxView({ addToast }) {
  const [threads, setThreads] = useState([])
  const [active, setActive] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(null)
  const [hoveredMsg, setHoveredMsg] = useState(null)
  const chatEnd = useRef(null)

  const loadInbox = useCallback(async () => {
    try { const data = await api.getInbox(); setThreads(data); if (!active && data.length) setActive(data[0]) }
    catch { addToast('Failed to load inbox', 'error') }
    finally { setLoading(false) }
  }, [])

  const loadMsgs = useCallback(async (contact) => {
    if (!contact) return
    try { setMsgs(await api.getMessages(contact.id)) }
    catch {}
  }, [])

  useEffect(() => { loadInbox() }, [])
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
      addToast(`Order ${result.order_number} created! Customer notified.`, 'success')
    } catch (e) { addToast(e.error || 'Failed to create order', 'error') }
  }

  if (loading) return <div style={{ flex:1 }}><Spinner lg /></div>

  const contact = active?.contact
  const lastMsg = active?.last_message
  const av = contact ? avatarFor(contact.name || contact.wa_number) : null

  return (
    <>
      <div className="inbox-p">
        <div className="ph"><div className="ph-t">Inbox</div><div className="ph-s">{threads.length} conversations</div></div>
        <div className="threads">
          {threads.length === 0 && (
            <div style={{ padding:24, textAlign:'center', color:'#6B7F72', fontSize:13 }}>
              No messages yet. Waiting for customers to WhatsApp you...
            </div>
          )}
          {threads.map(t => {
            const a = avatarFor(t.contact?.name || t.contact?.wa_number)
            const intent = intentOf(t.last_message?.body)
            return (
              <div key={t.contact?.id} className={`thread ${active?.contact?.id===t.contact?.id?'on':''}`} onClick={() => setActive(t)}>
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

      <div className="chat-p">
        {!active ? (
          <div className="loading">Select a conversation</div>
        ) : (
          <>
            <div className="chat-h">
              <div className="av" style={{ width:40, height:40, background:av.bg }}>{av.initials}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{contact?.name || contact?.wa_number}</div>
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
            <div className="cinput-bar">
              <textarea className="cinput" rows={1} placeholder={`Reply to ${contact?.name || contact?.wa_number}...`} value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
              <button className="sbtn" onClick={send} disabled={sending}>{sending ? <Spinner /> : '▶'}</button>
            </div>
          </>
        )}
      </div>

      {createModal && <CreateOrderModal contact={createModal.contact} msgs={createModal.msgs} onClose={() => setCreateModal(null)} onCreated={handleCreateOrder} />}
    </>
  )
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
function OrdersView({ addToast }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [upiModal, setUpiModal] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)

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

  const cancel = async (order) => {
    if (!confirm(`Cancel ${order.order_number}?`)) return
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
      <div className="stats-row">
        <div className="stat"><div className="sl">Total Orders</div><div className="sv">{stats.total_orders||0}</div><div className="ss">All time</div></div>
        <div className="stat"><div className="sl">New</div><div className="sv" style={{ color:'#3B82F6' }}>{stats.new_orders||0}</div><div className="ss">Need attention</div></div>
        <div className="stat"><div className="sl">Pending Payment</div><div className="sv" style={{ color:'#D97706' }}>{stats.pending_payment||0}</div><div className="ss">Follow up</div></div>
        <div className="stat"><div className="sl">Today Revenue</div><div className="sv" style={{ color:'#10B981' }}>₹{(stats.today_revenue||0).toLocaleString('en-IN')}</div><div className="ss">Paid orders</div></div>
      </div>
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
                <div style={{ textAlign:'right', marginRight:8 }}><div className="oa">₹{order.total_amount?.toLocaleString('en-IN')}</div></div>
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
                    <button className="abtn" style={{ fontSize:12, color:'#EF4444' }} onClick={() => cancel(order)}>Cancel</button>
                  )}
                </div>
              </div>
              <StatusBar status={order.status} />
            </div>
          )
        })}
      </div>
      {upiModal && <UPIModal order={upiModal} onClose={() => setUpiModal(null)} onSent={sendUPI} />}
      {payModal && <PaymentModal order={payModal} onClose={() => setPayModal(null)} onConfirm={confirmPay} />}
    </div>
  )
}


// ─── PROFILE VIEW ─────────────────────────────────────────────────────────────
function ProfileView({ user, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMe()
      .then(d => setProfile(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const av = avatarFor(user?.name || user?.email || 'U')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '—'

  const Row = ({ label, value, mono }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid #E4EDE6' }}>
      <span style={{ fontSize:13, color:'#6B7F72', fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:14, fontWeight:600, color:'#0F1A14', fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 12 : 14 }}>{value || '—'}</span>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#FAFAF7', padding:'32px 40px' }}>
      <div style={{ maxWidth:600, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#0F1A14' }}>Account</div>
          <div style={{ fontSize:14, color:'#6B7F72', marginTop:4 }}>Your profile and business details</div>
        </div>

        {loading ? <div style={{ textAlign:'center', padding:60 }}><Spinner lg /></div> : (
          <>
            {/* Avatar card */}
            <div style={{ background:'white', borderRadius:16, padding:24, marginBottom:20, border:'1px solid #E4EDE6', display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:av.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, color:'#0F1A14', flexShrink:0 }}>
                {av.initials}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:20, fontWeight:800, color:'#0F1A14' }}>{profile?.name}</div>
                <div style={{ fontSize:14, color:'#6B7F72', marginTop:2 }}>{profile?.email}</div>
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'#E8F5E9', color:'#0A6640', fontWeight:700, textTransform:'uppercase' }}>{profile?.role}</span>
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background: profile?.onboarding_status === 'active' ? '#E8F5E9' : '#FFF8E1', color: profile?.onboarding_status === 'active' ? '#0A6640' : '#D97706', fontWeight:700, textTransform:'uppercase' }}>
                    {profile?.onboarding_status === 'active' ? '● Connected' : profile?.onboarding_status}
                  </span>
                </div>
              </div>
            </div>

            {/* User details */}
            <div style={{ background:'white', borderRadius:16, padding:'4px 24px', marginBottom:20, border:'1px solid #E4EDE6' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6B7F72', textTransform:'uppercase', letterSpacing:.8, padding:'16px 0 4px' }}>User</div>
              <Row label="Full Name" value={profile?.name} />
              <Row label="Email" value={profile?.email} />
              <Row label="Role" value={profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)} />
            </div>

            {/* Business details */}
            <div style={{ background:'white', borderRadius:16, padding:'4px 24px', marginBottom:20, border:'1px solid #E4EDE6' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6B7F72', textTransform:'uppercase', letterSpacing:.8, padding:'16px 0 4px' }}>Business</div>
              <Row label="Business Name" value={profile?.business_name} />
              <Row label="Plan" value={profile?.plan?.charAt(0).toUpperCase() + profile?.plan?.slice(1)} />
              <Row label="Member Since" value={fmtDate(profile?.activated_at)} />
            </div>

            {/* WhatsApp details */}
            <div style={{ background:'white', borderRadius:16, padding:'4px 24px', marginBottom:28, border:'1px solid #E4EDE6' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6B7F72', textTransform:'uppercase', letterSpacing:.8, padding:'16px 0 4px' }}>WhatsApp</div>
              <Row label="Business Number" value={profile?.whatsapp_number} />
              <Row label="WABA ID" value={profile?.waba_id} mono />
              <Row label="Status" value={profile?.onboarding_status === 'active' ? 'Connected ✓' : profile?.onboarding_status} />
            </div>

            {/* Logout */}
            <button onClick={onLogout} style={{ width:'100%', padding:'13px', background:'white', color:'#DC2626', border:'1.5px solid #FCA5A5', borderRadius:10, fontFamily:'var(--f)', fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .2s' }}
              onMouseOver={e => { e.target.style.background='#FFF5F5' }}
              onMouseOut={e => { e.target.style.background='white' }}>
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('inbox')
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((msg, type='success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
  }, [])
  const removeToast = id => setToasts(t => t.filter(x => x.id!==id))
  const av = avatarFor(user?.name || user?.email || 'U')

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sb-logo">📦</div>
        <button className={`sb-btn ${view==='inbox'?'on':''}`} onClick={() => setView('inbox')} title="Inbox">💬<span className="dot-badge" /></button>
        <button className={`sb-btn ${view==='orders'?'on':''}`} onClick={() => setView('orders')} title="Orders">📋</button>
        <button className={`sb-btn ${view==='profile'?'on':''}`} onClick={() => setView('profile')} title="Profile">👤</button>
        <div style={{ flex:1 }} />
        <div onClick={() => setView('profile')} style={{ width:36, height:36, borderRadius:'50%', background:av.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#0F1A14', cursor:'pointer', border: view==='profile' ? '2px solid var(--wa)' : '2px solid transparent' }}>{av.initials}</div>
      </div>
      {view==='inbox' && <InboxView addToast={addToast} />}
      {view==='orders' && <OrdersView addToast={addToast} />}
      {view==='profile' && <ProfileView user={user} onLogout={onLogout} />}
      {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onDone={() => removeToast(t.id)} />)}
    </div>
  )
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function LoginScreen({ onDone, onSignup }) {
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
      <div className="auth-card">
        <div className="logo"><div className="logo-icon">📦</div><div className="logo-text">OrderPulse</div></div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Log in to manage your WhatsApp orders</div>
        {err && <div className="err">{err}</div>}
        <div className="fg"><label className="lbl">Email</label><input className="inp" type="email" placeholder="you@business.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&submit()} /></div>
        <div className="fg"><label className="lbl">Password</label><input className="inp" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter'&&submit()} /></div>
        <button className="btn" onClick={submit} disabled={loading}>{loading ? <><Spinner /> Logging in...</> : 'Log In'}</button>
        <div className="switch">New here? <a onClick={onSignup}>Create a free account</a></div>
      </div>
    </div>
  )
}

function SignupScreen({ onDone, onLogin }) {
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
      <div className="auth-card">
        <div className="logo"><div className="logo-icon">📦</div><div className="logo-text">OrderPulse</div></div>
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

  const [screen, setScreen] = useState(() => api.isLoggedIn() ? 'dashboard' : 'login')
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('op_user') || 'null') } catch { return null } })

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

  // FB SDK is loaded inside OnboardingScreen when needed

  return (
    <div className="app">
      {screen==='login'      && <LoginScreen onDone={afterAuth} onSignup={() => setScreen('signup')} />}
      {screen==='signup'     && <SignupScreen onDone={afterAuth} onLogin={() => setScreen('login')} />}
      {screen==='onboarding' && <OnboardingScreen user={user} onDone={afterOnboarding} addToast={(m,t) => console.warn('onboarding:', m)} />}
      {screen==='dashboard'  && <Dashboard user={user} onLogout={logout} />}
    </div>
  )
}
