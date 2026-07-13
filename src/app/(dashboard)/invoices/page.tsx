"use client";

import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import OverviewStatCard from "@/components/Dashboard/OverviewStats";
import InvoiceTabs from "@/components/Dashboard/Tabs";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import Button from "@/components/ui/btn";
import { ConfirmationModal } from "@/components/ui/confirmationModal";
import { CustomTable } from "@/components/ui/CustomTable";
import { Drawer } from "@/components/ui/drawer";
import CustomInput from "@/components/ui/Input";
import Select from "@/components/ui/select";
import ToggleSwitch from "@/components/ui/toggle";
import queryClient from "@/lib/query-client";
import { getClient } from "@/services/client";
import {
  deleteInvoice,
  editInvoice,
  getInvoices,
  getSingleInvoice,
  getStatInvoices,
} from "@/services/invoice";
import { downloadInvoicePDF } from "@/services/invoiceGenerator";
import { getSettings } from "@/services/settings";
import { useUserStore } from "@/store/useUserStore";
import {
  ClientType,
  imageUrls,
  InvoiceCustomization,
  InvoiceItems,
  PaymentMethod,
} from "@/types/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { DiamondPlus, Pencil, Trash2, Plus, Download } from "lucide-react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type FormInvoiceItem = {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
};

export const CURRENCIES = ["GHS", "USD", "EUR", "GBP"];

export const makeEmptyItem = (): FormInvoiceItem => ({
  id: crypto.randomUUID(),
  itemName: "",
  quantity: 1,
  unitPrice: 0,
});

const DEFAULT_TERMS =
  "Payment of Service should be made in Cash / Cheque / Bank Deposit Transfer:";

const statusStyles: Record<string, string> = {
  draft: "bg-yellow-50 text-yellow-600 border-yellow-200",
  saved: "bg-green-50 text-green-600 border-green-200",
};

const formInitialState = {
  invoiceNumber: "",
  issueDate: "",
  dueDate: "",
  currency: "GHS",
};

const companySnapshotInitialState: {
  name: string;
  email: string;
  address: string;
  invoicePrefix: string;
  paymentMethods: PaymentMethod[];
  logo: File | imageUrls | null;
} = {
  name: "",
  email: "",
  address: "",
  invoicePrefix: "",
  paymentMethods: [],
  logo: null,
};

const summaryInitialState = {
  discountValue: 0,
  vatPercentage: 0,
  nhilPercentage: 0,
  getfundPercentage: 0,
  notes: "",
  terms: DEFAULT_TERMS,
};

const invoiceCustomizationInitialState: InvoiceCustomization = {
  primaryColor: null,
  secondaryColor: null,
  letterHeadImg: null,
  signatureImg: null,
  showLogo: true,
  showLetterHead: true,
  showSignature: true,
  showCompanySnapshot: true,
  showPaymentMethods: true,
  showNotes: true,
  showTerms: true,
  showItemTable: true,
};

const SECTION_TOGGLES: {
  key: keyof InvoiceCustomization;
  label: string;
  description: string;
}[] = [
  {
    key: "showLogo",
    label: "Company Logo",
    description: "Show your logo in the header",
  },
  {
    key: "showLetterHead",
    label: "Letterhead",
    description: "Show the letterhead banner",
  },
  {
    key: "showSignature",
    label: "Signature",
    description: "Show a signature at the bottom",
  },
  {
    key: "showCompanySnapshot",
    label: "Company Snapshot",
    description: "Show your business details",
  },
  {
    key: "showPaymentMethods",
    label: "Payment Methods",
    description: "Show how you'd like to get paid",
  },
  { key: "showNotes", label: "Notes", description: "Show the notes section" },
  { key: "showTerms", label: "Terms", description: "Show payment terms" },
  {
    key: "showItemTable",
    label: "Item Table",
    description: "Show the line-item breakdown",
  },
];

const isSamePaymentMethod = (a: PaymentMethod, b: PaymentMethod): boolean => {
  if (a.paymentType !== b.paymentType) return false;
  if (a.paymentType === "Bank" && b.paymentType === "Bank") {
    return a.accountNumber === b.accountNumber;
  }
  if (a.paymentType === "Momo" && b.paymentType === "Momo") {
    return a.momoWallet === b.momoWallet;
  }
  return false;
};

const getLogoSrc = (logo: imageUrls | File | null): string | null => {
  if (!logo) return null;
  if (logo instanceof File) return URL.createObjectURL(logo);
  return logo.imageUrl;
};

const getAssetSrc = (asset: unknown): string | null => {
  if (!asset) return null;
  if (asset instanceof File) return URL.createObjectURL(asset);
  if (typeof asset === "string") return asset;
  if (typeof asset === "object" && asset !== null && "imageUrl" in asset) {
    return (asset as imageUrls).imageUrl;
  }
  return null;
};

