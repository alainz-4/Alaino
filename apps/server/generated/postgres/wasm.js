
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserProfileScalarFieldEnum = {
  id: 'id',
  profilePreset: 'profilePreset',
  fullName: 'fullName',
  legalStatus: 'legalStatus',
  siren: 'siren',
  siret: 'siret',
  commercialRegisterNumber: 'commercialRegisterNumber',
  taxId: 'taxId',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  postalCode: 'postalCode',
  city: 'city',
  country: 'country',
  email: 'email',
  phone: 'phone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FreelanceSettingsScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  defaultDailyRate: 'defaultDailyRate',
  standardWorkingDays: 'standardWorkingDays',
  timezone: 'timezone',
  defaultCurrency: 'defaultCurrency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FinanceSettingsScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  monthlyEssentialExpenses: 'monthlyEssentialExpenses',
  monthlyWants: 'monthlyWants',
  emergencyFundMonths: 'emergencyFundMonths',
  currentReserves: 'currentReserves',
  savingsGoalMonthly: 'savingsGoalMonthly',
  needsPercent: 'needsPercent',
  wantsPercent: 'wantsPercent',
  savingsPercent: 'savingsPercent',
  monthlyLifestyleTarget: 'monthlyLifestyleTarget',
  urssafReservePercent: 'urssafReservePercent',
  incomeTaxReservePercent: 'incomeTaxReservePercent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceSettingsScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  invoicePrefix: 'invoicePrefix',
  lastInvoiceSequence: 'lastInvoiceSequence',
  defaultCurrency: 'defaultCurrency',
  defaultPaymentTermsDays: 'defaultPaymentTermsDays',
  latePaymentRate: 'latePaymentRate',
  recoveryChargeAmount: 'recoveryChargeAmount',
  vatMode: 'vatMode',
  vatRate: 'vatRate',
  vatExemptionMention: 'vatExemptionMention',
  logoUrl: 'logoUrl',
  signatureUrl: 'signatureUrl',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  bankDetails: 'bankDetails',
  termsAndConditions: 'termsAndConditions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GoogleDriveConnectionScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  clientId: 'clientId',
  clientSecret: 'clientSecret',
  folderId: 'folderId',
  refreshToken: 'refreshToken',
  connectedEmail: 'connectedEmail',
  connectedAt: 'connectedAt',
  oauthState: 'oauthState',
  oauthStateExpiresAt: 'oauthStateExpiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  name: 'name',
  legalName: 'legalName',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  postalCode: 'postalCode',
  city: 'city',
  country: 'country',
  vatNumber: 'vatNumber',
  email: 'email',
  contactName: 'contactName',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContractScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  clientId: 'clientId',
  title: 'title',
  paymentType: 'paymentType',
  startDate: 'startDate',
  endDate: 'endDate',
  dailyRate: 'dailyRate',
  monthlyRetainerAmount: 'monthlyRetainerAmount',
  fixedProjectAmount: 'fixedProjectAmount',
  fixedProjectDate: 'fixedProjectDate',
  billingDayOfMonth: 'billingDayOfMonth',
  active: 'active',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkDayScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  clientId: 'clientId',
  contractId: 'contractId',
  invoiceId: 'invoiceId',
  workDate: 'workDate',
  status: 'status',
  dailyRate: 'dailyRate',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  title: 'title',
  category: 'category',
  amount: 'amount',
  dueDate: 'dueDate',
  recurrence: 'recurrence',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssistantConversationScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  title: 'title',
  isPinned: 'isPinned',
  isArchived: 'isArchived',
  memorySummary: 'memorySummary',
  lastMessageAt: 'lastMessageAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssistantMessageScalarFieldEnum = {
  id: 'id',
  assistantConversationId: 'assistantConversationId',
  role: 'role',
  content: 'content',
  actionPlanJson: 'actionPlanJson',
  usedAi: 'usedAi',
  createdAt: 'createdAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  clientId: 'clientId',
  contractId: 'contractId',
  invoiceSeries: 'invoiceSeries',
  invoiceNumber: 'invoiceNumber',
  sequenceNumber: 'sequenceNumber',
  issueDate: 'issueDate',
  servicePeriodStart: 'servicePeriodStart',
  servicePeriodEnd: 'servicePeriodEnd',
  subtotal: 'subtotal',
  vatMode: 'vatMode',
  vatRate: 'vatRate',
  vatAmount: 'vatAmount',
  total: 'total',
  currency: 'currency',
  status: 'status',
  paymentTermsDays: 'paymentTermsDays',
  latePaymentRate: 'latePaymentRate',
  recoveryChargeAmount: 'recoveryChargeAmount',
  vatExemptionMention: 'vatExemptionMention',
  issuerName: 'issuerName',
  issuerLegalStatus: 'issuerLegalStatus',
  issuerSiren: 'issuerSiren',
  issuerSiret: 'issuerSiret',
  issuerCommercialRegisterNumber: 'issuerCommercialRegisterNumber',
  issuerTaxId: 'issuerTaxId',
  issuerAddressLine1: 'issuerAddressLine1',
  issuerAddressLine2: 'issuerAddressLine2',
  issuerPostalCode: 'issuerPostalCode',
  issuerCity: 'issuerCity',
  issuerCountry: 'issuerCountry',
  clientName: 'clientName',
  clientLegalName: 'clientLegalName',
  clientAddressLine1: 'clientAddressLine1',
  clientAddressLine2: 'clientAddressLine2',
  clientPostalCode: 'clientPostalCode',
  clientCity: 'clientCity',
  clientCountry: 'clientCountry',
  clientVatNumber: 'clientVatNumber',
  notes: 'notes',
  paidAt: 'paidAt',
  dueDate: 'dueDate',
  pdfPath: 'pdfPath',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentLogScalarFieldEnum = {
  id: 'id',
  userProfileId: 'userProfileId',
  invoiceId: 'invoiceId',
  clientId: 'clientId',
  kind: 'kind',
  title: 'title',
  amount: 'amount',
  currency: 'currency',
  receivedAt: 'receivedAt',
  method: 'method',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceLineScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  description: 'description',
  quantityDays: 'quantityDays',
  unitPrice: 'unitPrice',
  total: 'total',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  UserProfile: 'UserProfile',
  FreelanceSettings: 'FreelanceSettings',
  FinanceSettings: 'FinanceSettings',
  InvoiceSettings: 'InvoiceSettings',
  GoogleDriveConnection: 'GoogleDriveConnection',
  Client: 'Client',
  Contract: 'Contract',
  WorkDay: 'WorkDay',
  Expense: 'Expense',
  AssistantConversation: 'AssistantConversation',
  AssistantMessage: 'AssistantMessage',
  Invoice: 'Invoice',
  PaymentLog: 'PaymentLog',
  InvoiceLine: 'InvoiceLine'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
