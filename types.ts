// types.ts
export enum Unit {
  SuperImpresiones = "Super Impresiones",
  PublicidadMovimiento = "Publicidad y Movimiento",
  Publiest = "Publiest",
  CNPAgencia = "CNP La Agencia",
  Dmetal = "Dmetal",
  PautaPuntual = "Pauta Puntual",
  FabricaVendedores = "Fabrica de Vendedores",
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

export interface SubOrder {
  id: string;
  orderId: string;
  subOrderNumber: string;
  unit: Unit;
  workType: string;
  description: string;
  amount?: number;
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
}