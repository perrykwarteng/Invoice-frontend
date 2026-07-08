export type Organisation = {
  orgName: string;
  orgEmail: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  profilePic: imageUrls | null;
  role: "super_admin" | "org_admin" | "staff";
};

export type UserOrg = {
  user: User;
  org: Organisation;
};

export type LoginResponse = {
  data: {
    accessToken: string;
    organisation: Organisation;
    user: User;
  };
  message: string;
};

export type ClientType = {
  id?: number;
  name: string;
  email: string;
  address: string;
};
export type ClientResponseType = {
  id: number;
  name: string;
  email: string;
  address: string;
};

export type imageUrls = {
  imageUrl: string;
  public_id: string;
};

export type BankPaymentMethod = {
  paymentType: "Bank";
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankBranch: string;
  swiftCode: string;
};

export type MomoPaymentMethod = {
  paymentType: "Momo";
  momoWallet: string;
  momoName: string;
  momoVendor: string;
};

export type PaymentMethod = BankPaymentMethod | MomoPaymentMethod;

export type CompanySnapshot = {
  invoicePrefix: string;
  logo: imageUrls;
  name: string;
  email: string;
  address: string;
  paymentMethods?: PaymentMethod[];
};

export type Invoice = {
  id: number;
  organisationId: number;
  createdBy: number;
  clientId: number;

  invoiceNumber: string;
  currency: string;
  status: "saved" | "draft";

  issueDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;

  subtotal: string;
  discountValue: string;
  vatPercentage: string;
  nhilPercentage: string;
  getfundPercentage: string;
  taxAmount: string;
  totalAmount: string;

  terms: string;
  notes: string;

  companySnapshot: CompanySnapshot;
};

export interface SingleInvoice {
  id: number;
  organisationId: number;
  invoiceNumber: string;
  createdBy: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  discountValue: string;
  vatPercentage: string;
  nhilPercentage: string;
  getfundPercentage: string;
  status: "saved" | "draft";
  notes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;

  companySnapshot: CompanySnapshot;
  clientInfo: ClientType;
  items: InvoiceItems[];
}

export interface InvoiceItems {
  id: number;
  invoiceId?: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type OrgSettingsType = {
  defaultCurrency: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  paymentTermsDays: number;
  paymentMethod: [];
  vatRate: string;
  nhilRate: string;
  getfundRate: string;
  companyName: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  companyLogo: imageUrls;
  invoiceFooter: string | null;
  extras: Record<string, any> | null;
};
