"use client";

import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import Button from "@/components/ui/btn";
import CustomInput from "@/components/ui/Input";
import Select from "@/components/ui/select";
import ToggleSwitch from "@/components/ui/toggle";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatMoney } from "./formatMoney";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getClient } from "@/services/client";
import { ClientType, imageUrls, PaymentMethod } from "@/types/types";
import { toast } from "sonner";
import { createInvoice } from "@/services/invoice";
import { useRouter } from "next/navigation";
import { getSettings } from "@/services/settings";

export type InvoiceItem = {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
};

export const CURRENCIES = ["GHS", "USD", "EUR", "GBP"];

export const makeEmptyItem = (): InvoiceItem => ({
  id: crypto.randomUUID(),
  itemName: "",
  quantity: 1,
  unitPrice: 0,
});
const getLogoSrc = (logo: imageUrls | File | null): string | null => {
  if (!logo) return null;

  if (logo instanceof File) {
    return URL.createObjectURL(logo);
  }

  return logo.imageUrl;
};
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

type CompanySnapshot = {
  name: string;
  email: string;
  address: string;
  invoicePrefix: string;
  logo: File | imageUrls | null;
  paymentMethods: PaymentMethod[];
};

export default function AddInvoice() {
  const routes = useRouter();
  const { data: clientData } = useQuery({
    queryKey: ["Clients"],
    queryFn: getClient,
    staleTime: 0,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["OrgSettings"],
    queryFn: getSettings,
  });

  const [manualIvoNumber, setManualIvoNumber] = useState(true);

  const invoicePrefix = settingsData?.invoicePrefix;
  const invoiceNextInvNumber = settingsData?.nextInvoiceNumber;

  const invoiceNumber = `${invoicePrefix ?? ""}${String(
    invoiceNextInvNumber ?? 0,
  ).padStart(4, "0")}`;

  const [isPreview, setIsPreview] = useState(false);

  const [form, setForm] = useState({
    invoiceNumber: invoiceNumber || "",
    clientId: 0,
    issueDate: "",
    dueDate: "",
    currency: "GHS",
  });

  useEffect(() => {
    if (manualIvoNumber) {
      setForm((prev) => ({ ...prev, invoiceNumber }));
    }
  }, [invoicePrefix, invoiceNextInvNumber, manualIvoNumber]);

  const [companySnapshot, setCompanySnapshot] = useState<CompanySnapshot>({
    name: "",
    email: "",
    address: "",
    invoicePrefix: "",
    logo: null,
    paymentMethods: [],
  });

  useEffect(() => {
    if (!settingsData) return;

    setCompanySnapshot((prev) => ({
      ...prev,
      name: settingsData.companyName ?? "",
      email: settingsData.companyEmail ?? "",
      address: settingsData.companyAddress ?? "",
      logo: settingsData.companyLogo ?? null,
    }));
  }, [settingsData]);

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

  const [client, setClient] = useState("");
  const [clientDetails, setClientDetails] = useState<ClientType>();

  const [items, setItems] = useState<InvoiceItem[]>([makeEmptyItem()]);

  const [summary, setSummary] = useState({
    discountValue: 0,
    vatPercentage: 0,
    nhilPercentage: 0,
    getfundPercentage: 0,
    notes: "",
    terms:
      "Payment of Service should be made in Cash / Cheque / Bank Deposit Transfer:",
  });

  const clientList = useMemo(
    () => clientData?.map(({ name }) => name) ?? [],
    [clientData],
  );

  useEffect(() => {
    const selectedClient = clientData?.find(
      (clientItem) => clientItem.name === client,
    );

    if (!selectedClient) return;

    setForm((prev) => ({ ...prev, clientId: selectedClient.id }));

    setClientDetails({
      name: selectedClient.name,
      email: selectedClient.email,
      address: selectedClient.address,
    });
  }, [client, clientData]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSummaryChange = (key: string, value: string) => {
    setSummary((prev) => ({
      ...prev,
      [key]: key === "notes" || key === "terms" ? value : Number(value),
    }));
  };

  const handleItemChange = (
    id: string,
    field: keyof Omit<InvoiceItem, "id">,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "itemName" ? value : Math.max(0, Number(value)),
            }
          : item,
      ),
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, makeEmptyItem()]);
  };

  const removeItem = (id: string) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.id !== id),
    );
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

  const resetForm = () => {
    setForm({
      invoiceNumber: "",
      clientId: 0,
      issueDate: "",
      dueDate: "",
      currency: "GHS",
    });
    setCompanySnapshot({
      name: "",
      email: "",
      address: "",
      invoicePrefix: "",
      logo: null,
      paymentMethods: [],
    });
    setClientDetails({
      name: "",
      email: "",
      address: "",
    });
    setSummary({
      discountValue: 0,
      vatPercentage: 0,
      nhilPercentage: 0,
      getfundPercentage: 0,
      notes: "",
      terms: "",
    });
    setItems([makeEmptyItem()]);
  };

  const { mutate: createInvoicesMutate, isPending: invoicePending } =
    useMutation({
      mutationKey: ["InvoiceCreate"],
      mutationFn: createInvoice,
      onSuccess: (data) => {
        toast.success(data.message);
        routes.push("/invoices");
        resetForm();
      },
      onError: (data: any) => {
        toast.error(data.message);
      },
    });

  const invoiceFormBuilder = (status: string) => {
    const formData = new FormData();

    formData.append("status", status);
    formData.append("invoiceNumber", String(form.invoiceNumber));

    if (form.clientId) {
      formData.append("clientId", String(form.clientId));
    }

    if (companySnapshot.logo instanceof File) {
      formData.append("companyLogo", companySnapshot.logo);
    }

    formData.append("currency", String(form.currency));
    formData.append("issueDate", String(form.issueDate));
    formData.append("dueDate", String(form.dueDate));

    formData.append("subtotal", String(totals.subtotal));
    formData.append("discountValue", String(totals.discountValue));
    formData.append("vatPercentage", String(summary.vatPercentage));
    formData.append("nhilPercentage", String(summary.nhilPercentage));
    formData.append("getfundPercentage", String(summary.getfundPercentage));
    formData.append("taxAmount", String(totals.taxAmount));
    formData.append("totalAmount", String(totals.totalAmount));

    formData.append("notes", String(summary.notes));
    formData.append("terms", String(summary.terms));

    formData.append("companySnapshot", JSON.stringify(companySnapshot));

    formData.append("invoiceItem", JSON.stringify(items));

    return formData;
  };

  const handelCreateInvoice = (status: "saved" | "draft") => {
    if (!form.clientId) {
      toast.error("Please select a client");
      return;
    }

    createInvoicesMutate(invoiceFormBuilder(status));
  };

  const logoSrc = getLogoSrc(companySnapshot.logo);

  return (
    <DashboardLayout>
      <div className="min-h-full px-3 sm:px-0">
        <Link
          href="/invoices"
          className="text-accent hover:underline transition-all duration-150 text-sm sm:text-base"
        >
          Back to Invoices
        </Link>

        <div className="mt-5">
          <DashboardHeader title="New Invoice">
            <div className="flex sm:flex-row items-stretch sm:items-center gap-3 sm:gap-x-4 w-full sm:w-auto  mt-2 md:mt-0">
              <div className="flex-1 flex items-center justify-between sm:justify-start gap-x-2">
                <p className="text-sm sm:text-md text-accent font-medium">
                  Show Preview
                </p>
                <ToggleSwitch
                  checked={isPreview}
                  disabled={false}
                  onChange={setIsPreview}
                />
              </div>
              <div className="w-full sm:w-auto flex-1">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => handelCreateInvoice("draft")}
                >
                  Save as Draft
                </Button>
              </div>
            </div>
          </DashboardHeader>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-5 mt-5">
          <div className="bg-white rounded-lg border-2 border-accent/30 p-3 sm:p-5 flex-1 w-full min-w-0 space-y-5 sm:space-y-6">
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
                    disabled={manualIvoNumber}
                    placeholder="INV00123"
                    id="invoiceNumber"
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
              <div className="flex items-center gap-x-3 mt-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary cursor-pointer shrink-0"
                  id="manualInvNumber"
                  onChange={() => setManualIvoNumber(!manualIvoNumber)}
                />
                <label
                  htmlFor="manualInvNumber"
                  className="text-sm sm:text-base text-accent"
                >
                  Set Custom Invoice Number
                </label>
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

                    <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-accent/30 overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                        {logoSrc ? (
                          <Image
                            src={logoSrc}
                            alt="Company Logo"
                            width={80}
                            height={80}
                            unoptimized={
                              typeof companySnapshot.logo !== "string"
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 text-center px-1">
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
                        className="block w-full text-xs sm:text-sm text-gray-600
            file:mr-3 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4
            file:rounded-md file:border-0
            file:bg-accent file:text-white file:text-xs sm:file:text-sm
            file:cursor-pointer hover:file:opacity-90"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-x-3">
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
              <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 mb-4">
                <h3 className="text-accent text-xl sm:text-2xl font-medium">
                  Invoice Items
                </h3>
                <div className="w-full flex justify-end">
                  <div className="w-full md:w-35">
                    <Button
                      variant="outline"
                      className="group w-full xs:w-auto"
                      leftIcon={
                        <Plus className="w-4 h-4 transition-transform duration-150 group-hover:rotate-90" />
                      }
                      onClick={addItem}
                    >
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>

              <div className="hidden md:grid grid-cols-[1fr_100px_140px_140px_40px] gap-x-3 px-1 pb-2 text-sm font-medium text-gray-500">
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
                      className="grid grid-cols-1 md:grid-cols-[1fr_100px_140px_140px_40px] gap-3 items-start md:items-center border border-accent/15 rounded-md p-3 md:border-0 md:p-0"
                    >
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 mb-1">
                          Item Name
                        </label>
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
                      </div>

                      <div className="grid grid-cols-2 md:contents gap-3">
                        <div>
                          <label className="block md:hidden text-xs font-medium text-gray-500 mb-1">
                            Qty
                          </label>
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
                        </div>

                        <div>
                          <label className="block md:hidden text-xs font-medium text-gray-500 mb-1">
                            Unit Price
                          </label>
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
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:block">
                        <div>
                          <span className="md:hidden text-xs font-medium text-gray-500 mr-2">
                            Total:
                          </span>
                          <span className="text-accent font-medium px-0 md:px-1">
                            {formatMoney(lineTotal, form.currency)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full h-0.5 bg-accent/30"></div>

            <div className="flex flex-col md:flex-row gap-5 sm:gap-6">
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

                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-x-3">
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
                      handleSummaryChange("nhilPercentage", e.target.value)
                    }
                  />
                  <CustomInput
                    label="GETFund %"
                    type="number"
                    id="getfundPercentage"
                    value={summary.getfundPercentage}
                    onChange={(e: any) =>
                      handleSummaryChange("getfundPercentage", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex-1 bg-accent/5 rounded-lg p-4 space-y-2 h-fit">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-accent">
                    {formatMoney(totals.subtotal, form.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-red-500">
                    -{formatMoney(totals.discountValue, form.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    VAT ({summary.vatPercentage || 0}%)
                  </span>
                  <span className="font-medium text-accent">
                    {formatMoney(totals.vatAmount, form.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    NHIL ({summary.nhilPercentage || 0}%)
                  </span>
                  <span className="font-medium text-accent">
                    {formatMoney(totals.nhilAmount, form.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    GETFund ({summary.getfundPercentage || 0}%)
                  </span>
                  <span className="font-medium text-accent">
                    {formatMoney(totals.getfundAmount, form.currency)}
                  </span>
                </div>
                <div className="w-full h-px bg-accent/20 my-1"></div>
                <div className="flex items-center justify-between text-base sm:text-lg">
                  <span className="text-accent font-semibold">Total</span>
                  <span className="text-accent font-bold">
                    {formatMoney(totals.totalAmount, form.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full h-0.5 bg-accent/30"></div>

            {settingsData?.paymentMethod &&
              settingsData.paymentMethod.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-accent text-xl sm:text-2xl font-medium mb-3">
                    Payment Method
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(settingsData.paymentMethod as PaymentMethod[]).map(
                      (method, index) => {
                        const isSelected = companySnapshot.paymentMethods.some(
                          (m) => isSamePaymentMethod(m, method),
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
                                onChange={() => togglePaymentMethod(method)}
                                className="w-4 h-4 accent-primary cursor-pointer shrink-0"
                              />
                              <p className="font-medium text-accent text-sm sm:text-base">
                                {method.paymentType === "Bank"
                                  ? "Bank Transfer"
                                  : "Mobile Money"}
                              </p>
                            </div>

                            {method.paymentType === "Bank" ? (
                              <div className="mt-2 text-xs sm:text-sm text-gray-600 space-y-0.5 wrap-break-word">
                                <p>Bank: {method.bankName}</p>
                                <p>Branch: {method.bankBranch}</p>
                                <p>Account Name: {method.accountName}</p>
                                <p>Account Number: {method.accountNumber}</p>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs sm:text-sm text-gray-600 space-y-0.5 wrap-break-word">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-accent">
                  Notes
                </label>
                <textarea
                  className="w-full rounded-md border border-accent/30 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-25 text-accent"
                  placeholder="Thank you for your business..."
                  value={summary.notes}
                  maxLength={1000}
                  onChange={(e) => handleSummaryChange("notes", e.target.value)}
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
                  onChange={(e) => handleSummaryChange("terms", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="w-full sm:w-40">
                <Button
                  type="submit"
                  loading={invoicePending}
                  disabled={invoicePending}
                  className="w-full"
                  onClick={() => handelCreateInvoice("saved")}
                >
                  Create Invoice
                </Button>
              </div>
            </div>
          </div>

          {isPreview && (
            <div
              className="bg-bg-muted rounded-lg border-2 border-accent/30 p-3 sm:p-5 flex-1 w-full min-w-0 md:sticky md:top-5"
              style={{
                backgroundImage:
                  "radial-gradient(#77777760 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            >
              <h3 className="text-accent text-xl sm:text-2xl font-medium my-4 sm:my-5">
                Preview
              </h3>

              <div className="bg-white rounded-lg border-2 border-accent/30 p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-x-auto">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-accent text-2xl sm:text-4xl font-medium">
                      Invoice
                    </h3>
                    <p className="text-sm sm:text-lg text-accent font-medium mt-1 wrap-break-word">
                      Invoice Number:{" "}
                      <span className="uppercase text-gray-600 text-xs sm:text-md">
                        {form.invoiceNumber}
                      </span>
                    </p>
                  </div>
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {logoSrc ? (
                      <Image
                        src={logoSrc}
                        alt="Company Logo"
                        width={80}
                        height={80}
                        unoptimized={typeof companySnapshot.logo !== "string"}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 text-center px-1">
                        No Logo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-8 sm:gap-x-20 gap-y-3">
                  <div className="flex flex-col">
                    <p className="text-sm sm:text-md text-accent font-medium">
                      Issue Date:
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 ">
                      {form.issueDate || "No Date"}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm sm:text-md text-accent font-medium">
                      Due Date:
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {form.dueDate || "No Date"}
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-accent/20"></div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm sm:text-md text-accent font-medium">
                      Billed By:
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                      Name: {companySnapshot.name || "Name Not Provided"}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                      Email: {companySnapshot.email || "Email Not Provided"}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                      Address:{" "}
                      {companySnapshot.address || "Address Not Provided"}
                    </p>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm sm:text-md text-accent font-medium">
                      Billed To:
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                      Name: {clientDetails?.name || "Name Not Provided"}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                      Email: {clientDetails?.email || "Email Not Provided"}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                      Address:{" "}
                      {clientDetails?.address || "Address Not Provided"}
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-accent/20"></div>

                <div className="min-w-120 sm:min-w-0">
                  <div className="grid grid-cols-[1fr_50px_90px_90px] gap-x-4 sm:gap-x-10 text-xs font-medium text-bg-light bg-accent py-2 px-3 sm:px-7">
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
                          <span className="truncate text-accent">{item.itemName}</span>
                          <span className="text-right text-accent">{item.quantity}</span>
                          <span className="text-right text-accent">
                            {formatMoney(item.unitPrice, form.currency)}
                          </span>
                          <span className="text-right font-medium text-accent">
                            {formatMoney(
                              item.quantity * item.unitPrice,
                              form.currency,
                            )}
                          </span>
                        </div>
                      ))}
                    {items.every((item) => item.itemName.trim() === "") && (
                      <p className="text-sm text-gray-400 italic mt-1 px-3 sm:px-0">
                        No items added yet
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-full h-px bg-accent/20"></div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-accent">{formatMoney(totals.subtotal, form.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-500">
                      -{formatMoney(totals.discountValue, form.currency)}
                    </span>
                  </div>
                  <div className="flex items-start sm:items-center justify-between text-sm gap-3">
                    <span className="text-gray-600">
                      Tax(VAT, GETFund, NHIL):
                      {summary?.vatPercentage +
                        summary?.getfundPercentage +
                        summary?.nhilPercentage}
                      %
                    </span>
                    <span className="shrink-0 text-accent">
                      {formatMoney(totals.taxAmount, form.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-base sm:text-lg mt-2">
                    <span className="text-accent font-semibold">Total</span>
                    <span className="text-accent font-bold">
                      {formatMoney(totals.totalAmount, form.currency)}
                    </span>
                  </div>
                </div>

                {(summary.notes || summary.terms) && (
                  <>
                    <div className="w-full h-px bg-accent/20"></div>
                    {summary.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Notes
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word">
                          {summary.notes}
                        </p>
                      </div>
                    )}
                    {summary.terms && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Terms
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word">
                          {summary.terms}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {companySnapshot.paymentMethods.length > 0 && (
                  <>
                    <div className="w-full h-px bg-accent/20"></div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Payment Method
                        {companySnapshot.paymentMethods.length > 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                        {companySnapshot.paymentMethods.map((method, index) => (
                          <div
                            key={index}
                            className="text-sm text-gray-700 space-y-0.5 flex-1 min-w-0 sm:min-w-45 wrap-break-word"
                          >
                            <p className="font-medium text-accent">
                              {method.paymentType === "Bank"
                                ? "Bank Transfer"
                                : "Mobile Money"}
                            </p>
                            {method.paymentType === "Bank" ? (
                              <>
                                <p>Bank: {method.bankName}</p>
                                <p>Branch: {method.bankBranch}</p>
                                <p>Account Name: {method.accountName}</p>
                                <p>Account Number: {method.accountNumber}</p>
                              </>
                            ) : (
                              <>
                                <p>Network: {method.momoVendor}</p>
                                <p>Name: {method.momoName}</p>
                                <p>Wallet: {method.momoWallet}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
