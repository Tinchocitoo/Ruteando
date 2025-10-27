"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Plus, Upload, MapPin, Save, ArrowLeft } from "lucide-react"

interface Address {
  id: string
  street: string
  city: string
  zipCode: string
  notes?: string
}

interface AddressLoaderProps {
  onBack: () => void
  onAddressesLoaded: (addresses: Address[]) => void
}

export function AddressLoader({ onBack, onAddressesLoaded }: AddressLoaderProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [currentAddress, setCurrentAddress] = useState({
    street: "",
    city: "",
    zipCode: "",
    notes: "",
  })
  const { toast } = useToast()

  const handleAddAddress = () => {
    if (!currentAddress.street.trim() || !currentAddress.city.trim()) {
      toast({
        title: "Error",
        description: "La dirección y ciudad son obligatorias",
        variant: "destructive",
      })
      return
    }

    const newAddress: Address = {
      id: Date.now().toString(),
      street: currentAddress.street.trim(),
      city: currentAddress.city.trim(),
      zipCode: currentAddress.zipCode.trim(),
      notes: currentAddress.notes.trim() || undefined,
    }

    setAddresses([...addresses, newAddress])
    setCurrentAddress({ street: "", city: "", zipCode: "", notes: "" })

    toast({
      title: "Dirección agregada",
      description: "La dirección ha sido agregada a la lista",
    })
  }

  const handleRemoveAddress = (id: string) => {
    setAddresses(addresses.filter((addr) => addr.id !== id))
  }

  const handleSaveAddresses = () => {
    if (addresses.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos una dirección",
        variant: "destructive",
      })
      return
    }

    onAddressesLoaded(addresses)
    toast({
      title: "Direcciones guardadas",
      description: `Se han guardado ${addresses.length} direcciones`,
    })
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())

      // Skip header if present
      const dataLines =
        lines[0].toLowerCase().includes("direccion") || lines[0].toLowerCase().includes("street")
          ? lines.slice(1)
          : lines

      const csvAddresses: Address[] = dataLines
        .map((line, index) => {
          const [street, city, zipCode, notes] = line.split(",").map((item) => item.trim())
          return {
            id: `csv-${Date.now()}-${index}`,
            street: street || "",
            city: city || "",
            zipCode: zipCode || "",
            notes: notes || undefined,
          }
        })
        .filter((addr) => addr.street && addr.city)

      setAddresses([...addresses, ...csvAddresses])

      toast({
        title: "CSV importado",
        description: `Se importaron ${csvAddresses.length} direcciones`,
      })
    }

    reader.readAsText(file)
    event.target.value = "" // Reset input
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-xl font-sans font-bold">Cargar Direcciones</h1>
          <p className="text-sm text-muted-foreground">Agrega direcciones manualmente o importa un CSV</p>
        </div>
      </div>

      {/* Address Input Methods */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="csv">Importar CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Agregar Dirección
              </CardTitle>
              <CardDescription>Ingresa los datos de la dirección</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Dirección *</Label>
                <Input
                  id="street"
                  placeholder="Calle y número"
                  value={currentAddress.street}
                  onChange={(e) => setCurrentAddress((prev) => ({ ...prev, street: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    placeholder="Ciudad"
                    value={currentAddress.city}
                    onChange={(e) => setCurrentAddress((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Código Postal</Label>
                  <Input
                    id="zipCode"
                    placeholder="CP"
                    value={currentAddress.zipCode}
                    onChange={(e) => setCurrentAddress((prev) => ({ ...prev, zipCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Instrucciones especiales, referencias, etc."
                  value={currentAddress.notes}
                  onChange={(e) => setCurrentAddress((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button onClick={handleAddAddress} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Dirección
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar desde CSV
              </CardTitle>
              <CardDescription>
                Sube un archivo CSV con las columnas: Dirección, Ciudad, Código Postal, Notas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-sm font-medium">Seleccionar archivo CSV</span>
                    <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">Formato: direccion,ciudad,codigo_postal,notas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Address List */}
      {addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Direcciones Cargadas ({addresses.length})
              </span>
              <Button onClick={handleSaveAddresses}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Lista
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {addresses.map((address, index) => (
                <div key={address.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">{index + 1}</span>
                      <p className="font-medium text-sm">{address.street}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {address.city} {address.zipCode && `• ${address.zipCode}`}
                    </p>
                    {address.notes && <p className="text-xs text-muted-foreground mt-1 italic">{address.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAddress(address.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
