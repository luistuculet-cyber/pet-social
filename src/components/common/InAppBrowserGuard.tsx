"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";

export function InAppBrowserGuard() {
  const [isInApp, setIsInApp] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    // Regex robusto para detectar navegadores integrados de redes sociales y mensajería
    const inAppRegex = /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line|LinkedInApp|Twitter/i;
    const detectedInApp = inAppRegex.test(ua);

    if (detectedInApp) {
      setIsInApp(true);
      const androidDetected = /Android/i.test(ua);
      setIsAndroid(androidDetected);

      // Intento automático en Android mediante Intent scheme (una vez por sesión)
      if (androidDetected && !sessionStorage.getItem("avo_inapp_redirect_tried")) {
        sessionStorage.setItem("avo_inapp_redirect_tried", "true");
        try {
          const currentUrl = window.location.href.replace(/^https?:\/\//, "");
          const intentUrl = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
          window.location.href = intentUrl;
        } catch (e) {
          console.warn("No se pudo ejecutar redirección automática Intent:", e);
        }
      }
    }
  }, []);

  if (!isInApp || dismissed) return null;

  const handleOpenInChrome = () => {
    try {
      const currentUrl = window.location.href.replace(/^https?:\/\//, "");
      const intentUrl = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    } catch (e) {
      console.error("Error intent Chrome open:", e);
    }
  };

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 text-amber-200 shadow-lg backdrop-blur-md z-50">
      <div className="max-w-4xl mx-auto flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-300">
              Navegador Interno Detectado
            </p>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Para poder usar la cámara y el micrófono en la consulta, por favor toca los{" "}
              <strong className="text-white underline">3 puntos</strong> (o el botón de compartir) arriba a la derecha y selecciona{" "}
              <strong className="text-white">&quot;Abrir en el navegador (Safari o Chrome)&quot;</strong>.
            </p>
            {isAndroid && (
              <button
                type="button"
                onClick={handleOpenInChrome}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir en Chrome Ahora
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-400/70 hover:text-amber-300 transition-colors rounded-lg"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
