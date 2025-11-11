export type BackendLatLng = {
  lat: number
  lng: number
}

export type FrontAddressPayload = {
  address: {
    formatted_address: string
    components: {
      route?: string
      street_number?: string
      locality?: string
      administrative_area_level_1?: string
      country?: string
      postal_code?: string
    }
    location: BackendLatLng
  }
  floor?: string | null
  apartment?: string | null
  packages?: number
}

export type CargarDireccionesRequest = {
  direcciones: FrontAddressPayload[]
}

export type DireccionBackend = {
  id: number
  texto_normalizado: string
  latitud: number
  longitud: number
  piso: string | null
  depto: string | null
  hash_direccion: string
  hash_geoloc: string
  cantidad_paquetes: number
}

export type CargarDireccionesResponse = {
  direcciones: DireccionBackend[]
  errores: string[]
}

export type CalcularRutaRequest = {
  latitud_origen: number
  longitud_origen: number
  direcciones: DireccionBackend[]
}

export type PuntoRutaBackend = {
  punto_ruta_id: number
  orden: number
  hash_geoloc: string
  direcciones_fisicas: DireccionBackend[]
}

export type CalcularRutaResponse = {
  ruta_id: number
  distancia_total_m: number
  duracion_total_s: number
  encoded_polyline: string
  puntos_ruta: PuntoRutaBackend[]
}

export type AsignarRutaRequest = {
  ruta_id: number
  conductor_id: number
}

export type AsignarRutaResponse = {
  mensaje: string
  ruta_id: number
  conductor_id: number
}

export type IniciarRutaRequest = {
  ruta_id: number
  conductor_id: number
}

export type IniciarRutaResponse = {
  mensaje: string
  ruta_id: number
  polyline: string
  distancia_total_m: number
  duracion_total_s: number
  entregas_creadas: Array<{
    id_entrega: number
    ruta_entrega_id: number
    direccion: string
    cantidad_paquetes: number
    hash_geoloc: string
    latitud: number
    longitud: number
  }>
}

export type RegistrarIntentoEntregaRequest = {
  ruta_entrega_id: number
  conductor_id: number
  nuevo_estado: "completada" | "fallida"
  motivo?: string | null
  ubicacion_gps?: { lat: number; lng: number } | null
  adjuntos_json?: Record<string, any> | null
}

export type RegistrarIntentoEntregaResponse = {
  mensaje: string
  entrega_id: number
  nuevo_estado: string
  ruta_entrega_id: number
  estado_ruta: string
  fecha_intento: string
}
