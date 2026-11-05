import { getDatabase } from '../db/client';
import { getAppSettings } from './billing';
import type { Invoice, OrderItem } from '../../shared/types';

export function getInvoiceWithDetails(orderIdOrInvoiceId: number): Invoice | null {
  const db = getDatabase();

  const inv = db.prepare(`
    SELECT * FROM invoices 
    WHERE id = ? OR order_id = ?
  `).get(orderIdOrInvoiceId, orderIdOrInvoiceId) as Invoice | undefined;

  if (!inv) return null;

  const items = db.prepare(`
    SELECT * FROM order_items 
    WHERE order_id = ?
    ORDER BY id ASC
  `).all(inv.order_id) as OrderItem[];

  const getAddons = db.prepare(`
    SELECT id, addon_name, price 
    FROM order_item_addons 
    WHERE order_item_id = ?
  `);

  for (const item of items) {
    item.addons = getAddons.all(item.id) as any;
  }

  inv.items = items;
  return inv;
}

export function generateThermalReceiptHtml(invoice: Invoice, printerWidth: '58mm' | '80mm' = '80mm'): string {
  const settings = getAppSettings();
  const is58 = printerWidth === '58mm';
  const widthPx = is58 ? '210px' : '280px';
  const fontSize = is58 ? '10px' : '11px';
  const headerSize = is58 ? '14px' : '16px';

  const itemsHtml = (invoice.items || []).map(it => {
    const addonsText = (it.addons || []).map(a => `+ ${a.addon_name} (₹${a.price})`).join('<br/>');
    return `
      <tr>
        <td style="padding: 3px 0; vertical-align: top;">
          <strong>${it.product_name}</strong>
          ${it.variant_name ? `<br/><span style="color: #666; font-size: 0.9em;">(${it.variant_name})</span>` : ''}
          ${addonsText ? `<br/><span style="color: #888; font-size: 0.85em;">${addonsText}</span>` : ''}
          ${it.notes ? `<br/><span style="font-style: italic; font-size: 0.85em;">Note: ${it.notes}</span>` : ''}
        </td>
        <td style="text-align: center; vertical-align: top; padding: 3px 0;">${it.quantity}</td>
        <td style="text-align: right; vertical-align: top; padding: 3px 0;">₹${it.total_price.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${invoice.invoice_number}</title>
        <style>
          @page {
            margin: 0;
            size: ${is58 ? '58mm auto' : '80mm auto'};
          }
          body {
            font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
            width: ${widthPx};
            margin: 0 auto;
            padding: 8px 6px;
            color: #111;
            background: #fff;
            font-size: ${fontSize};
            line-height: 1.35;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .brand-title {
            font-size: ${headerSize};
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .sub-brand {
            font-size: 0.8em;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #555;
            margin-bottom: 6px;
          }
          .divider {
            border-top: 1px dashed #222;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px solid #222;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 1em;
          }
          .row-flex {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .footer-note {
            font-size: 0.85em;
            text-align: center;
            margin-top: 10px;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="brand-title">BLOCK THEORY</div>
          <div class="sub-brand">SPECIALITY COFFEE • CHENNAI</div>
          <div>${settings.outlet_name}</div>
          <div>${settings.address_line1}</div>
          <div>${settings.city} - ${settings.pincode}</div>
          <div>Ph: ${settings.phone}</div>
          ${settings.gstin ? `<div class="bold" style="margin-top: 3px;">GSTIN: ${settings.gstin}</div>` : ''}
          ${settings.fssai ? `<div>FSSAI: ${settings.fssai}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="row-flex">
          <span>Inv: <strong>${invoice.invoice_number}</strong></span>
          <span>Order: <strong>${invoice.order_number}</strong></span>
        </div>
        <div class="row-flex">
          <span>Date: ${invoice.created_at.slice(0, 16)}</span>
          <span>Type: <strong>${invoice.order_type.toUpperCase()}${invoice.table_number ? ` (T${invoice.table_number})` : ''}</strong></span>
        </div>
        ${invoice.customer_name ? `
          <div class="row-flex">
            <span>Customer: ${invoice.customer_name}</span>
            <span>${invoice.customer_phone || ''}</span>
          </div>
        ` : ''}

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #444; font-weight: bold;">
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: center; padding-bottom: 4px;">Qty</th>
              <th style="text-align: right; padding-bottom: 4px;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="row-flex">
          <span>Subtotal (Taxable):</span>
          <span>₹${invoice.subtotal.toFixed(2)}</span>
        </div>
        ${invoice.discount_amount > 0 ? `
          <div class="row-flex" style="color: #A64B36;">
            <span>Discount:</span>
            <span>-₹${invoice.discount_amount.toFixed(2)}</span>
          </div>
        ` : ''}
        ${invoice.cgst > 0 ? `
          <div class="row-flex">
            <span>CGST:</span>
            <span>₹${invoice.cgst.toFixed(2)}</span>
          </div>
        ` : ''}
        ${invoice.sgst > 0 ? `
          <div class="row-flex">
            <span>SGST:</span>
            <span>₹${invoice.sgst.toFixed(2)}</span>
          </div>
        ` : ''}
        ${invoice.igst > 0 ? `
          <div class="row-flex">
            <span>IGST:</span>
            <span>₹${invoice.igst.toFixed(2)}</span>
          </div>
        ` : ''}

        <div class="double-divider"></div>

        <div class="row-flex bold" style="font-size: 1.25em;">
          <span>NET PAYABLE:</span>
          <span>₹${invoice.total_amount.toFixed(2)}</span>
        </div>

        <div class="double-divider"></div>

        <div class="row-flex">
          <span>Payment Mode:</span>
          <span><strong>${invoice.payment_method.toUpperCase()}</strong></span>
        </div>

        <div class="footer-note">
          <div class="bold">${settings.receipt_footer_msg}</div>
          <div style="font-size: 0.8em; margin-top: 4px; color: #555;">(Powered by BLOCK THEORY POS Desktop)</div>
        </div>
      </body>
    </html>
  `;
}

