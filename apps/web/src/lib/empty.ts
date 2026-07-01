export const emptyClient = {
  name: "",
  legalName: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France",
  vatNumber: "",
  email: "",
  contactName: "",
  notes: ""
};

import type { ContractDTO } from "../types";
import type { ExpenseDTO } from "../types";

export const emptyContract: Omit<ContractDTO, "id" | "client"> = {
  clientId: "",
  title: "",
  paymentType: "DAILY",
  startDate: "",
  endDate: "",
  dailyRate: 0,
  monthlyRetainerAmount: 0,
  fixedProjectAmount: 0,
  fixedProjectDate: "",
  billingDayOfMonth: 1,
  active: true,
  notes: ""
};

export const emptyExpense: Omit<ExpenseDTO, "id"> = {
  title: "",
  category: "General",
  amount: 0,
  dueDate: "",
  recurrence: "ONE_TIME",
  status: "PLANNED",
  notes: ""
};
