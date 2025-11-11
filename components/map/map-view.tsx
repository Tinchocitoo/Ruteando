"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Play, RotateCcw } from "lucide-react";

import { Address } from "@/types/address";
import { apiCalcularRuta } from "@/services/api";
import type {
  DireccionBackend,
  CalcularRutaResponse,
} from "@/types/backend";

interface MapViewProps {
  addresses: Address[];
  onBack: () => void;
  onStartRoute?: (rutaId: number) => void;
  onRouteCalculated?: (orderedAddresses: Address[], rutaId: number) => void;
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
  onRouteCalculated,
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
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

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

    if (window.google?.maps?.geometry?.encoding) {
      initMap();
      return;
    }

    if (!googleMapsApiKey) {
      console.error("Falta API KEY de Google Maps");
      return;
    }

    if (document.getElementById("google-maps-script")) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, [googleMapsApiKey]);

  const initMap = () => {
    if (mapInstanceRef.current || !mapRef.current) return;
    const g = window.google.maps;

    mapInstanceRef.current = new g.Map(mapRef.current, {
      center: DEFAULT_CENTER,
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

    const path = g.maps.geometry.encoding.decodePath(encodedPolyline);

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    routePolylineRef.current = new g.maps.Polyline({
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
  };

  const handleCalculateRoute = async () => {
  console.log('calculando')
  setRouteCalculated(false);
  setRutaBackend(null);
  setDistance("");
  setDuration("");
  setIsCalculatingRoute(true);
  // Limpiar direcciones ordenadas al empezar a calcular
  onRouteCalculated?.([], 0);

    if (routePolylineRef.current) {
    routePolylineRef.current.setMap(null);
    routePolylineRef.current = null;
  }
    try {
      const ORIGEN = { latitud: -34.1786414, longitud: -58.9624094 }; // UTN Campana, por ejemplo

      const payloadDirecciones: DireccionBackend[] = [
        {
          id: 0,
          texto_normalizado: "Origen",
          latitud: ORIGEN.latitud,
          longitud: ORIGEN.longitud,
          piso: null,
          depto: null,
          hash_direccion: "origen",
          hash_geoloc: `geo_${ORIGEN.latitud}_${ORIGEN.longitud}`,
          cantidad_paquetes: 0,
        },
        ...(direccionesBackend.length
          ? direccionesBackend
          : addresses
              .filter(
                (a) =>
                  a.coordinates &&
                  typeof a.coordinates.latitude === "number" &&
                  typeof a.coordinates.longitude === "number"
              )
              .map((a, idx) => ({
                id: idx + 1,
                texto_normalizado: a.street,
                latitud: a.coordinates!.latitude,
                longitud: a.coordinates!.longitude,
                piso: a.floor ?? null,
                depto: a.apartment ?? null,
                hash_direccion: `dir_${idx + 1}`,
                hash_geoloc: a.hash_geoloc || `geo_${a.coordinates!.latitude.toFixed(5)}_${a.coordinates!.longitude.toFixed(5)}`,
                cantidad_paquetes: 1,
              }))),
      ];

      if (payloadDirecciones.length < 2) {
        alert("Necesitás al menos una dirección además del origen.");
        return;
      }

      console.log("🛰️ Enviando payload al backend...", payloadDirecciones);
      const resp = await apiCalcularRuta({
        latitud_origen: ORIGEN.latitud,
        longitud_origen: ORIGEN.longitud,
        direcciones: payloadDirecciones,
      });

      console.log("✅ Respuesta del backend:", resp);
      setRutaBackend(resp);

      if (!resp.encoded_polyline)
        throw new Error("No vino encoded_polyline en la respuesta");

      if (!mapInstanceRef.current)
        throw new Error("Mapa no inicializado todavía");

      drawPolyline(resp.encoded_polyline, mapInstanceRef.current!);
      setRouteCalculated(true);
      setDistance((resp.distancia_total_m / 1000).toFixed(1) + " km");
      setDuration(Math.round(resp.duracion_total_s / 60) + " min");

      // Convertir direcciones ordenadas del backend a Address[]
      const puntosOrdenados = [...resp.puntos_ruta].sort(
        (a, b) => a.orden - b.orden
      );
      
      // Crear un mapa de direcciones originales por coordenadas para preservar datos adicionales
      const addressMap = new Map<string, Address>();
      addresses.forEach((addr) => {
        if (addr.coordinates) {
          const key = `${addr.coordinates.latitude.toFixed(5)}_${addr.coordinates.longitude.toFixed(5)}`;
          addressMap.set(key, addr);
        }
      });

      // Convertir direcciones del backend ordenadas a Address[]
      const orderedAddresses: Address[] = puntosOrdenados
        .flatMap((punto) => punto.direcciones_fisicas)
        // Excluir el ORIGEN u otros puntos sin entrega (paquetes 0)
        .filter((dir) => {
          const isOriginId = (dir as any).id === 0;
          const isOriginText = typeof (dir as any).texto_normalizado === 'string' && (dir as any).texto_normalizado.toLowerCase().includes('origen');
          const hasPackages = (dir as any).cantidad_paquetes === undefined || (dir as any).cantidad_paquetes > 0;
          return !isOriginId && !isOriginText && hasPackages;
        })
        .map((dir) => {
          const key = `${dir.latitud.toFixed(5)}_${dir.longitud.toFixed(5)}`;
          const originalAddr = addressMap.get(key);
          
          // Si encontramos la dirección original, usarla pero preservar el orden del backend
          if (originalAddr) {
            return {
              ...originalAddr,
              hash_geoloc: (dir as any).hash_geoloc || originalAddr.hash_geoloc,
            };
          }
          
          // Si no, crear una nueva Address desde DireccionBackend
          return {
            id: `backend_${dir.id}`,
            street: dir.texto_normalizado,
            city: "", // El backend no siempre tiene ciudad separada
            zipCode: undefined,
            state: undefined,
            country: undefined,
            apartment: dir.depto || undefined,
            floor: dir.piso || undefined,
            coordinates: {
              latitude: dir.latitud,
              longitude: dir.longitud,
            },
            hash_geoloc: (dir as any).hash_geoloc,
          };
        });

      console.log("✅ Direcciones ordenadas del backend:", orderedAddresses);
      
      // Notificar al componente padre sobre las direcciones ordenadas y el ruta_id
      onRouteCalculated?.(orderedAddresses, resp.ruta_id);

      console.log("✅ Ruta calculada y dibujada correctamente");
    } catch (e) {
      console.error("❌ Error al calcular la ruta:", e);
      alert("Hubo un problema al calcular la ruta.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // 🔁 Recalcular
const handleRecalculateRoute = async () => {
  console.log('REcalculando')
  setRouteCalculated(false);
  setRutaBackend(null);
  setDistance("");
  setDuration("");
  setIsCalculatingRoute(true);
  // Limpiar direcciones ordenadas cuando se recalcula
  onRouteCalculated?.([], 0);

  console.log("hay poliline",routePolylineRef)
  // 🧹 Eliminar polyline anterior
  if (routePolylineRef.current) {
    routePolylineRef.current.setMap(null);
    routePolylineRef.current = null;
  }
  console.log("Modif", routePolylineRef)

  // 🧹 Reiniciar el mapa a su estado base
  if (mapInstanceRef.current) {
    const g = window.google.maps;
    mapInstanceRef.current = new g.Map(mapRef.current!, {
      center: DEFAULT_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
  }

  await handleCalculateRoute();
};


  // ▶️ Iniciar ruta → abre Google Maps
  const handleStartRoute = async () => {
    if (!rutaBackend) {
      alert("Primero necesitás calcular la ruta.");
      return;
    }

    // Incluye también el origen
    const ORIGEN = { lat: -34.1786414, lng: -58.9624094 };

    // Usar el orden del backend desde puntos_ruta (ordenados por 'orden')
    const puntosOrdenados = [...rutaBackend.puntos_ruta].sort(
      (a, b) => a.orden - b.orden
    );

    // Extraer coordenadas del backend en el orden correcto
    const coordsList = [
      ORIGEN,
      ...puntosOrdenados
        .flatMap((punto) => punto.direcciones_fisicas)
        .map((dir) => ({
          lat: dir.latitud,
          lng: dir.longitud,
        })),
    ];

    if (coordsList.length < 2) {
      alert("Faltan coordenadas válidas para el recorrido.");
      return;
    }

    const origin = `${coordsList[0].lat},${coordsList[0].lng}`;
    const destination = `${coordsList[coordsList.length - 1].lat},${coordsList[coordsList.length - 1].lng}`;
    const waypoints = coordsList
      .slice(1, -1)
      .map((c) => `${c.lat},${c.lng}`)
      .join("|");

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;

    console.log("🗺️ Abriendo ruta en Google Maps:", mapsUrl);
    window.open(mapsUrl, "_blank");

    // Pasar el ruta_id al callback
    if (rutaBackend) {
      onStartRoute?.(rutaBackend.ruta_id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
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

      {/* Mapa */}
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

      {/* Controles */}
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
