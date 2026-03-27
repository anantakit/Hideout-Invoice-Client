import type { ThaiAddress } from '@/shared/ui/ThaiAddressPicker'

const emptyAddr: ThaiAddress = { province: '', amphoe: '', district: '', zipcode: '' }

/** Parse a formatted address string into detail + ThaiAddress parts. */
export function parseAddressToThaiAddr(address: string): { detail: string; thai: ThaiAddress } {
  // Try to parse "detail ต.X อ.Y จ.Z NNNNN" or "detail แขวงX เขตY กรุงเทพมหานคร NNNNN"
  const m = address.match(/^(.*?)\s*(?:ต\.|ตำบล|แขวง)(\S+)\s+(?:อ\.|อำเภอ|เขต)(\S+)\s+(?:จ\.|จังหวัด)?(\S+)\s+(\d{5})\s*$/)
  if (m) {
    return {
      detail: m[1].trim(),
      thai: { district: m[2], amphoe: m[3], province: m[4], zipcode: m[5] },
    }
  }
  return { detail: address, thai: emptyAddr }
}

/** Build a formatted address string from detail + ThaiAddress parts. */
export function buildAddressString(detail: string, thai: ThaiAddress): string {
  if (!thai.district && !thai.amphoe && !thai.province) return detail.trim()
  const parts = [detail.trim()]
  if (thai.district) parts.push(`ต.${thai.district}`)
  if (thai.amphoe) parts.push(`อ.${thai.amphoe}`)
  if (thai.province) parts.push(`จ.${thai.province}`)
  if (thai.zipcode) parts.push(thai.zipcode)
  return parts.filter(Boolean).join(' ')
}

export { emptyAddr }
