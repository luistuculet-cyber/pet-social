'use client';

import { useState, useCallback } from 'react';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface UseGeocodingReturn {
  geocode: (address: string) => Promise<GeocodeResult | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export function useGeocoding(): UseGeocodingReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const geocode = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    if (!address.trim()) return null;
    setIsLoading(true);
    setError(null);
    try {
      const cleanAddr = address.trim();
      const query = cleanAddr.toLowerCase().includes('argentina')
        ? cleanAddr
        : `${cleanAddr}, Argentina`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al conectar con el servicio de mapas');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }

      setError('No se encontraron coordenadas para esa dirección');
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Error al geolocalizar la dirección');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error de reverse geocoding');
      }

      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
      return 'Ubicación seleccionada en mapa';
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      setError('No se pudo obtener la dirección de esas coordenadas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    geocode,
    reverseGeocode,
    isLoading,
    error,
  };
}
