"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, PlusCircle, Upload } from "lucide-react"
import { Address } from "@/types/address"

interface DriverDashboardProps {
  onLoadAddresses: (addresses: Address[]) => void
  onViewMap: () => void
  deliveries?: any[]
}

export function DriverDashboard({ onLoadAddresses, onViewMap, deliveries = [] }: DriverDashboardProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [mapsReady, setMapsReady] = useState(false)

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

  // 🧠 Cargar la API de Google Maps
  useEffect(() => {
    if (typeof window === "undefined") return

    if ((window as any).google?.maps?.places) {
      setMapsReady(true)
      return
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) {
      console.warn("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setMapsReady(true)
    document.head.appendChild(script)
  }, [])

  // 🧭 Inicializar Autocomplete
  useEffect(() => {
    if (!mapsReady || !inputRef.current) return

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["address_components", "geometry", "formatted_address"],
      componentRestrictions: { country: "ar" },
    })

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place?.geometry?.location) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      const components: Record<string, string> = {}
      place.address_components?.forEach((c) => {
        const type = c.types[0]
        components[type] = c.long_name
      })

      setForm((prev) => ({
        ...prev,
        street: place.formatted_address ?? "",
        city: components.locality || components.administrative_area_level_2 || "",
        state: components.administrative_area_level_1 || "",
        zipCode: components.postal_code || "",
        country: components.country || "",
        coordinates: { latitude: lat, longitude: lng }, // ✅ corregido
      }))
    })
  }, [mapsReady])

  const handleChange = (field: keyof Address, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ➕ Guardar dirección
  const handleAddAddress = () => {
    if (!form.street || !form.city) {
      alert("Completá al menos la dirección y la ciudad.")
      return
    }

    const newAddress = { ...form, id: crypto.randomUUID() }
    setAddresses((prev) => [...prev, newAddress])

    // Reset form
    setForm({
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
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleStartRoute = () => {
    if (addresses.length < 2) {
      alert("Necesitás al menos dos direcciones para calcular la ruta.")
      return
    }
    onLoadAddresses(addresses)
    onViewMap()
  }

  const handleLoadExample = () => {
    const example: Address[] = [
      {
        id: "1",
        street: "Av. Santa Fe 1234",
        city: "Buenos Aires",
        state: "Buenos Aires",
        zipCode: "C1059",
        country: "Argentina",
        coordinates: { latitude: -34.5965, longitude: -58.4042 },
      },
      {
        id: "2",
        street: "Av. Cabildo 4321",
        city: "Buenos Aires",
        state: "Buenos Aires",
        zipCode: "C1426",
        country: "Argentina",
        coordinates: { latitude: -34.5595, longitude: -58.459 },
      },
            {
      id: "3",
      street: "Av. del Libertador 1473",
      city: "Vicente López",
      state: "Buenos Aires",
      zipCode: "B1638",
      country: "Argentina",
      coordinates: { latitude: -34.5256, longitude: -58.4752 },
    },
    {
      id: "4",
      street: "Italia 1020",
      city: "Belén de Escobar",
      state: "Buenos Aires",
      zipCode: "B1625",
      country: "Argentina",
      coordinates: { latitude: -34.3475, longitude: -58.7962 },
    },
    {
      id: "5",
      street: "Av. San Martín 2300",
      city: "Tigre",
      state: "Buenos Aires",
      zipCode: "B1648",
      country: "Argentina",
      coordinates: { latitude: -34.4243, longitude: -58.5797 },
    },
    {
      id: "6",
      street: "French 45",
      city: "Pilar",
      state: "Buenos Aires",
      zipCode: "B1629",
      country: "Argentina",
      coordinates: { latitude: -34.4578, longitude: -58.9123 },
    }
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
          {/* Autocomplete principal */}
          <div>
            <label className="text-sm font-medium">Dirección*</label>
            <Input
              ref={inputRef}
              placeholder="Ej: Av. Santa Fe 1234"
              disabled={!mapsReady}
              className="mt-1"
            />
          </div>

          {/* Piso y Depto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Piso</label>
              <Input
                value={form.floor ?? ""}
                onChange={(e) => handleChange("floor", e.target.value)}
                placeholder="Ej: 3"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Departamento</label>
              <Input
                value={form.apartment ?? ""}
                onChange={(e) => handleChange("apartment", e.target.value)}
                placeholder="Ej: B"
              />
            </div>
          </div>

          {/* City / State / Zip / Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Ciudad*</label>
              <Input
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Ej: Buenos Aires"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Provincia / Estado</label>
              <Input
                value={form.state ?? ""}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Código Postal</label>
              <Input
                value={form.zipCode ?? ""}
                onChange={(e) => handleChange("zipCode", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">País</label>
            <Input
              value={form.country ?? ""}
              onChange={(e) => handleChange("country", e.target.value)}
            />
          </div>

          <Button onClick={handleAddAddress} className="gap-2 w-full mt-2">
            <PlusCircle className="h-4 w-4" />
            Guardar dirección
          </Button>
        </CardContent>
      </Card>

      {/* Lista de direcciones */}
      {addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Direcciones cargadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {addresses.map((a, i) => (
                <li key={a.id} className="text-sm text-muted-foreground">
                  {i + 1}. {a.street}
                  {a.floor && ` Piso ${a.floor}`}
                  {a.apartment && ` Depto ${a.apartment}`} — {a.city}, {a.state}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Botones */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleStartRoute}>
          <MapPin className="h-4 w-4 mr-2" />
          Ver en mapa
        </Button>

        <Button variant="ghost" onClick={handleLoadExample}>
          <Upload className="h-4 w-4 mr-2" />
          Cargar ejemplo
        </Button>
      </div>
    </div>
  )
}
