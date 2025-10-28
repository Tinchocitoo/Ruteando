"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Route, Play, RotateCcw } from "lucide-react";

import { Address } from "@/types/address";
import { apiCalcularRuta, apiIniciarRuta } from "@/services/api";
import type {
  DireccionBackend,
  CalcularRutaResponse,
  IniciarRutaResponse,
} from "@/types/backend";

interface MapViewProps {
  addresses: Address[];
  onBack: () => void;
  onStartRoute?: () => void;
  showRouteControls?: boolean;
  direccionesBackend?: DireccionBackend[];
  conductorId?: number;
}

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires

declare global {
  interface Window {
    google: typeof google;
  }
}

export function MapView({
  addresses,
  onBack,
  onStartRoute,
  showRouteControls = true,
  direccionesBackend = [],
  conductorId,
}: MapViewProps) {
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [rutaBackend, setRutaBackend] = useState<CalcularRutaResponse | null>(
    null
  );
  const mapRef = useRef<HTMLDivElement>(null);

  // 🔹 Instancia real del mapa de Google
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // 🔹 Polyline (la línea de ruta actual)
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 📦 convierte coordenadas a formato Google
  const toLatLngLiteral = (coords: {
    latitude: number;
    longitude: number;
  }) => ({
    lat: coords.latitude,
    lng: coords.longitude,
  });

  // 🔹 Cargar script de Google Maps
useEffect(() => {
  if (typeof window === "undefined") return;

  // Evita doble carga
  if (window.google?.maps?.geometry?.encoding) {
    initMap();
    return;
  }

  if (!googleMapsApiKey) {
    console.error("Falta API KEY de Google Maps");
    return;
  }

  if (document.getElementById("google-maps-script")) {
    console.warn("⚠️ Script de Google Maps ya existe, no se recarga");
    initMap();
    return;
  }

  console.log("🗺️ Cargando script único de Google Maps...");
  const script = document.createElement("script");
  script.id = "google-maps-script";
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=geometry`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    console.log("✅ Google Maps API completamente cargada");
    initMap();
  };
  document.head.appendChild(script);
}, [googleMapsApiKey]);


  const initMap = () => {
    if (mapInstanceRef.current) return; // evita duplicar
    if (!mapRef.current) return;

    const g = window.google.maps;

    mapInstanceRef.current = new g.Map(mapRef.current, {
      center: { lat: -34.6037, lng: -58.3816 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    const bounds = new g.LatLngBounds();
    addresses.forEach((addr) => {
      if (!addr.coordinates) return;
      const marker = new g.Marker({
        position: {
          lat: addr.coordinates.latitude,
          lng: addr.coordinates.longitude,
        },
        map: mapInstanceRef.current!,
        title: addr.street,
      });
      bounds.extend(marker.getPosition()!);
    });

    if (!bounds.isEmpty()) mapInstanceRef.current.fitBounds(bounds);
  };

const drawPolyline = (encodedPolyline: string, map: google.maps.Map) => {
  const g = (window as any).google;
  if (!g?.maps?.geometry?.encoding) {
    console.error("❌ Falta librería geometry");
    return;
  }

  // ✅ Obtené la referencia al constructor desde el mapa
  const PolylineClass = g.maps.importLibrary
    ? g.maps.importLibrary("maps").then((lib: any) => lib.Polyline)
    : Promise.resolve(g.maps.Polyline);

  PolylineClass.then((Polyline: any) => {
    if (!Polyline) {
      console.error("❌ No se pudo importar Polyline");
      return;
    }

    const path = g.maps.geometry.encoding.decodePath(encodedPolyline);
    const polyline = new Polyline({
      map,
      path,
      geodesic: true,
      strokeColor: "#1a73e8",
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });

    const bounds = new g.maps.LatLngBounds();
    path.forEach((p: google.maps.LatLng) => bounds.extend(p));
    map.fitBounds(bounds);

    console.log("✅ Polyline dibujada correctamente:", path.length, "puntos");
  });
};

  // 🧮 Calcular ruta usando tu backend
  const handleCalculateRoute = async () => {
    const payloadDirecciones: DireccionBackend[] = direccionesBackend.length
      ? direccionesBackend
      : addresses
          .filter(
            (a) =>
              a.coordinates &&
              typeof a.coordinates.latitude === "number" &&
              typeof a.coordinates.longitude === "number" &&
              !isNaN(a.coordinates.latitude) &&
              !isNaN(a.coordinates.longitude)
          )
          .map((a, idx) => ({
            id: idx + 1,
            texto_normalizado: a.street,
            latitud: a.coordinates!.latitude,
            longitud: a.coordinates!.longitude,
            piso: a.floor ?? null,
            depto: a.apartment ?? null,
            hash_direccion: `dir_${idx + 1}`,
            hash_geoloc: `geo_${a.coordinates!.latitude.toFixed(
              5
            )}_${a.coordinates!.longitude.toFixed(5)}`,
            cantidad_paquetes: 1,
          }));

    if (payloadDirecciones.length < 2) {
      alert("Necesitás al menos dos direcciones para calcular la ruta.");
      return;
    }

    setIsCalculatingRoute(true);
    try {
      console.log("🛰️ Enviando payload al backend...");
      const resp = await apiCalcularRuta({
        latitud_origen: -34.1786414, // UTN
        longitud_origen: -58.9624094,
        direcciones: payloadDirecciones,
      });

      console.log("✅ Respuesta del backend:", resp);
      setRutaBackend(resp);

      if (!resp.encoded_polyline) throw new Error("No vino encoded_polyline");

      if (!mapInstanceRef.current)
        throw new Error("Mapa no inicializado todavía");

      console.log("📍 Dibujando polyline...");
      drawPolyline(resp.encoded_polyline, mapInstanceRef.current!);

      setRouteCalculated(true);
      setDistance((resp.distancia_total_m / 1000).toFixed(1) + " km");
      setDuration(Math.round(resp.duracion_total_s / 60) + " min");

      console.log("✅ Ruta calculada y dibujada correctamente");
    } catch (e) {
      console.error("❌ Error en handleCalculateRoute:", e);
      alert("Hubo un problema al calcular la ruta.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleRecalculateRoute = () => {
    setRouteCalculated(false);
    setRutaBackend(null);
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
  };

  const handleStartRoute = async () => {
    if (!rutaBackend) {
      alert("Primero necesitás calcular la ruta.");
      return;
    }

    onStartRoute?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[#001B4E]">Mapa de entregas</h1>
          <p className="text-sm text-gray-600">
            {addresses.length} direcciones cargadas
            {routeCalculated && ` • ${distance} • ${duration}`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#001B4E]">
            <MapPin className="h-5 w-5" />
            Vista del mapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="h-[500px] w-full rounded-lg border" />
        </CardContent>
      </Card>

      {showRouteControls && (
        <div className="space-y-4">
          {!routeCalculated ? (
            <Button
              onClick={handleCalculateRoute}
              disabled={isCalculatingRoute}
              className="w-full text-white"
              style={{ backgroundColor: "rgb(0,27,78)" }}
            >
              {isCalculatingRoute ? "Calculando..." : "Calcular ruta"}
            </Button>
          ) : (
            <div className="space-y-3">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#001B4E]">
                        Ruta calculada
                      </p>
                      <p className="text-sm text-gray-600">
                        {distance} • {duration}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#001B4E]/50 text-[#001B4E]"
                      onClick={handleRecalculateRoute}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleStartRoute}
                className="w-full text-white"
                style={{ backgroundColor: "rgb(0,27,78)" }}
              >
                <Play className="mr-2 h-5 w-5" />
                Iniciar recorrido
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
