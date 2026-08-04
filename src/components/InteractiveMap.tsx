'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeocoding } from '@/hooks/useGeocoding';

export interface InteractiveMapProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  readOnly?: boolean;
  title?: string;
  className?: string;
  height?: string;
  showSearch?: boolean;
}

export default function InteractiveMap({
  initialLat = -34.598,
  initialLng = -58.421,
  initialAddress = '',
  onLocationSelect,
  readOnly = false,
  className = '',
  height = '380px',
  showSearch = true,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>(initialAddress);
  const [searchQuery, setSearchQuery] = useState<string>(initialAddress);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { geocode, reverseGeocode, isLoading: isGeocoding } = useGeocoding();

  const notifyStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleReverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      const foundAddress = await reverseGeocode(latitude, longitude);
      const displayAddr = foundAddress || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setAddress(displayAddr);
      setSearchQuery(displayAddr);
      if (onLocationSelect) {
        onLocationSelect(latitude, longitude, displayAddr);
      }
    },
    [reverseGeocode, onLocationSelect]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    import('leaflet').then((leafletModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = leafletModule.default || leafletModule;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 16,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="
            background: #0ea5e9;
            border: 3px solid #ffffff;
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 8px; height: 8px; background: #fff; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const marker = L.marker([initialLat, initialLng], {
          icon: customIcon,
          draggable: !readOnly,
        }).addTo(map);

        if (!readOnly) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            const { lat: newLat, lng: newLng } = e.latlng;
            marker.setLatLng([newLat, newLng]);
            setLat(newLat);
            setLng(newLng);
            handleReverseGeocode(newLat, newLng);
            notifyStatus('📍 Punto seleccionado en el mapa.');
          });

          marker.on('dragend', (e: L.LeafletEvent) => {
            const pos = (e.target as L.Marker).getLatLng();
            setLat(pos.lat);
            setLng(pos.lng);
            handleReverseGeocode(pos.lat, pos.lng);
            notifyStatus('📍 Pin reposicionado.');
          });
        }

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.setView([initialLat, initialLng], 16);
        if (markerRef.current) {
          markerRef.current.setLatLng([initialLat, initialLng]);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialLat, initialLng, readOnly, handleReverseGeocode]);

  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const result = await geocode(searchQuery);
    if (result) {
      setLat(result.lat);
      setLng(result.lng);
      setAddress(result.displayName);
      setSearchQuery(result.displayName);

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([result.lat, result.lng], 17);
        markerRef.current.setLatLng([result.lat, result.lng]);
      }

      if (onLocationSelect) {
        onLocationSelect(result.lat, result.lng, result.displayName);
      }
      notifyStatus('✅ Dirección encontrada y pin posicionado.');
    } else {
      notifyStatus('⚠️ No encontramos esa dirección en el mapa. Selecciona el punto haciendo clic.');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {statusMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {showSearch && !readOnly && (
        <form onSubmit={handleSearchAddress} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ej: Segurola 1149, Sourdeaux o calle y localidad..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={isGeocoding}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-sky-500/20 shrink-0"
          >
            {isGeocoding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Navigation size={14} />
            )}
            <span>Buscar</span>
          </button>
        </form>
      )}

      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-lg bg-slate-900">
        <div
          ref={mapContainerRef}
          style={{ height, width: '100%' }}
          className="z-10 bg-slate-900"
        />

        <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-950/90 border border-slate-700/80 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-2 truncate">
            <MapPin size={15} className="text-sky-400 shrink-0" />
            <span className="text-slate-300 truncate">
              {isGeocoding ? (
                <span className="italic text-slate-400">Obteniendo dirección de calle...</span>
              ) : address ? (
                <strong className="text-white font-medium">{address}</strong>
              ) : (
                <span className="text-slate-400">Haz clic en el mapa o arrastra el pin</span>
              )}
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-sky-400 shrink-0 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      </div>

      {!readOnly && (
        <p className="text-[11px] text-slate-400 text-center font-medium">
          💡 Puedes hacer clic en cualquier punto del mapa o arrastrar el marcador para fijar la ubicación exacta.
        </p>
      )}
    </div>
  );
}
