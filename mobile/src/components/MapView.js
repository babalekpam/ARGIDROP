// MapTiler-based map for mobile — uses WebView + maplibre-gl JS for Expo Go
// compatibility (no native module / EAS build required) and stays consistent
// with the web app's MapTiler integration.
//
// Lifecycle: HTML is built ONCE per styleUrl. All updates (markers, center,
// zoom, user location) flow through postMessage. The page sends a 'ready'
// event after maplibre 'load'; messages received before ready are queued and
// flushed on ready.
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const MAPTILER_KEY =
  process.env.EXPO_PUBLIC_MAPTILER_KEY ||
  Constants?.expoConfig?.extra?.maptilerKey ||
  Constants?.manifest?.extra?.maptilerKey ||
  '';

const DEFAULT_CENTER = { latitude: 6.1319, longitude: 1.2228 }; // Lomé

function buildHtml(styleUrl) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
<link href="https://cdn.maptiler.com/maplibre-gl-js/v3.6.2/maplibre-gl.css" rel="stylesheet" />
<script src="https://cdn.maptiler.com/maplibre-gl-js/v3.6.2/maplibre-gl.js"></script>
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#F7F3EB; }
  .pickup-pin { width:24px; height:24px; border-radius:50%; background:#8B6F47; border:3px solid #FDFBF6; box-shadow:0 2px 4px rgba(0,0,0,0.2); }
  .dropoff-pin { width:24px; height:24px; border-radius:50%; background:#1B4332; border:3px solid #FDFBF6; box-shadow:0 2px 4px rgba(0,0,0,0.2); }
  .job-pin { min-width:36px; height:22px; padding:0 4px; border-radius:4px; background:#1B4332; color:#FDFBF6; display:flex; align-items:center; justify-content:center; font:600 11px system-ui; border:2px solid #FDFBF6; box-shadow:0 2px 4px rgba(0,0,0,0.2); }
  .me-dot { width:16px; height:16px; border-radius:50%; background:#1B4332; border:3px solid #FDFBF6; box-shadow:0 0 0 6px rgba(27,67,50,0.18); }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var post = function(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var map = new maplibregl.Map({
    container: 'map',
    style: ${JSON.stringify(styleUrl)},
    center: [${DEFAULT_CENTER.longitude}, ${DEFAULT_CENTER.latitude}],
    zoom: 12,
    attributionControl: false,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  var markerEls = [];
  var meMarker = null;
  var ready = false;
  var queue = [];

  function makeMarkerEl(m){
    var el = document.createElement('div');
    el.className = m.type === 'pickup' ? 'pickup-pin'
      : m.type === 'dropoff' ? 'dropoff-pin'
      : 'job-pin';
    if (m.label) el.textContent = String(m.label);
    return el;
  }

  function setMarkers(markers){
    markerEls.forEach(function(mk){ mk.remove(); });
    markerEls = (markers || []).map(function(m){
      var el = makeMarkerEl(m);
      var mk = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
      return mk;
    });
  }

  function setUserLocation(loc){
    if (!loc) {
      if (meMarker) { meMarker.remove(); meMarker = null; }
      return;
    }
    var lngLat = [loc.longitude, loc.latitude];
    if (!meMarker) {
      var el = document.createElement('div'); el.className = 'me-dot';
      meMarker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
    } else {
      meMarker.setLngLat(lngLat);
    }
  }

  function applyMessage(msg){
    if (!msg) return;
    if (msg.markers) setMarkers(msg.markers);
    if ('userLocation' in msg) setUserLocation(msg.userLocation);
    if (msg.center) {
      map.flyTo({
        center: [msg.center.longitude, msg.center.latitude],
        zoom: typeof msg.zoom === 'number' ? msg.zoom : map.getZoom(),
        essential: true,
      });
    } else if (typeof msg.zoom === 'number') {
      map.setZoom(msg.zoom);
    }
  }

  function handleMessage(e){
    try { var msg = JSON.parse(e.data); } catch (err) { return; }
    if (!ready) { queue.push(msg); return; }
    applyMessage(msg);
  }
  window.addEventListener('message', handleMessage);
  document.addEventListener('message', handleMessage);

  map.on('load', function(){
    ready = true;
    post({ event: 'ready' });
    while (queue.length) applyMessage(queue.shift());
  });
  map.on('click', function(e){
    post({ event: 'click', lat: e.lngLat.lat, lng: e.lngLat.lng });
  });
  map.on('moveend', function(){
    var c = map.getCenter();
    post({ event: 'moveend', lat: c.lat, lng: c.lng });
  });
  map.on('error', function(e){
    post({ event: 'error', message: (e && e.error && e.error.message) || 'map error' });
  });
})();
</script>
</body>
</html>`;
}

export default function MapView({
  center,
  zoom = 13,
  markers = [],
  showUserLocation = false,
  userLocation = null,
  style,
  onMapPress,
  onMoveEnd,
}) {
  const webRef = useRef(null);
  const readyRef = useRef(false);
  const pendingRef = useRef(null);

  const styleUrl = useMemo(
    () =>
      MAPTILER_KEY
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
        : 'https://demotiles.maplibre.org/style.json',
    []
  );

  // HTML is built once per styleUrl — all data flows through postMessage
  const html = useMemo(() => buildHtml(styleUrl), [styleUrl]);

  const send = useCallback((msg) => {
    const payload = JSON.stringify(msg);
    if (readyRef.current && webRef.current) {
      webRef.current.postMessage(payload);
    } else {
      // Stash latest pending state — coalesce so we only flush the last one
      pendingRef.current = { ...(pendingRef.current || {}), ...msg };
    }
  }, []);

  // Push current state whenever inputs change
  useEffect(() => {
    send({
      markers,
      center: center || DEFAULT_CENTER,
      zoom,
      userLocation: showUserLocation ? userLocation || center : null,
    });
  }, [
    JSON.stringify(markers),
    center?.latitude,
    center?.longitude,
    zoom,
    showUserLocation,
    userLocation?.latitude,
    userLocation?.longitude,
    send,
  ]);

  const onMessage = useCallback((evt) => {
    try {
      const msg = JSON.parse(evt.nativeEvent.data);
      if (msg?.event === 'ready') {
        readyRef.current = true;
        if (pendingRef.current && webRef.current) {
          webRef.current.postMessage(JSON.stringify(pendingRef.current));
          pendingRef.current = null;
        }
      } else if (msg?.event === 'click' && typeof onMapPress === 'function') {
        onMapPress(msg.lat, msg.lng);
      } else if (msg?.event === 'moveend' && typeof onMoveEnd === 'function') {
        onMoveEnd(msg.lat, msg.lng);
      }
    } catch {}
  }, [onMapPress, onMoveEnd]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://argidrop.app/' }}
        style={styles.web}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color="#1B4332" />
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EB', overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#F7F3EB' },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7F3EB',
  },
});
