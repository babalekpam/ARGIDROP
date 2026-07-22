import React, { useEffect, useRef, useState } from 'react';
import MapView from './MapView';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', border:'#E4DCC9' };

export default function AddressPicker({ value, onChange, label, color = C.forest, country = 'tg', height = 320 }) {
  const [query, setQuery] = useState(value?.address || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debRef = useRef(null);
  const blurRef = useRef(null);
  const reqIdRef = useRef(0);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => { setQuery(value?.address || ''); }, [value?.address]);

  useEffect(() => () => {
    mountedRef.current = false;
    if (debRef.current) clearTimeout(debRef.current);
    if (blurRef.current) clearTimeout(blurRef.current);
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} }
  }, []);

  function search(q) {
    if (!q || q.length < 3 || !KEY) { setResults([]); setLoading(false); return; }
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const myId = ++reqIdRef.current;
    setLoading(true);
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${KEY}&limit=6&country=${country}&proximity=1.2228,6.1319`;
    fetch(url, { signal: ctrl.signal }).then(r => r.json()).then(d => {
      if (!mountedRef.current || myId !== reqIdRef.current) return;
      setResults((d.features || []).map(f => ({
        id: f.id, name: f.text || f.place_name, full: f.place_name, lng: f.center[0], lat: f.center[1], city: f.context?.find(c => c.id?.startsWith('place'))?.text || ''
      })));
    }).catch(err => {
      if (err?.name === 'AbortError') return;
      if (mountedRef.current && myId === reqIdRef.current) setResults([]);
    }).finally(() => {
      if (mountedRef.current && myId === reqIdRef.current) setLoading(false);
    });
  }

  function onQueryChange(e) {
    const v = e.target.value;
    setQuery(v); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => search(v), 300);
  }

  function pick(r) {
    setQuery(r.full); setOpen(false); setResults([]);
    onChange({ address: r.full, city: r.city, lat: r.lat, lng: r.lng });
  }

  function reverseGeo(lng, lat) {
    if (!KEY) return;
    const myId = ++reqIdRef.current;
    fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${KEY}&limit=1`)
      .then(r => r.json())
      .then(d => {
        if (!mountedRef.current || myId !== reqIdRef.current) return;
        const f = d.features?.[0];
        const addr = f?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const city = f?.context?.find(c => c.id?.startsWith('place'))?.text || '';
        setQuery(addr);
        onChange({ address: addr, city, lat, lng });
      })
      .catch(() => {
        if (!mountedRef.current || myId !== reqIdRef.current) return;
        onChange({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '', lat, lng });
      });
  }

  const hasPin = Number.isFinite(parseFloat(value?.lat)) && Number.isFinite(parseFloat(value?.lng));
  const markers = hasPin ? [{ lng: parseFloat(value.lng), lat: parseFloat(value.lat), color, size: 18 }] : [];
  const center = hasPin ? [parseFloat(value.lng), parseFloat(value.lat)] : [1.2228, 6.1319];
  // ensures consistent re-render keying for the inner map when picking from search

  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display:'block', fontSize:12, color:C.muted, fontWeight:600, marginBottom:6, letterSpacing:'0.3px' }}>{label}</label>}
      <div style={{ position:'relative' }}>
        <input
          value={query}
          onChange={onQueryChange}
          onFocus={() => { if (results.length) setOpen(true); }}
          onBlur={() => { blurRef.current = setTimeout(() => setOpen(false), 150); }}
          placeholder="Search address, place, or landmark in Lomé"
          style={{ width:'100%', background:C.cream, border:`1px solid ${C.border}`, borderRadius:4, padding:'10px 12px', fontSize:14, color:C.ink, fontFamily:'inherit', boxSizing:'border-box' }}
        />
        {loading && <div style={{ position:'absolute', right:12, top:11, fontSize:12, color:C.muted }}>…</div>}
        {open && results.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:C.paper, border:`1px solid ${C.border}`, borderRadius:6, boxShadow:'0 6px 20px rgba(0,0,0,0.08)', zIndex:50, maxHeight:280, overflowY:'auto' }}>
            {results.map(r => (
              <div key={r.id} onMouseDown={() => { clearTimeout(blurRef.current); pick(r); }}
                style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, fontSize:13 }}
                onMouseEnter={e => e.currentTarget.style.background = C.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ color:C.ink, fontWeight:500 }}>{r.name}</div>
                <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{r.full}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {height > 0 && <div style={{ marginTop:8, position:'relative' }}>
        <MapView center={center} zoom={hasPin ? 14 : 12} markers={markers} height={height} onClick={({ lng, lat }) => reverseGeo(lng, lat)} />
        <div style={{ position:'absolute', bottom:8, left:8, background:C.paper, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 10px', fontSize:11, color:C.muted, pointerEvents:'none' }}>
          Tap the map to drop a pin
        </div>
      </div>}
    </div>
  );
}
