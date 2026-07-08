import { imageUrls, PaymentMethod } from "@/types/types";
import jsPDF from "jspdf";

export interface InvoiceItem {
  id: string | number;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export interface CompanySnapshot {
  name?: string;
  email: string;
  address?: string;
  invoicePrefix?: string;
  paymentMethods?: PaymentMethod[];
  logo?: File | imageUrls | null;
}

export interface ClientDetails {
  name?: string;
  email?: string;
  address?: string;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  issueDate?: string;
  dueDate?: string;
  currency: string;
}

export interface InvoiceSummary {
  vatPercentage: number;
  getfundPercentage: number;
  nhilPercentage: number;
  notes?: string;
  terms?: string;
}

export interface InvoiceTotals {
  subtotal: number;
  discountValue: number;
  taxAmount: number;
  totalAmount: number;
}

export interface GenerateInvoicePdfParams {
  form: InvoiceFormData;
  companySnapshot: CompanySnapshot;
  clientDetails?: ClientDetails;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  summary: InvoiceSummary;
  accentColor?: string;
  fallbackLogoUrl?: string;
}

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(value || 0);

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16,
  );
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export type LogoSource = File | Blob | string | imageUrls | null | undefined;

const resolveLogoUrl = (
  source: LogoSource,
): { url: string; isObjectUrl: boolean } | null => {
  if (!source) return null;

  if (typeof source === "string") {
    return { url: source, isObjectUrl: false };
  }

  if (source instanceof Blob) {
    return { url: URL.createObjectURL(source), isObjectUrl: true };
  }

  const inner = (source as imageUrls).imageUrl as unknown;
  if (typeof inner === "string") {
    return { url: inner, isObjectUrl: false };
  }
  if (inner instanceof Blob) {
    return { url: URL.createObjectURL(inner), isObjectUrl: true };
  }

  return null;
};

const getCircularLogoDataUrl = async (
  source: LogoSource,
  size = 200,
): Promise<string | null> => {
  const resolved = resolveLogoUrl(source);
  if (!resolved) return null;

  try {
    const img = await loadImage(resolved.url);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    ctx.restore();

    return canvas.toDataURL("image/png");
  } finally {
    if (resolved.isObjectUrl) URL.revokeObjectURL(resolved.url);
  }
};

