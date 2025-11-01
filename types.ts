// types.ts
export enum Unit {
  SuperImpresiones = "Super Impresiones",
  PublicidadMovimiento = "Publicidad en Movimiento",
  Publiest = "Publiest",
  CNPAgencia = "CNP Lagencia",
  Dmetal = "D'Metal",
  PautaPuntual = "Pauta Puntual",
  FabricaVendedores = "Fábrica de vendedores",
  SIPaseoLasAmericas = "SI Paseo Las Américas",
  Proveedores = "Proveedores",
}

export enum PaymentMethod {
  Credito = "Crédito",
  Anticipo = "Anticipo",
  Contado = "Contado",
}

export enum OrderStatus {
  Pendiente = "Pendiente",
  Facturado = "Facturado",
  Cobrado = "Cobrado",
}

export enum UserRole {
    Comercial = "Director Comercial",
    Unidad = "Director de Unidad",
    Finanzas = "Finanzas",
    Gerencia = "Gerencia",
}

export interface FinancialMovement {
  id: string;
  subOrderId?: string; // Can be linked to a sub-order
  orderId?: string; // Or directly to an order
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  paymentDate?: string;
  paidAmount?: number;
  creationDate: string;
}

export interface SubOrder {
  id: string;
  orderId: string;
  subOrderNumber: string;
  unit: Unit;
  workType: string;
  description: string;
  amount?: number;
  budgetedAmount?: number;
  observations?: string;
  status: OrderStatus;
  // FIX: Make creationDate required to match Order interface and avoid type conflicts.
  creationDate: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  client: string;
  description: string;
  workType: string;
  creationDate: string;
  quotedAmount?: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  invoiceTotalAmount?: number;
  paidAmount?: number; // New field for paid amount
  executive?: string; // New field for the executive in charge
  director?: string; // New field for the director in charge
  billingType?: 'perTask' | 'global';
  financialObservations?: string;
}