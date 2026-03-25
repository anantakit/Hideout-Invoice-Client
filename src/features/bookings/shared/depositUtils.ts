/**
 * Shared deposit calculation utilities.
 *
 * Single source of truth for deposit math used across all booking UI:
 * check-in cards, checkout cards, detail page, operations drawer, etc.
 *
 * Deposit flow:
 *   PENDING   → staff ต้องเก็บเงินประกัน (remaining = expected - paid)
 *   COLLECTED → เก็บครบแล้ว; checkout เตือน "คืนประกัน" (ไม่ต้อง track refund ในระบบ)
 *   NONE      → ยกเว้นประกัน (กดจาก PaymentPanel เท่านั้น)
 *
 * deposit_returned:
 *   null/undefined → คืนเต็มจำนวน (default)
 *   0             → ไม่คืนประกัน
 *   N             → คืนบางส่วน
 */

interface DepositSource {
  key_deposit_amount?: number
  deposit_paid?: number
  deposit_returned?: number | null
  deposit_status?: string
  balance_amount?: number
}

export interface DepositInfo {
  /** Expected deposit (e.g. 200 × rooms) */
  expected: number
  /** Actual deposit collected (SUM of DEPOSIT payments) */
  paid: number
  /** Remaining deposit to collect: expected - paid */
  remaining: number
  /** Amount to return at checkout: null=full, 0=none, N=partial */
  toReturn: number
  /** Room balance outstanding */
  roomBalance: number
  /** Total to collect from guest: roomBalance + deposit remaining */
  totalToCollect: number
  /** Deposit status from booking */
  status: 'NONE' | 'PENDING' | 'COLLECTED'
}

/**
 * Compute deposit info from any object that has the relevant fields
 * (BookingResponse, TimelineBooking, fullBooking, etc.)
 */
export function computeDeposit(source: DepositSource): DepositInfo {
  const expected = source.key_deposit_amount ?? 0
  const paid = source.deposit_paid ?? 0
  const remaining = Math.max(0, expected - paid)
  const roomBalance = Math.max(0, source.balance_amount ?? 0)
  const status = (source.deposit_status ?? 'NONE') as DepositInfo['status']

  // deposit_returned: null/undefined = return full deposit_paid
  const toReturn = source.deposit_returned != null ? source.deposit_returned : paid

  return {
    expected,
    paid,
    remaining,
    toReturn,
    roomBalance,
    totalToCollect: roomBalance + (status !== 'NONE' ? remaining : 0),
    status,
  }
}
