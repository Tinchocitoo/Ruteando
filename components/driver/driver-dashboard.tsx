"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, PlusCircle, Upload } from "lucide-react"

import { Address } from "@/types/address"
import { apiCargarDirecciones, apiActualizarDireccion, apiEliminarDireccion } from "@/services/api"
import type { CargarDireccionesRequest, DireccionBackend, FrontAddressPayload } from "@/types/backend"

interface DriverDashboardProps {
  onLoadAddresses: (addresses: Address[]) => void
  onViewMap: () => void
  deliveries?: any[]
  onDireccionesBackend?: (d: DireccionBackend[]) => void // <-- para pasar al MapView lo que devuelve backend
  direccionesBackend?: DireccionBackend[]
}

export function DriverDashboard({ onLoadAddresses, onViewMap, deliveries = [], onDireccionesBackend, direccionesBackend = [] }: DriverDashboardProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [mapsReady, setMapsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ piso?: string; depto?: string }>({})

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState<Address>({
    id: "",
    street: "",
    apartment: "",
    floor: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    coordinates: undefined,
  })

useEffect(() => {
  if (typeof window === "undefined") return
  if ((window as any).google?.maps?.places) {
    setMapsReady(true)
    return
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return

  if (document.querySelector("#places-script")) {
    setMapsReady(true); return
  }

  const script = document.createElement("script")
  script.id = "places-script"
  script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
  script.async = true
  script.defer = true
  script.onload = () => setMapsReady(true)
  document.head.appendChild(script)
}, [])


useEffect(() => {
  if (!mapsReady || !inputRef.current) return;

  // Espera hasta que google.maps.places exista realmente
  const waitForGoogle = () => {
    if (typeof window === "undefined" || !window.google?.maps?.places) {
      console.warn("⏳ Esperando que Google Maps esté listo...");
      setTimeout(waitForGoogle, 300);
      return;
    }

    console.log("✅ Google Maps Places completamente cargado");

    // Inicializa el autocompletado
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current!, {
      fields: ["address_components", "geometry", "formatted_address"],
      // componentRestrictions: { country: "ar" }, // opcional
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      const comp: Record<string, string> = {};
      place.address_components?.forEach((c) => {
        for (const t of c.types) comp[t] = c.long_name;
      });

      setForm((prev) => ({
        ...prev,
        street: place.formatted_address ?? "",
        city: comp.locality || comp.administrative_area_level_2 || "",
        state: comp.administrative_area_level_1 || "",
        zipCode: comp.postal_code || "",
        country: comp.country || "",
        coordinates: { latitude: lat, longitude: lng },
      }));
    });
  };

  waitForGoogle();
}, [mapsReady]);

  const handleChange = (field: keyof Address, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddAddress = () => {
    if (!form.street || !form.city) {
      alert("Completá al menos la dirección y la ciudad.")
      return
    }
    const newAddress = { ...form, id: crypto.randomUUID() }
    setAddresses((prev) => [...prev, newAddress])
    setForm({ id: "", street: "", apartment: "", floor: "", city: "", state: "", zipCode: "", country: "", coordinates: undefined })
    if (inputRef.current) inputRef.current.value = ""
  }

  // Edición/Borrado en backend
  const handleEditBackend = (d: DireccionBackend) => {
    setEditingId(d.id)
    setEditForm({ piso: d.piso ?? "", depto: d.depto ?? "" })
  }

  const handleSaveBackend = async (d: DireccionBackend) => {
    try {
      setLoading(true)
      const updated = await apiActualizarDireccion(d.id, { floor: editForm.piso ?? null, apartment: editForm.depto ?? null })
      const next = direccionesBackend.map((x) => (x.id === d.id ? { ...x, piso: updated.piso, depto: updated.depto } : x))
      onDireccionesBackend?.(next)
      setEditingId(null)
    } catch (e) {
      console.error(e)
      alert("No se pudo actualizar la dirección en el backend.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBackend = async (d: DireccionBackend) => {
    if (!confirm(`Eliminar "${d.texto_normalizado}"?`)) return
    try {
      setLoading(true)
      await apiEliminarDireccion(d.id)
      const next = direccionesBackend.filter((x) => x.id !== d.id)
      onDireccionesBackend?.(next)
    } catch (e) {
      console.error(e)
      alert("No se pudo eliminar la dirección en el backend.")
    } finally {
      setLoading(false)
    }
  }

  // 👉 Enviar al backend para normalizar y guardar
  const handleSendToBackend = async () => {
    if (addresses.length === 0) {
      alert("Agregá al menos una dirección.")
      return
    }

    const payload: CargarDireccionesRequest = {
      direcciones: addresses.map<FrontAddressPayload>((a) => ({
        address: {
          formatted_address: a.street,
          components: {
            route: undefined,
            street_number: undefined,
            locality: a.city,
            administrative_area_level_1: a.state,
            country: a.country,
            postal_code: a.zipCode,
          },
          location: {
            lat: a.coordinates?.latitude ?? 0,
            lng: a.coordinates?.longitude ?? 0,
          },
        },
        floor: a.floor ?? undefined,
        apartment: a.apartment ?? undefined,
        packages: 1,
      })),
    }

    try {
      setLoading(true)
      const resp = await apiCargarDirecciones(payload)
      onDireccionesBackend?.(resp.direcciones)
      // Además, mantiene compatibilidad con vistas actuales
      onLoadAddresses(addresses)
      onViewMap()
    } catch (e: any) {
      console.error(e)
      alert("Error al enviar direcciones al backend.")
    } finally {
      setLoading(false)
    }
  }

  const handleLoadExample = () => {
    const example: Address[] = [
      { id: "1", street: "Av. Santa Fe 1234, CABA", city: "Buenos Aires", state: "CABA", zipCode: "C1059", country: "Argentina", coordinates: { latitude: -34.5965, longitude: -58.4042 } },
      { id: "2", street: "Av. Cabildo 4321, CABA", city: "Buenos Aires", state: "CABA", zipCode: "C1426", country: "Argentina", coordinates: { latitude: -34.5595, longitude: -58.459 } },
    ]
    setAddresses(example)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Formulario de Dirección</CardTitle>
          <CardDescription>Autocompletado con Google Maps y campos adicionales</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Dirección*</label>
            <Input ref={inputRef} placeholder="Ej: Av. Santa Fe 1234" className="mt-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Piso</label>
              <Input value={form.floor ?? ""} onChange={(e) => handleChange("floor", e.target.value)} placeholder="Ej: 3" />
            </div>
            <div>
              <label className="text-sm font-medium">Departamento</label>
              <Input value={form.apartment ?? ""} onChange={(e) => handleChange("apartment", e.target.value)} placeholder="Ej: B" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Ciudad*</label>
              <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="Ej: Buenos Aires" />
            </div>
            <div>
              <label className="text-sm font-medium">Provincia / Estado</label>
              <Input value={form.state ?? ""} onChange={(e) => handleChange("state", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Código Postal</label>
              <Input value={form.zipCode ?? ""} onChange={(e) => handleChange("zipCode", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">País</label>
            <Input value={form.country ?? ""} onChange={(e) => handleChange("country", e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddAddress} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Guardar dirección local
            </Button>
            <Button variant="outline" onClick={handleSendToBackend} disabled={loading}>
              <MapPin className="h-4 w-4 mr-2" />
              Cargar direcciones
            </Button>
            <Button variant="ghost" onClick={handleLoadExample}>
              <Upload className="h-4 w-4 mr-2" />
              Cargar ejemplo
            </Button>
          </div>
        </CardContent>
      </Card>

      {addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Direcciones cargadas (local)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {addresses.map((a, i) => (
                <li key={a.id}>
                  {i + 1}. {a.street} {a.floor && ` • Piso ${a.floor}`} {a.apartment && ` • Depto ${a.apartment}`}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {direccionesBackend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Direcciones en backend</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {direccionesBackend.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{d.texto_normalizado}</div>
                    {editingId === d.id ? (
                      <div className="mt-2 flex gap-2">
                        <Input value={editForm.piso ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, piso: e.target.value }))} placeholder="Piso" className="w-28" />
                        <Input value={editForm.depto ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, depto: e.target.value }))} placeholder="Depto" className="w-28" />
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {d.piso && `Piso ${d.piso}`} {d.depto && `· Depto ${d.depto}`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingId === d.id ? (
                      <>
                        <Button size="sm" onClick={() => handleSaveBackend(d)} disabled={loading}>Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={loading}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleEditBackend(d)}>Editar</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteBackend(d)} disabled={loading}>Borrar</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
