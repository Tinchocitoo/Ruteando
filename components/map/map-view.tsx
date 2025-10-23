import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Route, Play, RotateCcw } from "lucide-react";

interface Address {
  id: string;
  street: string;
  city: string;
  zipCode: string;
  notes?: string;
  coordinates?: { lat: number; lng: number };
}

interface MapViewProps {
  addresses: Address[];
  onBack: () => void;
  onStartRoute?: () => void;
  showRouteControls?: boolean;
}

const DEFAULT_CENTER = { lat: 40.4168, lng: -3.7038 };

declare global {
  interface Window {
    google: typeof google;
  }
}

export function MapView({ addresses, onBack, onStartRoute, showRouteControls = true }: MapViewProps) {
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressesWithCoords, setAddressesWithCoords] = useState<Address[]>(addresses);
  const [isMapsReady, setIsMapsReady] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  /** Carga dinámica del script de Google Maps */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).google?.maps) {
      setIsMapsReady(true);
      return;
    }

    if (!googleMapsApiKey) {
      setScriptError("Falta la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsMapsReady(true);
    script.onerror = () => setScriptError("Error al cargar Google Maps.");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [googleMapsApiKey]);

  /** Inicializa el mapa */
  useEffect(() => {
    if (!isMapsReady || !mapElementRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapElementRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
  }, [isMapsReady]);

  /** Geocodifica direcciones */
  useEffect(() => {
    if (!isMapsReady) return;

    const googleMaps = window.google.maps;
    const geocoder = new googleMaps.Geocoder();
    setIsGeocoding(true);

    Promise.all(
      addresses.map(async (address) => {
        if (address.coordinates) return address;

        const formatted = [address.street, address.city, address.zipCode].filter(Boolean).join(", ");
        if (!formatted) return address;

        return new Promise<Address>((resolve) => {
          geocoder.geocode({ address: formatted }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              const loc = results[0].geometry.location;
              resolve({ ...address, coordinates: { lat: loc.lat(), lng: loc.lng() } });
            } else resolve(address);
          });
        });
      })
    ).then(setAddressesWithCoords).finally(() => setIsGeocoding(false));
  }, [addresses, isMapsReady]);

  /** Dibuja marcadores */
  useEffect(() => {
    if (!isMapsReady || !mapInstanceRef.current) return;
    const googleMaps = window.google.maps;
    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new googleMaps.LatLngBounds();

    addressesWithCoords.forEach((addr, i) => {
      if (!addr.coordinates) return;
      const pos = new googleMaps.LatLng(addr.coordinates.lat, addr.coordinates.lng);
      bounds.extend(pos);

      const marker = new googleMaps.Marker({
        position: pos,
        map,
        label: `${i + 1}`,
      });

      marker.addListener("click", () => setSelectedAddress(addr));
      markersRef.current.push(marker);
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds);
  }, [addressesWithCoords, isMapsReady]);

  /** Limpieza */
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      routePolylineRef.current?.setMap(null);
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-xl font-bold">Mapa de Entregas</h1>
          <p className="text-sm text-muted-foreground">
            {addresses.length} direcciones cargadas {routeCalculated && "• Ruta optimizada"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Vista del Mapa
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div ref={mapElementRef} className="h-[500px] w-full rounded-lg" />
          {!googleMapsApiKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-center px-6">
              <p className="text-sm text-muted-foreground">
                Configurá la variable de entorno <strong>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</strong>.
              </p>
            </div>
          )}
          {isGeocoding && (
            <div className="absolute top-4 right-4 bg-white rounded px-3 py-1.5 text-xs shadow">
              Geocodificando direcciones...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
