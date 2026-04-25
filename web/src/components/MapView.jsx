import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
const STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;
const LOME = [1.2228, 6.1319];

export default function MapView({ center = LOME, zoom = 12, markers = [], routes = [], onClick, height = 520, fitToMarkers = false, style = {} }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerObjsRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE,
        center,
        zoom,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      map.on('load', () => setReady(true));
      map.on('error', e => {
        const msg = e?.error?.message || '';
        if (/webgl/i.test(msg)) setFailure('WebGL is not available in this browser. Maps require WebGL support.');
      });
      if (onClick) map.on('click', e => onClick({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
      mapRef.current = map;
    } catch (err) {
      const msg = err?.message || String(err);
      if (/webgl/i.test(msg)) setFailure('WebGL is not available in this browser. Maps require WebGL support.');
      else setFailure('Map could not initialize: ' + msg);
    }
    return () => { try { map?.remove(); } catch {} mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markerObjsRef.current.forEach(m => m.remove());
    markerObjsRef.current = [];
    markers.forEach(m => {
      if (!Number.isFinite(m.lng) || !Number.isFinite(m.lat)) return;
      const el = document.createElement('div');
      el.style.cssText = `width:${m.size||14}px;height:${m.size||14}px;border-radius:50%;background:${m.color||'#1B4332'};border:2px solid #FDFBF6;box-shadow:0 1px 4px rgba(0,0,0,0.25);cursor:${m.onClick?'pointer':'default'};`;
      if (m.pulse) {
        el.style.animation = 'pulseDot 2s ease-out infinite';
        if (!document.getElementById('pulseDotStyle')) {
          const s = document.createElement('style'); s.id = 'pulseDotStyle';
          s.textContent = '@keyframes pulseDot{0%{box-shadow:0 0 0 0 rgba(27,67,50,0.6)}70%{box-shadow:0 0 0 14px rgba(27,67,50,0)}100%{box-shadow:0 0 0 0 rgba(27,67,50,0)}}';
          document.head.appendChild(s);
        }
      }
      if (m.onClick) el.addEventListener('click', e => { e.stopPropagation(); m.onClick(); });
      const mk = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]);
      if (m.label) mk.setPopup(new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`<div style="font:12px Inter,sans-serif;color:#1A1A1A">${m.label}</div>`));
      mk.addTo(map);
      markerObjsRef.current.push(mk);
    });
  }, [markers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    routes.forEach((r, i) => {
      const id = `route-${i}`;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
      if (!r.coords || r.coords.length < 2) return;
      map.addSource(id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: r.coords } } });
      map.addLayer({ id, type: 'line', source: id, paint: { 'line-color': r.color || '#1B4332', 'line-width': r.width || 3, 'line-opacity': r.opacity ?? 0.8, ...(r.dashed ? { 'line-dasharray': [2, 2] } : {}) } });
    });
    return () => {
      routes.forEach((_, i) => {
        const id = `route-${i}`;
        if (mapRef.current && mapRef.current.getLayer && mapRef.current.getLayer(id)) mapRef.current.removeLayer(id);
        if (mapRef.current && mapRef.current.getSource && mapRef.current.getSource(id)) mapRef.current.removeSource(id);
      });
    };
  }, [routes, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !fitToMarkers) return;
    const pts = markers.filter(m => Number.isFinite(m.lng) && Number.isFinite(m.lat));
    if (pts.length === 0) return;
    if (pts.length === 1) { map.flyTo({ center: [pts[0].lng, pts[0].lat], zoom: 14 }); return; }
    const b = new maplibregl.LngLatBounds();
    pts.forEach(p => b.extend([p.lng, p.lat]));
    map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 });
  }, [markers, ready, fitToMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || fitToMarkers) return;
    if (!Array.isArray(center) || center.length !== 2) return;
    const [lng, lat] = center;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    map.easeTo({ center: [lng, lat], zoom, duration: 500 });
  }, [center?.[0], center?.[1], zoom, ready, fitToMarkers]);

  if (!KEY) {
    return (
      <div style={{ height, background:'#FBF7EE', border:'1px solid #E4DCC9', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#9B2C2C', fontSize:13, fontFamily:'Inter, sans-serif', padding:16, textAlign:'center', ...style }}>
        Missing VITE_MAPTILER_KEY — add it in Secrets to enable maps.
      </div>
    );
  }

  return (
    <div style={{ position:'relative', width:'100%', height, borderRadius:8, overflow:'hidden', ...style }}>
      <div ref={containerRef} style={{ width:'100%', height:'100%' }} />
      {failure && (
        <div style={{ position:'absolute', inset:0, background:'#FBF7EE', display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', color:'#6B6560', fontSize:13, fontFamily:'Inter, sans-serif', border:'1px solid #E4DCC9', borderRadius:8 }}>
          {failure}
        </div>
      )}
    </div>
  );
}
