# BLOCK THEORY POS — Commercial Café Operating System
### Built for Speciality Coffee Culture • Alwarpet Flagship Store, Chennai, Tamil Nadu

---

## ⚡ Direct Download (Windows 10 & 11)

You can download and run **BLOCK THEORY POS** directly on any Windows desktop without needing Node.js or development tools:

| Version | Download Link | Type | How to Run |
| :--- | :--- | :--- | :--- |
| **Standalone Portable** *(Recommended)* | [📥 **Download Portable (.exe)**](https://github.com/shri6426/block-theory/raw/main/release/BlockTheoryPOS-Portable-1.0.0.exe) | Single Executable (~79.7 MB) | Double-click to run immediately (no installation needed, can run from USB drive) |
| **Windows Installer** | [📦 **Download Setup Installer (.exe)**](https://github.com/shri6426/block-theory/raw/main/release/BLOCK%20THEORY%20POS%20Setup%201.0.0.exe) | NSIS Installer (~88.6 MB) | Run to install on your PC with Desktop & Start Menu shortcuts |

### Quick Start on Any Desktop:
1. Click the **[Download Portable (.exe)](https://github.com/shri6426/block-theory/raw/main/release/BlockTheoryPOS-Portable-1.0.0.exe)** link above.
2. Once downloaded, double-click `BlockTheoryPOS-Portable-1.0.0.exe`.
3. The app will launch directly into the BLOCK THEORY login screen.
4. **Log in using any demo account** (e.g. Cashier PIN: `3333`, Owner PIN: `1111`, Manager PIN: `2222`, Kitchen PIN: `4444`).
5. All business data (orders, inventory, customer loyalty, settings) is stored persistently on the desktop.

---

## 1. Overview

**BLOCK THEORY POS** is a genuine, high-performance installable Windows desktop application engineered specifically for commercial speciality café operations. It is designed to launch directly from the Windows desktop, communicate with receipt printing hardware, and operate reliably **100% offline** without requiring an active internet connection.

Built using **Electron 33**, **React 18**, **TypeScript**, **Tailwind CSS**, and **SQLite 3 (WAL mode)**, it delivers millisecond-level responsiveness for high-volume cashier workflows, automated ingredient-level recipe deductions, Indian GST tax compliance, and real-time kitchen station routing.

---

## 2. Brand Identity & Visual Aesthetic

- **Brand Personality**: Industrial, Architectural, Minimal, Contemporary, Premium speciality coffee culture. Inspired by exposed brick, concrete, black metal mesh, and warm incandescent lighting.
- **Palette**:
  - Background: `#F4F0E8` (Warm Architectural Plaster)
  - Primary Text: `#242424` (Deep Charcoal Iron)
  - Brick Accent: `#A64B36` (Terracotta Brick)
  - Concrete Grey: `#A8A39B` (Smooth Cast Concrete)
  - Warm Beige: `#D8C8B2` (Limestone Mortar)
  - Surface White: `#FFFFFF`
- **Typography & Icons**: Clean geometric monospace/sans-serif hierarchy, architectural framing, sharp borders, and **Lucide React** icons (no generic emojis).

---

## 3. Technology Stack

- **Desktop Runtime**: Electron 33 (Chromium 130, Node 20.18)
- **Packaging & Distribution**: Electron Builder (NSIS Windows x64 installer & Portable release)
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React
- **Local Persistence**: SQLite 3 with `better-sqlite3` native engine running in Write-Ahead Logging (`WAL`) mode with strict foreign key constraints and atomic transactions.
- **Security**: Context isolation enabled, disabled Node integration in renderer, secure preload context bridge, bcrypt password/PIN hashing.
- **Testing**: Vitest automated test suite for billing decimal precision, GST math, recipe deductions, and RBAC permissions.

---

## 4. Key Modules & Capabilities

### 1. Point of Sale (POS) — Core High-Speed Billing
- **Dual-Panel Desktop Layout**:
  - Left: Instant product search (autofocus with **F2**), category tabs, and responsive product cards with preparation station badges.
  - Right: Cart ledger with real-time tax breakdown, line-item modifiers, and quantity controls.
- **Product Customization**: Size variants (Regular / Large) and configurable add-ons (Extra Espresso Shot, Barista Oat Milk, Madagascar Vanilla Syrup, Less Sugar, No Sugar).
- **Order Types**: Dine-In (with table selector 1–16), Takeaway, and Quick Pickup.
- **Cart Controls**: Hold Order (**F8**), Resume Held Order (**F9**), item notes, order discounts.
- **Payment Processing**: Cash (with tendered & change calculator), UPI (with QR display and manual UTR transaction reference), Card, and Split Payment.
- **Atomic Transactions**: Guarantees that order creation, payment recording, invoice generation, and inventory recipe deductions occur atomically in a single SQLite transaction.

### 2. Indian GST Compliance & Tax Invoicing
- Configurable CGST (2.5%) + SGST (2.5%) = 5% restaurant rate, with support for 12%, 18%, and interstate IGST.
- Tax-inclusive and tax-exclusive pricing modes.
- Sequential tax invoice numbering (`INV/YYMM/0001`) and order reference (`BT-YYMM-0001`).
- Preserves audit trail; financial records are never overwritten.

### 3. Kitchen Display System (KDS)
- Real-time kitchen tickets accessible within the app.
- State progression: `New` ➔ `Accepted` ➔ `Preparing` ➔ `Ready` ➔ `Completed`.
- Station filtering: **Coffee Counter (Barista)** vs. **Food Counter (Kitchen)** vs. **All Stations**.
- Visual elapsed time color coding: Green (< 5m), Amber (5–10m), Red (> 10m).
- Item check-off: Kitchen staff can mark individual items ready; the order is marked ready when all items are complete.

### 4. Ingredient-Level Inventory & Recipe Automation
- Configurable recipes link products to ingredients. When an order is settled, ingredients (e.g. 18g espresso beans, 200ml whole milk for an Iced Latte) are automatically deducted from stock.
- Units supported: grams (`g`), kilograms (`kg`), millilitres (`ml`), litres (`l`), and pieces (`pcs`).
- Manual stock adjustments require mandatory audit justifications.
- Spoilage and wastage tracking.
- Low-stock alerts triggered when inventory drops below minimum thresholds.

### 5. Supplier Management & Purchase Intake
- Maintain supplier records with contact details, phone, email, and address.
- Record incoming supplier shipments; confirmed purchase orders automatically increment ingredient stock.

### 6. Customer Directory & Loyalty Engine
- Customer lookup by phone number or name (**F3**).
- Automated loyalty points accrual (1 point per ₹20 spent).
- Lifetime spend tracking and visit history. Customers can also check out as walk-ins without a phone number.

### 7. Staff Management & Role-Based Access Control (RBAC)
- **Roles**:
  - `OWNER`: Full unrestricted access to billing, reports, staff, menu pricing, backups, and settings.
  - `MANAGER`: Operations, orders, inventory adjustments, refunds, and reports.
  - `CASHIER`: Fast billing, customer lookup, held orders, and receipt reprinting.
  - `KITCHEN_STAFF`: Restricted strictly to Kitchen Display System tickets and prep status.
- PIN login (4-digit numeric keypad) for lightning-fast cashier shift handovers.
- Full audit logs track all system actions with timestamp and user ID.

### 8. Operating Expense Management
- Record expenses across 8 commercial categories: Rent, Electricity, Ingredients, Salaries, Maintenance, Packaging, Marketing, and Miscellaneous.
- Monthly and category expense filtering.

### 9. Thermal Receipt Printing
- Support for **80mm** (standard POS) and **58mm** (compact roll) widths.
- Clean industrial receipt typography with café logo, GSTIN, FSSAI, itemized modifiers, CGST/SGST tax breakdown, and thank-you footer.
- In-app receipt preview and direct printing via Electron printing APIs.

### 10. Reports & Analytics
- Executive dashboard with Gross Sales, Net Sales, Order Count, Average Order Value (AOV), GST collected, and Estimated Gross Margin (revenue minus ingredient costs).
- Date range filtering: Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range.
- Export to CSV for Sales Ledger and GST Tax Audit.

### 11. Offline-First Resilience, Backups & Recovery
- Operates 100% offline using SQLite in `%APPDATA%/BlockTheoryPOS/blocktheory.db`.
- Automatic daily safety snapshots created on startup.
- Manual one-click database backup and restore with `PRAGMA integrity_check` verification.
- Safe rollback protection: a safety backup of existing state is preserved prior to any restore.

---

## 5. Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| **F1** or **?** | Open Keyboard Shortcuts Guide |
| **F2** | Focus Product Search input |
| **F3** | Customer Search & Selection modal |
| **F4** | Open Payment / Checkout modal |
| **F8** | Hold current cart order |
| **F9** | View and resume held orders |
| **Ctrl + Enter** | Direct checkout / charge cart |
| **Escape** | Close active modal or dialog |
| **Delete** | Remove selected item from cart |

---

## 6. Pre-Configured Demo Accounts

| Role | Username | Password | 4-Digit PIN | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | `admin` | `admin123` | `1111` | Full administrative & financial access |
| **Manager** | `manager` | `manager123` | `2222` | Operations, orders, inventory, reports |
| **Cashier** | `cashier` | `cashier123` | `3333` | POS billing, customer lookup, held orders |
| **Kitchen Staff** | `kitchen` | `kitchen123` | `4444` | Kitchen Display System ticket routing |

---

## 7. Windows Deliverables & Installation

The build artifacts are located in the `release/` directory:

1. **Windows Installer (NSIS)**:
   - File: `release/BLOCK THEORY POS Setup 1.0.0.exe`
   - Size: ~92.9 MB
   - Run the installer to install the desktop application. Creates desktop and Start menu shortcuts. Preserves application data during uninstall.

2. **Standalone Portable Version**:
   - File: `release/BlockTheoryPOS-Portable-1.0.0.exe`
   - Size: ~83.6 MB
   - Zero-installation executable. Double-click to run directly from any USB drive or folder.

3. **Unpacked Application Binary**:
   - Location: `release/win-unpacked/BLOCK THEORY POS.exe`
   - Direct execution binary with all bundled Chromium, Node, and SQLite resources.

---

## 8. Development & Build Commands

```bash
# 1. Run unit tests
npm test

# 2. Build renderer and electron processes
npm run build

# 3. Launch Electron application in development mode
npm run electron:dev

# 4. Generate Windows NSIS Installer (.exe)
npm run dist

# 5. Generate Standalone Portable Executable (.exe)
npm run dist:portable
```

---

## 9. Future Cloud Synchronization Architecture

The database layer is architected to facilitate future cloud synchronization with **PostgreSQL** or multi-terminal synchronisation:
1. Every record uses immutable unique identifiers (`order_number`, `invoice_number`, UTC ISO timestamps).
2. All inventory movements and sales are recorded as discrete append-only ledgers (`stock_movements`, `orders`, `payments`, `audit_logs`).
3. To introduce cloud synchronization:
   - A background sync worker can pull unsynchronized ledger entries where `created_at > last_sync_time`.
   - Local billing never waits on network latency; transactions are committed to SQLite first and synchronized idempotently to PostgreSQL in the background.

---

**BLOCK THEORY POS** • Speciality Coffee Culture • Alwarpet, Chennai.

