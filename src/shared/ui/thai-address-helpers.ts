import addressData from '@/shared/data/thai-address.json'

// Data format: [[province, [[amphoe, [[district, zipcode], ...]], ...]], ...]
type DistrictEntry = [string, string]
type AmphoeEntry = [string, DistrictEntry[]]
type ProvinceEntry = [string, AmphoeEntry[]]
const data = addressData as ProvinceEntry[]

export interface ThaiAddress {
  province: string
  amphoe: string
  district: string
  zipcode: string
}

export function getAmphoes(province: string): string[] {
  if (!province) return []
  const prov = data.find((p) => p[0] === province)
  return prov ? prov[1].map((a) => a[0]) : []
}

export function getDistricts(province: string, amphoe: string): { name: string; zip: string }[] {
  if (!province || !amphoe) return []
  const prov = data.find((p) => p[0] === province)
  if (!prov) return []
  const amp = prov[1].find((a) => a[0] === amphoe)
  return amp ? amp[1].map((d) => ({ name: d[0], zip: d[1] })) : []
}

export const ALL_PROVINCES = data.map((p) => p[0])
