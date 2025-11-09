import {
  AsignarRutaRequest,
  AsignarRutaResponse,
  CargarDireccionesRequest,
  CargarDireccionesResponse,
  CalcularRutaRequest,
  CalcularRutaResponse,
  IniciarRutaRequest,
  IniciarRutaResponse,
  RegistrarIntentoEntregaRequest,
  RegistrarIntentoEntregaResponse,
} from "@/types/backend"

/* ==========================
   🔧 CONFIGURACIÓN BASE
========================== */

const BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "").replace(/\/+$/, "")

const STATIC_BEARER = process.env.NEXT_PUBLIC_API_BEARER

function authHeaders(): Record<string, string> {
  try {
    const ls = typeof window !== "undefined" ? localStorage.getItem("ruteando.token") : null
    const token = ls || STATIC_BEARER
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

/* ==========================
   ⚙️ FUNCIÓN BASE http()
========================== */

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  if (!BASE) {
    throw new Error(
      "⚠️ Falta NEXT_PUBLIC_API_BASE_URL o NEXT_PUBLIC_API_URL en .env.local (ej: http://127.0.0.1:8000)"
    )
  }

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
  }

  let mergedHeaders: HeadersInit = baseHeaders

  if (init?.headers) {
    if (init.headers instanceof Headers) {
      const headersCopy = new Headers(init.headers)
      for (const [k, v] of Object.entries(baseHeaders)) headersCopy.set(k, v)
      mergedHeaders = headersCopy
    } else if (Array.isArray(init.headers)) {
      const arrayHeaders: [string, string][] = [...init.headers]
      for (const [k, v] of Object.entries(baseHeaders)) arrayHeaders.push([k, v])
      mergedHeaders = arrayHeaders
    } else {
      mergedHeaders = { ...init.headers, ...baseHeaders }
    }
  }

  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: mergedHeaders,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`❌ Error ${res.status} en ${url}:`, text)
    throw new Error(`HTTP ${res.status} - ${text}`)
  }

  return res.json() as Promise<T>
}

/* ==========================
   🧭 ENDPOINTS DISPONIBLES
========================== */

// 📍 Cargar direcciones
export function apiCargarDirecciones(payload: CargarDireccionesRequest) {
  return http<CargarDireccionesResponse>("/api/direcciones/cargar_direcciones/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// 🗺️ Calcular ruta óptima
export function apiCalcularRuta(payload: CalcularRutaRequest) {
  return http<CalcularRutaResponse>("/api/rutas/calcular/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// 🚚 Asignar ruta a un conductor
export function apiAsignarRuta(payload: AsignarRutaRequest) {
  return http<AsignarRutaResponse>("/api/rutas/asignar/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// ▶️ Iniciar ruta (crear entregas)
export function apiIniciarRuta(payload: IniciarRutaRequest) {
  return http<IniciarRutaResponse>("/api/entregas/iniciar_ruta/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// ✅ Registrar intento de entrega (completada o fallida)
export function apiRegistrarIntentoEntrega(payload: RegistrarIntentoEntregaRequest) {
  return http<RegistrarIntentoEntregaResponse>("/api/entregas/registrar_intento/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
