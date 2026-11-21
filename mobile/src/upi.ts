import { Linking } from 'react-native'
import { UPI_VPA, UPI_PAYEE_NAME } from './config'

/** Opens a UPI intent; caller records payment after the user confirms. */
export async function openUpiPay(opts: {
  amount: number
  note: string
  transactionRef: string
}) {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE_NAME,
    am: Number(opts.amount).toFixed(2),
    cu: 'INR',
    tn: opts.note.slice(0, 80),
    tr: opts.transactionRef.slice(0, 35),
  })
  const url = `upi://pay?${params.toString()}`
  try {
    await Linking.openURL(url)
  } catch {
    throw new Error('Could not open a UPI app on this device')
  }
}
