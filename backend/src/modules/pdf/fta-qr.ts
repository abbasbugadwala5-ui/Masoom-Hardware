/**
 * Tax-invoice QR code.
 *
 * Encodes the invoice essentials as a TLV (Tag-Length-Value) byte string, base64
 * encoded — the same scheme adopted across the GCC for e-invoicing (KSA ZATCA
 * Phase-1 style). UAE FTA accepts a scannable QR carrying seller, TRN, timestamp
 * and tax totals; this gives auditors an offline-verifiable payload.
 *
 * Tags: 1=seller name, 2=TRN, 3=timestamp(ISO), 4=invoice total (incl. VAT), 5=VAT amount.
 */
import QRCode from 'qrcode';

function tlv(tag: number, value: string): Buffer {
  const val = Buffer.from(value, 'utf8');
  return Buffer.concat([Buffer.from([tag, val.length]), val]);
}

export interface QrInput {
  sellerName: string;
  trn: string;
  timestamp: Date;
  total: number | string;
  vatAmount: number | string;
}

/** Build the base64 TLV payload string stored on the invoice (`qrPayload`). */
export function buildQrPayload(input: QrInput): string {
  const buf = Buffer.concat([
    tlv(1, input.sellerName),
    tlv(2, input.trn),
    tlv(3, new Date(input.timestamp).toISOString()),
    tlv(4, Number(input.total).toFixed(2)),
    tlv(5, Number(input.vatAmount).toFixed(2)),
  ]);
  return buf.toString('base64');
}

/** Render a payload string to a PNG data URL for inline embedding in PDF HTML. */
export async function qrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 140 });
}