export async function generateInvoicePDF({
  form,
  companySnapshot,
  clientDetails,
  items,
  totals,
  summary,
  accentColor = "#0f4c81",
  fallbackLogoUrl,
}: GenerateInvoicePdfParams): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [ar, ag, ab] = hexToRgb(accentColor);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;
  let y = 20;

  const accentText = () => doc.setTextColor(ar, ag, ab);
  const grayText = () => doc.setTextColor(90, 90, 90);
  const blackText = () => doc.setTextColor(20, 20, 20);
  const divider = (yPos: number) => {
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.15);
    doc.line(marginX, yPos, marginX + contentWidth, yPos);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  accentText();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Invoice", marginX, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice Number:", marginX, y + 8);
  grayText();
  doc.setFont("helvetica", "normal");
  doc.text(
    (form.invoiceNumber || "").toUpperCase(),
    marginX + doc.getTextWidth("Invoice Number: ") + 1,
    y + 8,
  );

  const logoSize = 20;
  const logoX = marginX + contentWidth - logoSize;
  const logoY = y - 12;
  try {
    const logoSrc: LogoSource = companySnapshot.logo || fallbackLogoUrl;
    if (logoSrc) {
      const circularLogo = await getCircularLogoDataUrl(logoSrc);
      if (circularLogo) {
        doc.addImage(circularLogo, "PNG", logoX, logoY, logoSize, logoSize);
      }
    }
  } catch {}

  y += 20;

  accentText();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Issue Date:", marginX, y);
  doc.text("Due Date:", marginX + 120, y);

  grayText();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(form.issueDate || "No Date", marginX, y + 5);
  doc.text(form.dueDate || "No Date", marginX + 120, y + 5);

  y += 12;
  divider(y);
  y += 8;

  const colWidth = contentWidth / 1.5;

  accentText();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Billed By:", marginX, y);
  doc.text("Billed To:", marginX + colWidth, y);

  const billedByLines = [
    `Name: ${companySnapshot.name || "Name Not Provided"}`,
    `Email: ${companySnapshot.email || "Email Not Provided"}`,
    `Address: ${companySnapshot.address || "Address Not Provided"}`,
  ];
  const billedToLines = [
    `Name: ${clientDetails?.name || "Name Not Provided"}`,
    `Email: ${clientDetails?.email || "Email Not Provided"}`,
    `Address: ${clientDetails?.address || "Address Not Provided"}`,
  ];

  grayText();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  billedByLines.forEach((line, i) => {
    const wrapped = doc.splitTextToSize(line, colWidth - 10);
    doc.text(wrapped, marginX, y + 6 + i * 5);
  });
  billedToLines.forEach((line, i) => {
    const wrapped = doc.splitTextToSize(line, colWidth - 10);
    doc.text(wrapped, marginX + colWidth, y + 6 + i * 5);
  });

  y += 6 + billedByLines.length * 5 + 6;
  divider(y);
  y += 8;

  const colX = {
    item: marginX + 3,
    qty: marginX + contentWidth - 90,
    price: marginX + contentWidth - 60,
    total: marginX + contentWidth - 3,
  };

  const drawTableHeader = () => {
    doc.setFillColor(ar, ag, ab);
    doc.rect(marginX, y, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Item", colX.item, y + 5.5);
    doc.text("Qty", colX.qty, y + 5.5, { align: "right" });
    doc.text("Price", colX.price, y + 5.5, { align: "right" });
    doc.text("Total", colX.total, y + 5.5, { align: "right" });
    y += 15;
  };

  drawTableHeader();

  const validItems = items.filter((i) => i.itemName.trim() !== "");

  blackText();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  if (validItems.length === 0) {
    doc.setTextColor(170, 170, 170);
    doc.setFont("helvetica", "italic");
    doc.text("No items added yet", colX.item, y);
    y += 8;
  } else {
    validItems.forEach((item) => {
      ensureSpace(9);
      const rowTotal = item.quantity * item.unitPrice;
      blackText();
      doc.setFont("helvetica", "normal");
      const nameText = doc.splitTextToSize(
        item.itemName,
        colX.qty - colX.item - 10,
      )[0];
      doc.text(nameText, colX.item, y);
      doc.text(String(item.quantity), colX.qty, y, { align: "right" });
      doc.text(formatMoney(item.unitPrice, form.currency), colX.price, y, {
        align: "right",
      });
      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(rowTotal, form.currency), colX.total, y, {
        align: "right",
      });
      y += 7;
    });
  }

  y += 3;
  ensureSpace(30);
  divider(y);
  y += 8;

  const taxPct =
    (summary?.vatPercentage || 0) +
    (summary?.getfundPercentage || 0) +
    (summary?.nhilPercentage || 0);

  const totalsRow = (
    label: string,
    value: string,
    opts?: { bold?: boolean; color?: [number, number, number]; big?: boolean },
  ) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.big ? 12.5 : 9.5);
    if (opts?.color) doc.setTextColor(...opts.color);
    else grayText();
    doc.text(label, marginX, y);
    if (opts?.color) doc.setTextColor(...opts.color);
    else blackText();
    doc.text(value, marginX + contentWidth, y, { align: "right" });
    y += opts?.big ? 8 : 6;
  };

  totalsRow("Subtotal", formatMoney(totals.subtotal, form.currency));
  totalsRow(
    "Discount",
    `-${formatMoney(totals.discountValue, form.currency)}`,
    {
      color: [220, 38, 38],
    },
  );
  totalsRow(
    `Tax (VAT, GETFund, NHIL): ${taxPct}%`,
    formatMoney(totals.taxAmount, form.currency),
  );

  y += 2;
  totalsRow("Total", formatMoney(totals.totalAmount, form.currency), {
    bold: true,
    color: [ar, ag, ab],
    big: true,
  });

  if (summary.notes || summary.terms) {
    y += 4;
    ensureSpace(20);
    divider(y);
    y += 7;

    if (summary.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Notes", marginX, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const notesLines = doc.splitTextToSize(summary.notes, contentWidth);
      doc.text(notesLines, marginX, y);
      y += notesLines.length * 5 + 4;
    }

    if (summary.terms) {
      ensureSpace(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Terms", marginX, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const termsLines = doc.splitTextToSize(summary.terms, contentWidth);
      doc.text(termsLines, marginX, y);
      y += termsLines.length * 5;
    }
  }

  if (
    companySnapshot.paymentMethods &&
    companySnapshot.paymentMethods.length > 0
  ) {
    y += 4;
    ensureSpace(20);
    divider(y);
    y += 7;

    const methods = companySnapshot.paymentMethods;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Payment Method${methods.length > 1 ? "s" : ""}`, marginX, y);
    y += 6;

    methods.forEach((method) => {
      ensureSpace(26);

      accentText();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(
        method.paymentType === "Bank" ? "Bank Transfer" : "Mobile Money",
        marginX,
        y,
      );
      y += 5;

      const lines =
        method.paymentType === "Bank"
          ? [
              `Bank: ${method.bankName || "N/A"}`,
              `Branch: ${method.bankBranch || "N/A"}`,
              `Account Name: ${method.accountName || "N/A"}`,
              `Account Number: ${method.accountNumber || "N/A"}`,
            ]
          : [
              `Network: ${method.momoVendor || "N/A"}`,
              `Name: ${method.momoName || "N/A"}`,
              `Wallet: ${method.momoWallet || "N/A"}`,
            ];

      grayText();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      lines.forEach((line) => {
        ensureSpace(5);
        doc.text(line, marginX, y);
        y += 5;
      });

      y += 2;
    });
  }

  return doc;
}

export async function downloadInvoicePDF(params: GenerateInvoicePdfParams) {
  const doc = await generateInvoicePDF(params);
  doc.save(`invoice-${params.form.invoiceNumber || "untitled"}.pdf`);
}