function buildInvoiceFormData(
  form: typeof formInitialState,
  companySnapshot: typeof companySnapshotInitialState,
  clientDetails: ClientType | undefined,
  items: FormInvoiceItem[],
  summary: typeof summaryInitialState,
  totals: {
    subtotal: number;
    discountValue: number;
    vatAmount: number;
    nhilAmount: number;
    getfundAmount: number;
    taxAmount: number;
    totalAmount: number;
  },
  invoiceCustomSettings: InvoiceCustomization,
) {
  const fd = new FormData();

  fd.append("invoiceNumber", form.invoiceNumber);
  fd.append("status", "saved");
  fd.append("issueDate", form.issueDate);
  fd.append("dueDate", form.dueDate);
  fd.append("currency", form.currency);

  if (clientDetails?.id) {
    fd.append("clientId", String(clientDetails.id));
  }

  fd.append(
    "companySnapshot",
    JSON.stringify({
      name: companySnapshot.name,
      email: companySnapshot.email,
      address: companySnapshot.address,
      invoicePrefix: companySnapshot.invoicePrefix,
      paymentMethods: companySnapshot.paymentMethods,
      logo:
        companySnapshot.logo instanceof File ? undefined : companySnapshot.logo,
    }),
  );

  fd.append(
    "invoiceItem",
    JSON.stringify(
      items.map(({ itemName, quantity, unitPrice }) => ({
        itemName,
        quantity,
        unitPrice,
      })),
    ),
  );

  fd.append("discountValue", String(summary.discountValue));
  fd.append("vatPercentage", String(summary.vatPercentage));
  fd.append("nhilPercentage", String(summary.nhilPercentage));
  fd.append("getfundPercentage", String(summary.getfundPercentage));
  fd.append("notes", summary.notes);
  fd.append("terms", summary.terms);

  fd.append("subtotal", String(totals.subtotal));
  fd.append("taxAmount", String(totals.taxAmount));
  fd.append("totalAmount", String(totals.totalAmount));

  if (companySnapshot.logo instanceof File) {
    fd.append("companyLogo", companySnapshot.logo);
  }

  fd.append("invoiceCustomization", JSON.stringify(invoiceCustomSettings));

  if (invoiceCustomSettings.letterHeadImg instanceof File) {
    fd.append("letterHeadImg", invoiceCustomSettings.letterHeadImg);
  }
  if (invoiceCustomSettings.signatureImg instanceof File) {
    fd.append("signatureImg", invoiceCustomSettings.signatureImg);
  }

  return fd;
}

