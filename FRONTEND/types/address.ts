export interface Address {
  id: string
  street: string
  city: string
  zipCode?: string 
  state?: string
  country?: string
  notes?: string
  apartment?: string
  floor?: string
  coordinates?: { latitude: number; longitude: number }
}
