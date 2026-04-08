import {
  Document,
  Page,
  View,
  Text as RawText,
  Font,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { ReactNode } from 'react'
import { bahttext } from 'bahttext'
import type { Receipt } from '../types'
import { THAI_MONTHS_SHORT, formatAddressForDisplay } from '@/shared/utils'

// ── Font ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Sarabun-SemiBold.ttf', fontWeight: 'semibold' as unknown as number },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback((word) => [word])

// Thai text clip fix — append NBSP to every text node.
// Must be concatenated into a single string (not a sibling node) so react-pdf
// treats it as one run; otherwise the last glyph of the primary run (e.g. ")"
// following a Thai tone mark like "ใหญ่") gets clipped by Sarabun shaping.
const PAD = '\u00A0'
function Text({ style, children }: { style?: Style | Style[]; children?: ReactNode }) {
  if (typeof children === 'string' || typeof children === 'number') {
    return <RawText style={style}>{`${children}${PAD}`}</RawText>
  }
  return <RawText style={style}>{children}{PAD}</RawText>
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtShort(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
  } catch { return iso }
}

function fmtFull(iso: string): string {
  const M = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
             'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  try {
    const d = new Date(iso)
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear() + 543}`
  } catch { return iso }
}

// ── Tokens ───────────────────────────────────────────────────────────────────
const ACCENT  = '#1A4D3E'
const INK     = '#2D3748'
const BODY    = '#4A5568'
const LABEL   = '#8395A7'
const FAINT   = '#E2E8F0'
const SURFACE = '#F7FAFA'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 10,
    color: INK,
    lineHeight: 1.75,
    padding: '18mm 20mm',
  },

  // ═══ Header ════════════════════════════════════════════════════════════════
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  brandName: { fontSize: 16, fontWeight: 'bold', color: ACCENT },
  docTitleWrap: { alignItems: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: INK },
  docSub: { fontSize: 7, color: LABEL, letterSpacing: 2.5 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  brandText: { fontSize: 8.5, color: BODY },
  metaWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  metaLabel: { fontSize: 8.5, color: LABEL },
  metaVal: { fontSize: 10, fontWeight: 'semibold' as 'bold', color: INK, minWidth: '38mm', textAlign: 'right' },

  accentLine: { height: 1.5, backgroundColor: ACCENT, borderRadius: 1, marginTop: 10, marginBottom: 18 },

  // ═══ Customer ══════════════════════════════════════════════════════════════
  card: {
    marginBottom: 16,
  },
  cardLabel: { marginBottom: 3 },
  labelTH: { fontSize: 7.5, color: LABEL },
  custName: { fontSize: 11.5, fontWeight: 'bold', color: INK, marginBottom: 2, paddingRight: 20, letterSpacing: 0.2 },
  custDetail: { fontSize: 8.5, color: BODY, lineHeight: 1.7 },
  custDivider: { borderBottomWidth: 0.5, borderBottomColor: FAINT, marginVertical: 6 },
  payRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  payLabel: { fontSize: 8, color: LABEL },
  payVal: { fontSize: 8.5, fontWeight: 'semibold' as 'bold', color: INK },

  // ═══ Table ═════════════════════════════════════════════════════════════════
  table: { marginBottom: 6 },
  tHead: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: FAINT,
  },
  th: { fontSize: 8.5, fontWeight: 'semibold' as 'bold', color: BODY },
  tRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tRowEven: { backgroundColor: SURFACE },
  tRowLast: { borderBottomWidth: 0.75, borderBottomColor: FAINT },

  cDesc:   { flex: 1 },
  cQty:    { width: '11%', textAlign: 'center' },
  cRate:   { width: '17%', textAlign: 'right' },
  cAmt:    { width: '17%', textAlign: 'right' },

  itemName: { fontWeight: 'semibold' as 'bold', fontSize: 10, lineHeight: 1.5, color: INK },
  itemDate: { fontSize: 7.5, color: LABEL, lineHeight: 1.4, marginTop: 1 },
  tdBody: { fontSize: 10, color: BODY },
  tdBold: { fontSize: 10, fontWeight: 'bold', color: INK },

  // ═══ Total ═════════════════════════════════════════════════════════════════
  totalWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, marginBottom: 6 },
  totalBox: { alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 16, marginBottom: 2 },
  totalLabel: { fontSize: 12, fontWeight: 'bold', color: INK },
  totalAmount: { fontSize: 14, fontWeight: 'bold', color: INK },
  totalWords: { fontSize: 8.5, color: LABEL },

  // ═══ Footer (signature + date) ═════════════════════════════════════════════
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  sigBlock: { width: '60mm', alignItems: 'center' },
  sigText: { fontSize: 9.5, color: BODY, marginBottom: 6 },
  sigName: { fontSize: 9.5, color: BODY, marginBottom: 4 },
  sigDate: { fontSize: 9.5, color: BODY },
})

// ── Component ────────────────────────────────────────────────────────────────

interface ReceiptPDFProps { receipt: Receipt }

export function ReceiptPDF({ receipt }: ReceiptPDFProps) {
  const co = receipt.company
  const cu = receipt.customer
  const items = receipt.items
  const stays = receipt.covered_stays ?? []

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Title row ── */}
        <View style={s.titleRow}>
          <Text style={s.brandName}>{co?.name}</Text>
          <View style={s.docTitleWrap}>
            <Text style={s.docTitle}>ใบเสร็จรับเงิน</Text>
            <Text style={s.docSub}>RECEIPT</Text>
          </View>
        </View>

        {/* ── Detail rows (line-by-line aligned) ── */}
        {co?.address ? (
          <View style={s.detailRow}>
            <Text style={s.brandText}>{formatAddressForDisplay(co.address)}</Text>
          </View>
        ) : null}
        <View style={s.detailRow}>
          <Text style={s.brandText}>โทรศัพท์ {co?.phone}</Text>
          <View style={s.metaWrap}>
            <Text style={s.metaLabel}>เลขที่ใบเสร็จ</Text>
            <Text style={s.metaVal}>{receipt.invoice_number}</Text>
          </View>
        </View>
        <View style={s.detailRow}>
          <Text style={s.brandText}>เลขประจำตัวผู้เสียภาษี {co?.tax_id}</Text>
          <View style={s.metaWrap}>
            <Text style={s.metaLabel}>วันที่ออกใบเสร็จ</Text>
            <Text style={s.metaVal}>{fmtFull(receipt.issue_date)}</Text>
          </View>
        </View>

        <View style={s.accentLine} />

        {/* ── Customer ── */}
        <View style={s.card}>
          <View style={s.cardLabel}>
            <Text style={s.labelTH}>ผู้ชำระเงิน</Text>
          </View>
          <Text style={s.custName}>{cu.name.replace(/([\u0E00-\u0E7F])(?=[^\u0E00-\u0E7F])/g, '$1\u200B')}</Text>
          <View style={s.custDetail}>
            {cu.address ? <Text>{formatAddressForDisplay(cu.address)}</Text> : null}
            {cu.tax_id ? <Text>เลขประจำตัวผู้เสียภาษี {cu.tax_id}</Text> : null}
          </View>
          {receipt.payment_method ? (
            <View style={s.payRow}>
              <Text style={s.payLabel}>วิธีชำระเงิน</Text>
              <Text style={s.payVal}>{receipt.payment_method}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Table ── */}
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.th, s.cDesc]}>รายการ</Text>
            <Text style={[s.th, s.cQty]}>จำนวน</Text>
            <Text style={[s.th, s.cRate]}>ราคาต่อหน่วย</Text>
            <Text style={[s.th, s.cAmt]}>จำนวนเงิน</Text>
          </View>
          {items.map((item, i) => {
            const stay = stays[i]
            const dates = stay
              ? `${fmtShort(stay.date_from)} – ${fmtShort(stay.date_to)}`
              : null
            const rowStyles = [
              s.tRow,
              i % 2 === 1 ? s.tRowEven : undefined,
              i === items.length - 1 ? s.tRowLast : undefined,
            ].filter(Boolean) as Style[]

            return (
              <View key={item.id} style={rowStyles}>
                <View style={s.cDesc}>
                  <Text style={s.itemName}>{item.description}</Text>
                  {dates ? <Text style={s.itemDate}>{dates}</Text> : null}
                </View>
                <Text style={[s.tdBody, s.cQty]}>{item.quantity}</Text>
                <Text style={[s.tdBody, s.cRate]}>{fmt(item.unit_price)}</Text>
                <Text style={[s.tdBold, s.cAmt]}>{fmt(item.total)}</Text>
              </View>
            )
          })}
        </View>

        {/* ── Total ── */}
        <View style={s.totalWrap}>
          <View style={s.totalBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>ยอดชำระทั้งหมด:</Text>
              <Text style={s.totalAmount}>{fmt(receipt.total)} บาท</Text>
            </View>
            <Text style={s.totalWords}>({bahttext(receipt.total)})</Text>
          </View>
        </View>

        {/* ── Signature ── */}
        <View style={s.footer}>
          <View style={s.sigBlock}>
            <Text style={s.sigText}>ลงชื่อ ...................................... ผู้รับเงิน</Text>
            {receipt.creator_name ? (
              <Text style={s.sigName}>({receipt.creator_name})</Text>
            ) : null}
          </View>
        </View>

      </Page>
    </Document>
  )
}
