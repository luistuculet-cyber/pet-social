import { create } from 'zustand';
import { DispatchRequest } from '@/types';

interface AppState {
  // Estado de Ubicación y Triage del Tutor
  tutorLocation: { lat: number; lng: number } | null;
  setTutorLocation: (loc: { lat: number; lng: number }) => void;
  
  tutorServiceType: 'video' | 'domicilio';
  setTutorServiceType: (type: 'video' | 'domicilio') => void;
  
  tutorSymptoms: string[];
  setTutorSymptoms: (symptoms: string[]) => void;
  
  // Estado del Despacho Actual
  currentDispatch: DispatchRequest | null;
  setCurrentDispatch: (dispatch: DispatchRequest | null) => void;
  
  // Estado del Veterinario
  isVetAvailable: boolean;
  setVetAvailable: (available: boolean) => void;
  
  vetAvailableForVideo: boolean;
  setVetAvailableForVideo: (available: boolean) => void;
  
  vetAvailableForHome: boolean;
  setVetAvailableForHome: (available: boolean) => void;
  
  vetLocation: { lat: number; lng: number } | null;
}

export const useStore = create<AppState>((set) => ({
  tutorLocation: null,
  setTutorLocation: (loc) => set({ tutorLocation: loc }),
  
  tutorServiceType: 'domicilio',
  setTutorServiceType: (type) => set({ tutorServiceType: type }),
  
  tutorSymptoms: [],
  setTutorSymptoms: (symptoms) => set({ tutorSymptoms: symptoms }),
  
  currentDispatch: null,
  setCurrentDispatch: (dispatch) => {
    set({ currentDispatch: dispatch });
    // Mock Realtime: Guardar en localStorage para que otras pestañas se enteren o remover al limpiar
    if (typeof window !== 'undefined') {
      if (!dispatch || dispatch.status === 'completed' || dispatch.status === 'cancelled') {
        localStorage.removeItem('mock_realtime_dispatch');
        localStorage.removeItem('avo_pending_request');
      } else {
        localStorage.setItem('mock_realtime_dispatch', JSON.stringify(dispatch));
      }
    }
  },
  
  isVetAvailable: false,
  setVetAvailable: (available) => set({ isVetAvailable: available }),
  
  vetAvailableForVideo: true,
  setVetAvailableForVideo: (available) => set((state) => {
    const nextVideo = available;
    const nextHome = state.vetAvailableForHome;
    return {
      vetAvailableForVideo: nextVideo,
      isVetAvailable: nextVideo || nextHome,
    };
  }),
  
  vetAvailableForHome: true,
  setVetAvailableForHome: (available) => set((state) => {
    const nextHome = available;
    const nextVideo = state.vetAvailableForVideo;
    return {
      vetAvailableForHome: nextHome,
      isVetAvailable: nextVideo || nextHome,
    };
  }),
  
  vetLocation: { lat: -34.6037, lng: -58.3816 }, // Ejemplo: Buenos Aires
}));

// Escuchar cambios en otras pestañas para simular Supabase Realtime
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'mock_realtime_dispatch') {
      try {
        const dispatch = e.newValue ? JSON.parse(e.newValue) : null;
        useStore.setState({ currentDispatch: dispatch });
      } catch (error) {
        console.error("Error sync dispatch", error);
      }
    }
  });
}