export default function Invoice() {
  const { userInfo } = useUserStore();
  const userRole = userInfo.user.role;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [id, setID] = useState(0);
  const [openConfrim, setOpenConfirm] = useState(false);
  const [openDownloadConfrim, setOpenDownloadConfrim] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [customizeInvoice, setCustomizeInvoice] = useState(false);
  const route = useRouter();

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["Invoices"],
    queryFn: () => getInvoices(page, limit),
  });

  const { data: invoicesStats } = useQuery({
    queryKey: ["InvoicesStats"],
    queryFn: getStatInvoices,
  });

  const { data: clientData } = useQuery({
    queryKey: ["Clients"],
    queryFn: getClient,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["OrgSettings"],
    queryFn: getSettings,
  });

  const clientList = useMemo(
    () => clientData?.map(({ name }: { name: string }) => name) ?? [],
    [clientData],
  );

  const { data: singleInvoice, isLoading: singleInvoiceLoading } = useQuery({
    queryKey: ["SingleInvoice", id],
    queryFn: () => getSingleInvoice(id),
    enabled: (isEdit && id !== 0) || openDownloadConfrim,
  });

  const [form, setForm] = useState(formInitialState);
  const [client, setClient] = useState("");
  const [clientDetails, setClientDetails] = useState<ClientType | undefined>();
  const [companySnapshot, setCompanySnapshot] = useState(
    companySnapshotInitialState,
  );
  const [items, setItems] = useState<FormInvoiceItem[]>([makeEmptyItem()]);
  const [summary, setSummary] = useState(summaryInitialState);
  const [invoiceCustomSettings, setInvoiceCustomSettings] =
    useState<InvoiceCustomization>(invoiceCustomizationInitialState);

  useEffect(() => {
    if (!singleInvoice || !id || (!isEdit && !openDownloadConfrim)) return;
    setForm({
      invoiceNumber: singleInvoice.invoiceNumber ?? "",
      issueDate: singleInvoice.issueDate
        ? singleInvoice.issueDate.split("T")[0]
        : "",
      dueDate: singleInvoice.dueDate ? singleInvoice.dueDate.split("T")[0] : "",
      currency: singleInvoice.currency ?? "GHS",
    });

    setClient(singleInvoice.clientInfo?.name ?? "");
    setClientDetails(singleInvoice.clientInfo);

    setCompanySnapshot({
      name: singleInvoice.companySnapshot?.name ?? "",
      email: singleInvoice.companySnapshot?.email ?? "",
      address: singleInvoice.companySnapshot?.address ?? "",
      invoicePrefix: singleInvoice.companySnapshot?.invoicePrefix ?? "",
      paymentMethods: singleInvoice.companySnapshot?.paymentMethods ?? [],
      logo: singleInvoice.companySnapshot?.logo ?? null,
    });

    setItems(
      singleInvoice.items?.length
        ? singleInvoice.items.map((it: InvoiceItems) => ({
            id: String(it.id),
            itemName: String(it.itemName),
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          }))
        : [makeEmptyItem()],
    );

    setSummary({
      discountValue: Number(singleInvoice.discountValue) || 0,
      vatPercentage: Number(singleInvoice.vatPercentage) || 0,
      nhilPercentage: Number(singleInvoice.nhilPercentage) || 0,
      getfundPercentage: Number(singleInvoice.getfundPercentage) || 0,
      notes: singleInvoice.notes ?? "",
      terms: singleInvoice.terms ?? DEFAULT_TERMS,
    });

    setInvoiceCustomSettings({
      primaryColor: singleInvoice.invoiceCustomization?.primaryColor ?? null,
      secondaryColor:
        singleInvoice.invoiceCustomization?.secondaryColor ?? null,
      letterHeadImg: singleInvoice.invoiceCustomization?.letterHeadImg ?? null,
      signatureImg: singleInvoice.invoiceCustomization?.signatureImg ?? null,
      showLogo: singleInvoice.invoiceCustomization?.showLogo ?? true,
      showLetterHead:
        singleInvoice.invoiceCustomization?.showLetterHead ?? true,
      showSignature: singleInvoice.invoiceCustomization?.showSignature ?? true,
      showCompanySnapshot:
        singleInvoice.invoiceCustomization?.showCompanySnapshot ?? true,
      showPaymentMethods:
        singleInvoice.invoiceCustomization?.showPaymentMethods ?? true,
      showNotes: singleInvoice.invoiceCustomization?.showNotes ?? true,
      showTerms: singleInvoice.invoiceCustomization?.showTerms ?? true,
      showItemTable: singleInvoice.invoiceCustomization?.showItemTable ?? true,
    });
  }, [singleInvoice, isEdit, openDownloadConfrim, id]);

  useEffect(() => {
    const selectedClient = clientData?.find(
      (c: { name: string }) => c.name === client,
    );
    if (!selectedClient) return;

    setClientDetails({
      id: selectedClient.id,
      name: selectedClient.name,
      email: selectedClient.email,
      address: selectedClient.address,
    });
  }, [client, clientData]);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSummaryChange = (key: keyof typeof summary, value: string) => {
    setSummary((prev) => ({
      ...prev,
      [key]: key === "notes" || key === "terms" ? value : Number(value),
    }));
  };

  const handleItemChange = (
    itemId: string,
    field: keyof Omit<FormInvoiceItem, "id">,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]:
                field === "itemName" ? value : Math.max(0, Number(value)),
            }
          : item,
      ),
    );
  };

  const addItem = () => setItems((prev) => [...prev, makeEmptyItem()]);

  const removeItem = (itemId: string) =>
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((it) => it.id !== itemId),
    );

  const togglePaymentMethod = (method: PaymentMethod) => {
    setCompanySnapshot((prev) => {
      const exists = prev.paymentMethods.some((m) =>
        isSamePaymentMethod(m, method),
      );
      return {
        ...prev,
        paymentMethods: exists
          ? prev.paymentMethods.filter((m) => !isSamePaymentMethod(m, method))
          : [...prev.paymentMethods, method],
      };
    });
  };

  const handleInvCustomization = (
    key: keyof InvoiceCustomization,
    value: any,
  ) => {
    setInvoiceCustomSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleInvCustomization = (key: keyof InvoiceCustomization) => {
    setInvoiceCustomSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const discountValue = Math.min(summary.discountValue, subtotal);
    const taxableAmount = subtotal - discountValue;

    const vatAmount = (taxableAmount * summary.vatPercentage) / 100;
    const nhilAmount = (taxableAmount * summary.nhilPercentage) / 100;
    const getfundAmount = (taxableAmount * summary.getfundPercentage) / 100;
    const taxAmount = vatAmount + nhilAmount + getfundAmount;

    const totalAmount = taxableAmount + taxAmount;

    return {
      subtotal,
      discountValue,
      vatAmount,
      nhilAmount,
      getfundAmount,
      taxAmount,
      totalAmount,
    };
  }, [items, summary]);

  const resetDrawerState = () => {
    setIsEdit(false);
    setID(0);
    setForm(formInitialState);
    setClient("");
    setClientDetails(undefined);
    setCompanySnapshot(companySnapshotInitialState);
    setItems([makeEmptyItem()]);
    setSummary(summaryInitialState);
    setInvoiceCustomSettings(invoiceCustomizationInitialState);
    setCustomizeInvoice(false);
    setIsPreview(false);
  };

  const { mutate: invoiceDeleteMutate, isPending: invoiceDeletePending } =
    useMutation({
      mutationKey: ["DeleteInvoice"],
      mutationFn: deleteInvoice,
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ["Invoices"] });
        setOpenConfirm(false);
        setID(0);
      },
      onError: (data: any) => {
        toast.error(data?.message ?? "Failed to delete invoice");
      },
    });

  const { mutate: invoiceUpdateMutate, isPending: invoiceUpdatePending } =
    useMutation({
      mutationKey: ["InvoiceUpdate", id],
      mutationFn: (formData: FormData) => editInvoice(formData, id),
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ["Invoices"] });
        queryClient.invalidateQueries({ queryKey: ["SingleInvoice", id] });
        resetDrawerState();
      },
      onError: (data: any) => {
        toast.error(data?.message ?? "Failed to update invoice");
      },
    });

  const handleUpdateInvoice = () => {
    const formData = buildInvoiceFormData(
      form,
      companySnapshot,
      clientDetails,
      items,
      summary,
      totals,
      invoiceCustomSettings,
    );
    invoiceUpdateMutate(formData);
  };

  const logoSrc = getLogoSrc(companySnapshot.logo);
  const letterHeadSrc = getAssetSrc(invoiceCustomSettings.letterHeadImg);
  const signatureSrc = getAssetSrc(invoiceCustomSettings.signatureImg);

  const previewPrimary = invoiceCustomSettings.primaryColor || undefined;
  const previewSecondary = invoiceCustomSettings.secondaryColor || undefined;

  const accentTextStyle = previewPrimary
    ? { color: previewPrimary }
    : undefined;
  const accentBgStyle = previewPrimary
    ? { backgroundColor: previewPrimary }
    : undefined;

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <div className="">
          <DashboardHeader
            title="Overview"
            subtitle="Track invoices, drafts, and overdues"
          />
        </div>
        <div className="">
          <OverviewStatCard
            stats={
              invoicesStats ?? {
                draftInvoices: 0,
                overdueInvoices: 0,
                totalInvoices: 0,
              }
            }
          />
        </div>

        <div className="mt-7">
          <DashboardHeader title="Invoives">
            <Button
              className="group"
              leftIcon={
                <DiamondPlus className="w-5 h-5 transition-transform duration-150 group-hover:rotate-45" />
              }
              onClick={() => route.push("/invoices/addInvoice")}
            >
              Add Invoice
            </Button>
          </DashboardHeader>
        </div>

        <div className="flex items-center justify-between">
          <InvoiceTabs
            data={
              invoicesStats ?? {
                draftInvoices: 0,
                overdueInvoices: 0,
                totalInvoices: 0,
              }
            }
            onChange={(tab) => console.log(tab)}
          />
          <div className="w-100">
            <CustomInput
              type="text"
              id="search"
              placeholder="search..."
              onChange={() => {}}
            />
          </div>
        </div>

        <div className="mt-5">
          <CustomTable
            data={invoices ?? []}
            pageSize={6}
            selectable
            loading={invoicesLoading}
            getRowId={(invoice) => invoice.id}
            onSelectionChange={(ids) => console.log("Selected:", ids)}
            columns={[
              {
                key: "invoiceNumber",
                title: "Invoice #",
                render: (invoice) => (
                  <span className="font-medium text-gray-800">
                    {invoice.invoiceNumber}
                  </span>
                ),
              },
              {
                key: "company",
                title: "Company",
                render: (invoice) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">
                      {invoice.companySnapshot?.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {invoice.companySnapshot?.address}
                    </span>
                  </div>
                ),
              },
              {
                key: "amount",
                title: "Amount",
                render: (invoice) => (
                  <span className="font-medium text-gray-800">
                    {invoice.currency}{" "}
                    {Number(invoice.totalAmount).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "issueDate",
                title: "Issue Date",
                render: (invoice) =>
                  new Date(invoice.issueDate).toLocaleDateString(),
              },
              {
                key: "dueDate",
                title: "Due Date",
                render: (invoice) =>
                  new Date(invoice.dueDate).toLocaleDateString(),
              },
            ]}
            showStatus
            renderStatus={(invoice) => (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  statusStyles[invoice.status]
                }`}
              >
                {invoice.status}
              </span>
            )}
            showActions
            renderActions={(invoice) => (
              <div className="flex items-center justify-end gap-2">
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md
                 bg-primary/10 text-primary hover:bg-accent/20 transition"
                  onClick={() => {
                    setID(invoice.id);
                    setOpenDownloadConfrim(true);
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* <button
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md
                  bg-primary/10 text-primary hover:bg-accent/20 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button> */}
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md
                  bg-accent/10 text-accent hover:bg-accent/20 transition"
                  onClick={() => {
                    setID(invoice.id);
                    setIsEdit(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md
                  bg-red-50 text-red-600 hover:bg-red-100 transition"
                  onClick={() => {
                    setOpenConfirm(true);
                    setID(invoice.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <ConfirmationModal
        open={openConfrim}
        message={"Are you sure you want to delete this Invoice"}
        loading={invoiceDeletePending}
        onConfirm={() => {
          invoiceDeleteMutate(id);
        }}
        onCancel={() => setOpenConfirm(false)}
      />

      <ConfirmationModal
        open={openDownloadConfrim}
        loading={singleInvoiceLoading || downloadingPdf}
        title="Download Invoice"
        confirmText="Download Invoice"
        onConfirm={async () => {
          setDownloadingPdf(true);
          try {
            await downloadInvoicePDF({
              form: form,
              companySnapshot: companySnapshot,
              clientDetails: clientDetails,
              items: items,
              totals: totals,
              summary: summary,
              accentColor: "#003932",
              fallbackLogoUrl: "",
              invoiceCustomization: invoiceCustomSettings,
            });
            setOpenDownloadConfrim(false);
          } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF. Please try again.");
          } finally {
            setDownloadingPdf(false);
          }
        }}
        onCancel={() => {
          setOpenDownloadConfrim(false);
        }}
        message="You're about to download this invoice as a PDF. Please confirm that all invoice details are correct before continuing."
      />

      <Drawer
        open={isEdit}
        onClose={resetDrawerState}
        width="xl2"
        title={`Edit Invoice ${singleInvoice?.invoiceNumber || "INV-----"}`}
      >
        <div className="bg-white rounded-lg border-2 border-accent/30 p-4 sm:p-5 flex-1 space-y-6">
          {singleInvoiceLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading invoice…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end gap-x-2">
                <p className="text-sm text-accent font-medium">Show Preview</p>
                <ToggleSwitch
                  checked={isPreview}
                  disabled={false}
                  onChange={setIsPreview}
                />
              </div>

              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1 min-w-0 space-y-6">
                  <div>
                    <h3 className="text-accent text-xl sm:text-2xl font-medium mb-4 sm:mb-5">
                      Invoice Details
                    </h3>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="w-full">
                        <CustomInput
                          label="Invoice Number"
                          type="text"
                          value={form.invoiceNumber}
                          placeholder="INV00123"
                          id="invoiceNumber"
                          disabled
                          onChange={(e: any) =>
                            handleChange("invoiceNumber", e.target.value)
                          }
                        />
                      </div>

                      <div className="w-full">
                        <Select
                          label="Client"
                          list={clientList}
                          text="Select a Client"
                          value={client}
                          onChange={(value: string) => setClient(value)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-3">
                      <h3 className="text-accent text-xl sm:text-2xl font-medium mb-4 sm:mb-5">
                        Company Snapshot
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-accent">
                            Company Logo
                          </label>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-accent/30 overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                              {logoSrc ? (
                                <Image
                                  src={logoSrc}
                                  alt="Company Logo"
                                  width={80}
                                  height={80}
                                  unoptimized={
                                    companySnapshot.logo instanceof File
                                  }
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No Logo
                                </span>
                              )}
                            </div>

                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const MAX_SIZE = 2 * 1024 * 1024;

                                if (file.size > MAX_SIZE) {
                                  toast.error("Image must be 2MB or less");
                                  return;
                                }

                                setCompanySnapshot((prev) => ({
                                  ...prev,
                                  logo: file,
                                }));
                              }}
                              className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:bg-accent file:text-white
                    file:cursor-pointer hover:file:opacity-90"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-x-3">
                          <CustomInput
                            label="Company Name"
                            type="text"
                            id="companyName"
                            placeholder="Company Name"
                            value={companySnapshot.name}
                            onChange={(e: any) =>
                              setCompanySnapshot((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                          />

                          <CustomInput
                            label="Company Email"
                            type="email"
                            id="companyEmail"
                            value={companySnapshot.email}
                            placeholder="Company Email"
                            onChange={(e: any) =>
                              setCompanySnapshot((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                          />

                          <CustomInput
                            label="Company Address"
                            type="text"
                            id="companyAddress"
                            placeholder="Company Address"
                            value={companySnapshot.address}
                            onChange={(e: any) =>
                              setCompanySnapshot((prev) => ({
                                ...prev,
                                address: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="w-full">
                        <CustomInput
                          label="Issue Date"
                          type="date"
                          value={form.issueDate}
                          id="issueDate"
                          onChange={(e: any) =>
                            handleChange("issueDate", e.target.value)
                          }
                        />
                      </div>

                      <div className="w-full">
                        <CustomInput
                          label="Due Date"
                          type="date"
                          value={form.dueDate}
                          id="dueDate"
                          onChange={(e: any) =>
                            handleChange("dueDate", e.target.value)
                          }
                        />
                      </div>

                      <div className="w-full">
                        <Select
                          label="Currency"
                          list={CURRENCIES}
                          text="Select Currency"
                          value={form.currency}
                          onChange={(value: string) =>
                            handleChange("currency", value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-0.5 bg-accent/30"></div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <h3 className="text-accent text-xl sm:text-2xl font-medium">
                        Invoice Items
                      </h3>
                      <div className="w-full sm:w-35">
                        <Button
                          variant="outline"
                          className="group w-full sm:w-auto"
                          leftIcon={
                            <Plus className="w-4 h-4 transition-transform duration-150 group-hover:rotate-90" />
                          }
                          onClick={addItem}
                        >
                          Add Item
                        </Button>
                      </div>
                    </div>

                    <div className="hidden sm:grid grid-cols-[1fr_100px_140px_140px_40px] gap-x-3 px-1 pb-2 text-sm font-medium text-gray-500">
                      <span>Item Name</span>
                      <span>Qty</span>
                      <span>Unit Price</span>
                      <span>Total</span>
                      <span></span>
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => {
                        const lineTotal = item.quantity * item.unitPrice;
                        return (
                          <div
                            key={item.id}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px_140px_40px] gap-3 items-center border border-accent/15 rounded-md p-3 sm:border-0 sm:p-0"
                          >
                            <CustomInput
                              type="text"
                              id={`itemName`}
                              placeholder="Item or service name"
                              value={item.itemName}
                              onChange={(e: any) =>
                                handleItemChange(
                                  item.id,
                                  "itemName",
                                  e.target.value,
                                )
                              }
                            />

                            <CustomInput
                              type="number"
                              id={`quantity`}
                              placeholder="1"
                              value={item.quantity}
                              onChange={(e: any) =>
                                handleItemChange(
                                  item.id,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                            />

                            <CustomInput
                              type="number"
                              id={`unitPrice`}
                              placeholder="0.00"
                              value={item.unitPrice}
                              onChange={(e: any) =>
                                handleItemChange(
                                  item.id,
                                  "unitPrice",
                                  e.target.value,
                                )
                              }
                            />

                            <div className="flex items-center justify-between sm:block">
                              <span className="text-xs text-gray-500 sm:hidden">
                                Total
                              </span>
                              <p className="text-accent font-medium px-1">
                                {form.currency} {lineTotal.toLocaleString()}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="inline-flex items-center justify-center w-full sm:w-8 h-9 sm:h-8 rounded-md text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed border border-red-100 sm:border-0"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="ml-2 text-xs sm:hidden">
                                Remove item
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full h-0.5 bg-accent/30"></div>

                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-3">
                      <h3 className="text-accent text-xl sm:text-2xl font-medium mb-2">
                        Adjustments
                      </h3>

                      <CustomInput
                        label="Discount"
                        type="number"
                        id="discountValue"
                        value={summary.discountValue}
                        onChange={(e: any) =>
                          handleSummaryChange("discountValue", e.target.value)
                        }
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <CustomInput
                          label="VAT %"
                          type="number"
                          id="vatPercentage"
                          value={summary.vatPercentage}
                          onChange={(e: any) =>
                            handleSummaryChange("vatPercentage", e.target.value)
                          }
                        />
                        <CustomInput
                          label="NHIL %"
                          type="number"
                          id="nhilPercentage"
                          value={summary.nhilPercentage}
                          onChange={(e: any) =>
                            handleSummaryChange(
                              "nhilPercentage",
                              e.target.value,
                            )
                          }
                        />
                        <CustomInput
                          label="GETFund %"
                          type="number"
                          id="getfundPercentage"
                          value={summary.getfundPercentage}
                          onChange={(e: any) =>
                            handleSummaryChange(
                              "getfundPercentage",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="flex-1 bg-accent/5 rounded-lg p-4 space-y-2 h-fit">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-accent">
                          {form.currency} {totals.subtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Discount</span>
                        <span className="font-medium text-red-500">
                          -{form.currency}{" "}
                          {totals.discountValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          VAT ({summary.vatPercentage || 0}%)
                        </span>
                        <span className="font-medium text-accent">
                          {form.currency} {totals.vatAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          NHIL ({summary.nhilPercentage || 0}%)
                        </span>
                        <span className="font-medium text-accent">
                          {form.currency} {totals.nhilAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          GETFund ({summary.getfundPercentage || 0}%)
                        </span>
                        <span className="font-medium text-accent">
                          {form.currency}{" "}
                          {totals.getfundAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-px bg-accent/20 my-1"></div>
                      <div className="flex items-center justify-between text-lg">
                        <span className="text-accent font-semibold">Total</span>
                        <span className="text-accent font-bold">
                          {form.currency} {totals.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-0.5 bg-accent/30"></div>

                  {settingsData?.paymentMethod &&
                    settingsData?.paymentMethod?.length > 0 && (
                      <div className="mt-4 sm:mt-5">
                        <h3 className="text-accent text-xl sm:text-2xl font-medium mb-3">
                          Payment Method
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(settingsData?.paymentMethod as PaymentMethod[]).map(
                            (method, index) => {
                              const isSelected =
                                companySnapshot.paymentMethods.some((m) =>
                                  isSamePaymentMethod(m, method),
                                );

                              return (
                                <div
                                  key={index}
                                  role="checkbox"
                                  aria-checked={isSelected}
                                  tabIndex={0}
                                  onClick={() => togglePaymentMethod(method)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      togglePaymentMethod(method);
                                    }
                                  }}
                                  className={`cursor-pointer rounded-md border p-3 transition-all duration-150 ${
                                    isSelected
                                      ? "border-accent bg-accent/5"
                                      : "border-accent/20 hover:border-accent/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-x-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() =>
                                        togglePaymentMethod(method)
                                      }
                                      className="w-4 h-4 accent-primary cursor-pointer"
                                    />
                                    <p className="font-medium text-accent">
                                      {method.paymentType === "Bank"
                                        ? "Bank Transfer"
                                        : "Mobile Money"}
                                    </p>
                                  </div>

                                  {method.paymentType === "Bank" ? (
                                    <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                                      <p>Bank: {method.bankName}</p>
                                      <p>Branch: {method.bankBranch}</p>
                                      <p>Account Name: {method.accountName}</p>
                                      <p>
                                        Account Number: {method.accountNumber}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                                      <p>Network: {method.momoVendor}</p>
                                      <p>Name: {method.momoName}</p>
                                      <p>Wallet: {method.momoWallet}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}

                  <div className="w-full h-0.5 bg-accent/30"></div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-accent">
                        Notes
                      </label>
                      <textarea
                        className="w-full rounded-md border border-accent/30 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-25 text-accent"
                        placeholder="Thank you for your business..."
                        value={summary.notes}
                        maxLength={1000}
                        onChange={(e) =>
                          handleSummaryChange("notes", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-accent">
                        Terms
                      </label>
                      <textarea
                        className="w-full rounded-md border border-accent/30 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-25 text-accent"
                        placeholder="Payment due within 14 days..."
                        value={summary.terms}
                        maxLength={1000}
                        onChange={(e) =>
                          handleSummaryChange("terms", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="w-full h-0.5 bg-accent/30"></div>

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div>
                      <p className="text-sm sm:text-base font-medium text-accent">
                        Customize Your Invoice
                      </p>
                      <p className="text-xs text-gray-500">
                        Brand colors, letterhead, signature, and which sections
                        show up.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={customizeInvoice}
                      disabled={false}
                      onChange={setCustomizeInvoice}
                    />
                  </div>

                  {customizeInvoice && (
                    <div className="rounded-lg border border-accent/20 bg-accent/3 p-3 sm:p-5 space-y-6">
                      <div>
                        <h3 className="text-accent text-lg sm:text-xl font-medium">
                          Customize Invoice
                        </h3>
                        <p className="text-sm text-gray-500">
                          Changes here update the live preview.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">
                          Brand Colors
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white rounded-md border border-accent/20 p-3 flex items-center gap-3">
                            <label
                              htmlFor="editPrimaryColor"
                              className="relative shrink-0 w-11 h-11 rounded-full border-2 border-white shadow ring-1 ring-accent/20 overflow-hidden cursor-pointer"
                              style={{
                                backgroundColor:
                                  invoiceCustomSettings.primaryColor ??
                                  "#1f2937",
                              }}
                            >
                              <input
                                id="editPrimaryColor"
                                type="color"
                                value={
                                  invoiceCustomSettings.primaryColor ??
                                  "#1f2937"
                                }
                                onChange={(e) =>
                                  handleInvCustomization(
                                    "primaryColor",
                                    e.target.value,
                                  )
                                }
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </label>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-accent">
                                Primary Color
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                Headings, totals &amp; accents
                              </p>
                            </div>
                            {invoiceCustomSettings.primaryColor && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleInvCustomization("primaryColor", null)
                                }
                                className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                              >
                                Reset
                              </button>
                            )}
                          </div>

                          <div className="bg-white rounded-md border border-accent/20 p-3 flex items-center gap-3">
                            <label
                              htmlFor="editSecondaryColor"
                              className="relative shrink-0 w-11 h-11 rounded-full border-2 border-white shadow ring-1 ring-accent/20 overflow-hidden cursor-pointer"
                              style={{
                                backgroundColor:
                                  invoiceCustomSettings.secondaryColor ??
                                  "#ffffff",
                              }}
                            >
                              <input
                                id="editSecondaryColor"
                                type="color"
                                value={
                                  invoiceCustomSettings.secondaryColor ??
                                  "#ffffff"
                                }
                                onChange={(e) =>
                                  handleInvCustomization(
                                    "secondaryColor",
                                    e.target.value,
                                  )
                                }
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </label>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-accent">
                                Secondary Color
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                Invoice background
                              </p>
                            </div>
                            {invoiceCustomSettings.secondaryColor && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleInvCustomization("secondaryColor", null)
                                }
                                className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">
                          Images
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white rounded-md border border-accent/20 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <label className="text-sm font-medium text-accent">
                                Letterhead Image
                              </label>
                            </div>

                            {letterHeadSrc ? (
                              <div className="relative w-full h-20 rounded border border-accent/15 overflow-hidden bg-gray-50 mb-2">
                                <Image
                                  src={letterHeadSrc}
                                  alt="Letterhead preview"
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-20 rounded border border-dashed border-accent/25 flex items-center justify-center text-xs text-gray-400 mb-2">
                                No letterhead uploaded
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                className="block w-full text-xs text-gray-600
                    file:mr-2 file:py-1.5 file:px-3
                    file:rounded-md file:border-0
                    file:bg-accent file:text-white file:text-xs
                    file:cursor-pointer hover:file:opacity-90"
                                onChange={(e) =>
                                  handleInvCustomization(
                                    "letterHeadImg",
                                    e.target.files?.[0] || null,
                                  )
                                }
                              />
                              {invoiceCustomSettings.letterHeadImg && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInvCustomization(
                                      "letterHeadImg",
                                      null,
                                    )
                                  }
                                  className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="bg-white rounded-md border border-accent/20 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <label className="text-sm font-medium text-accent">
                                Signature Image
                              </label>
                            </div>

                            {signatureSrc ? (
                              <div className="relative w-full h-20 rounded border border-accent/15 overflow-hidden bg-gray-50 mb-2">
                                <Image
                                  src={signatureSrc}
                                  alt="Signature preview"
                                  fill
                                  unoptimized
                                  className="object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-20 rounded border border-dashed border-accent/25 flex items-center justify-center text-xs text-gray-400 mb-2">
                                No signature uploaded
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                className="block w-full text-xs text-gray-600
                    file:mr-2 file:py-1.5 file:px-3
                    file:rounded-md file:border-0
                    file:bg-accent file:text-white file:text-xs
                    file:cursor-pointer hover:file:opacity-90"
                                onChange={(e) =>
                                  handleInvCustomization(
                                    "signatureImg",
                                    e.target.files?.[0] || null,
                                  )
                                }
                              />
                              {invoiceCustomSettings.signatureImg && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInvCustomization("signatureImg", null)
                                  }
                                  className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">
                          Invoice Sections
                        </h4>
                        <div className="bg-white rounded-md border border-accent/20 divide-y divide-accent/10">
                          {SECTION_TOGGLES.map(
                            ({ key, label, description }) => (
                              <div
                                key={key}
                                className="flex items-center justify-between gap-3 px-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-accent">
                                    {label}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {description}
                                  </p>
                                </div>
                                <ToggleSwitch
                                  checked={Boolean(invoiceCustomSettings[key])}
                                  disabled={false}
                                  onChange={() => toggleInvCustomization(key)}
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end">
                    <div className="w-full sm:w-40">
                      <Button
                        type="submit"
                        loading={invoiceUpdatePending}
                        disabled={invoiceUpdatePending}
                        onClick={handleUpdateInvoice}
                        className="w-full"
                      >
                        Update Invoice
                      </Button>
                    </div>
                  </div>
                </div>

                {isPreview && (
                  <div
                    className="bg-bg-muted rounded-lg border-2 border-accent/30 p-3 sm:p-5 flex-1 min-w-0 lg:sticky lg:top-5 h-fit"
                    style={{
                      backgroundImage:
                        "radial-gradient(#77777760 1px, transparent 1px)",
                      backgroundSize: "18px 18px",
                    }}
                  >
                    <h3 className="text-accent text-xl sm:text-2xl font-medium my-4 sm:my-5">
                      Preview
                    </h3>

                    <div
                      className="rounded-lg border-2 border-accent/30"
                      style={{ backgroundColor: previewSecondary ?? "#ffffff" }}
                    >
                      {invoiceCustomSettings.showLetterHead &&
                        letterHeadSrc && (
                          <div className="relative w-full h-16 sm:h-36 overflow-hidden">
                            <Image
                              src={letterHeadSrc}
                              alt="Letterhead"
                              fill
                              unoptimized
                              className="object-fill"
                            />
                          </div>
                        )}

                      <div className="p-3 sm:p-3.5 space-y-4 sm:space-y-5 overflow-x-auto">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3
                              className="text-accent text-2xl sm:text-4xl font-medium"
                              style={accentTextStyle}
                            >
                              Invoice
                            </h3>
                            <p
                              className="text-sm sm:text-lg text-accent font-medium mt-1 wrap-break-word"
                              style={accentTextStyle}
                            >
                              Invoice Number:{" "}
                              <span className="uppercase text-gray-600 text-xs sm:text-md">
                                {form.invoiceNumber}
                              </span>
                            </p>
                          </div>
                          {invoiceCustomSettings.showLogo && (
                            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
                              {logoSrc ? (
                                <Image
                                  src={logoSrc}
                                  alt="Company Logo"
                                  width={80}
                                  height={80}
                                  unoptimized={
                                    companySnapshot.logo instanceof File
                                  }
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-gray-400 text-center px-1">
                                  No Logo
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-8 sm:gap-x-20 gap-y-3">
                          <div className="flex flex-col">
                            <p
                              className="text-sm sm:text-md text-accent font-medium"
                              style={accentTextStyle}
                            >
                              Issue Date:
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 ">
                              {form.issueDate || "No Date"}
                            </p>
                          </div>
                          <div className="flex flex-col">
                            <p
                              className="text-sm sm:text-md text-accent font-medium"
                              style={accentTextStyle}
                            >
                              Due Date:
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {form.dueDate || "No Date"}
                            </p>
                          </div>
                        </div>
                        <div className="w-full h-px bg-accent/20"></div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          {invoiceCustomSettings.showCompanySnapshot && (
                            <div className="flex flex-col min-w-0">
                              <p
                                className="text-sm sm:text-md text-accent font-medium"
                                style={accentTextStyle}
                              >
                                Billed By:
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                                Name:{" "}
                                {companySnapshot.name || "Name Not Provided"}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                                Email:{" "}
                                {companySnapshot.email || "Email Not Provided"}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                                Address:{" "}
                                {companySnapshot.address ||
                                  "Address Not Provided"}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <p
                              className="text-sm sm:text-md text-accent font-medium"
                              style={accentTextStyle}
                            >
                              Billed To:
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                              Name: {clientDetails?.name || "Name Not Provided"}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                              Email:{" "}
                              {clientDetails?.email || "Email Not Provided"}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                              Address:{" "}
                              {clientDetails?.address || "Address Not Provided"}
                            </p>
                          </div>
                        </div>
                        {invoiceCustomSettings.showItemTable && (
                          <>
                            <div className="w-full h-px bg-accent/20"></div>
                            <div className="min-w-120 sm:min-w-0">
                              <div
                                className="grid grid-cols-[1fr_50px_90px_90px] gap-x-4 sm:gap-x-10 text-xs font-medium text-bg-light bg-accent py-2 px-3 sm:px-7"
                                style={accentBgStyle}
                              >
                                <span>Item</span>
                                <span className="text-right">Qty</span>
                                <span className="text-right">Price</span>
                                <span className="text-right">Total</span>
                              </div>
                              <div className="space-y-1.5">
                                {items
                                  .filter((item) => item.itemName.trim() !== "")
                                  .map((item) => (
                                    <div
                                      key={item.id}
                                      className="grid grid-cols-[1fr_50px_90px_90px] gap-x-4 sm:gap-x-10 text-sm px-3 sm:px-7 mt-1"
                                    >
                                      <span className="truncate text-accent">
                                        {item.itemName}
                                      </span>
                                      <span className="text-right text-accent">
                                        {item.quantity}
                                      </span>
                                      <span className="text-right text-accent">
                                        {form.currency}{" "}
                                        {item.unitPrice.toLocaleString()}
                                      </span>
                                      <span className="text-right font-medium text-accent">
                                        {form.currency}{" "}
                                        {(
                                          item.quantity * item.unitPrice
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                {items.every(
                                  (item) => item.itemName.trim() === "",
                                ) && (
                                  <p className="text-sm text-gray-400 italic mt-1 px-3 sm:px-0">
                                    No items added yet
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        <div className="w-full h-px bg-accent/20"></div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Subtotal</span>
                            <span
                              className="text-gray-800"
                              style={accentTextStyle}
                            >
                              {form.currency} {totals.subtotal.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Discount</span>
                            <span className="text-red-500">
                              -{form.currency}{" "}
                              {totals.discountValue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-start sm:items-center justify-between text-sm gap-3">
                            <span className="text-gray-700">
                              Tax(VAT, GETFund, NHIL):
                              {summary?.vatPercentage +
                                summary?.getfundPercentage +
                                summary?.nhilPercentage}
                              %
                            </span>
                            <span
                              className="shrink-0 text-gray-800"
                              style={accentTextStyle}
                            >
                              {form.currency}{" "}
                              {totals.taxAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-base sm:text-lg mt-2">
                            <span
                              className="text-accent font-semibold"
                              style={accentTextStyle}
                            >
                              Total
                            </span>
                            <span
                              className="text-gray-800 font-bold"
                              style={accentTextStyle}
                            >
                              {form.currency}{" "}
                              {totals.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {((invoiceCustomSettings.showNotes && summary.notes) ||
                          (invoiceCustomSettings.showTerms &&
                            summary.terms)) && (
                          <>
                            <div className="w-full h-px bg-accent/20"></div>
                            {invoiceCustomSettings.showNotes &&
                              summary.notes && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">
                                    Notes
                                  </p>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap wrap-break-word">
                                    {summary.notes}
                                  </p>
                                </div>
                              )}
                            {invoiceCustomSettings.showTerms &&
                              summary.terms && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">
                                    Terms
                                  </p>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap wrap-break-word">
                                    {summary.terms}
                                  </p>
                                </div>
                              )}
                          </>
                        )}
                        {invoiceCustomSettings.showPaymentMethods &&
                          companySnapshot.paymentMethods.length > 0 && (
                            <>
                              <div className="w-full h-px bg-accent/20"></div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">
                                  Payment Method
                                  {companySnapshot.paymentMethods.length > 1
                                    ? "s"
                                    : ""}
                                </p>
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                                  {companySnapshot.paymentMethods.map(
                                    (method, index) => (
                                      <div
                                        key={index}
                                        className="text-sm text-gray-700 space-y-0.5 flex-1 min-w-0 sm:min-w-45 wrap-break-word"
                                      >
                                        <p
                                          className="font-medium text-accent"
                                          style={accentTextStyle}
                                        >
                                          {method.paymentType === "Bank"
                                            ? "Bank Transfer"
                                            : "Mobile Money"}
                                        </p>
                                        {method.paymentType === "Bank" ? (
                                          <>
                                            <p>Bank: {method.bankName}</p>
                                            <p>Branch: {method.bankBranch}</p>
                                            <p>
                                              Account Name: {method.accountName}
                                            </p>
                                            <p>
                                              Account Number:{" "}
                                              {method.accountNumber}
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <p>Network: {method.momoVendor}</p>
                                            <p>Name: {method.momoName}</p>
                                            <p>Wallet: {method.momoWallet}</p>
                                          </>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        {invoiceCustomSettings.showSignature &&
                          signatureSrc && (
                            <>
                              <div className="w-full h-px bg-accent/20"></div>
                              <div className="flex flex-col items-end">
                                <div className="relative w-32 h-14 sm:w-40 sm:h-16">
                                  <Image
                                    src={signatureSrc}
                                    alt="Signature"
                                    fill
                                    unoptimized
                                    className="object-contain object-right"
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Authorized Signature
                                </p>
                              </div>
                            </>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Drawer>
    </DashboardLayout>
  );
}
