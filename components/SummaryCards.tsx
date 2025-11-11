import React, { useMemo } from 'react';
import { Order, SubOrder, OrderStatus, UserRole, Unit, FinancialMovement, TaxType } from '../types';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ClockIcon } from './icons/ClockIcon';

interface FullOrderData extends Order, SubOrder {}

interface SummaryCardsProps {
    data: FullOrderData[];
    currentUserRole: UserRole;
    currentUserUnit: Unit | null;
    subOrderFinancials: { paidPerSubOrder: Map<string, number> };
    financialMovements: FinancialMovement[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ data, currentUserRole, currentUserUnit, subOrderFinancials, financialMovements }) => {
    const summary = useMemo(() => {
        let ventaRealCobradaNeta = 0;
        let ventaRealFacturadaNeta = 0;

        if ((currentUserRole === UserRole.Unidad || currentUserRole === UserRole.Finanzas || currentUserRole === UserRole.Gerencia) && currentUserUnit) {
            // Group all sub-orders in the current view by their parent order ID
            const orderIdToSubOrdersMap = new Map<string, FullOrderData[]>();
            data.forEach(item => {
                if (!orderIdToSubOrdersMap.has(item.orderId)) {
                    orderIdToSubOrdersMap.set(item.orderId, []);
                }
                orderIdToSubOrdersMap.get(item.orderId)!.push(item);
            });

            // Get the sub-order IDs that belong to the current unit director
            const unitSubOrdersInView = data.filter(item => item.unit === currentUserUnit);
            const unitSubOrderIds = new Set(unitSubOrdersInView.map(so => so.id));

            // Iterate through every financial movement to attribute it correctly
            financialMovements.forEach(fm => {
                let proportion = 0;
                let isRelevant = false;

                // Case 1: Movement is directly tied to a sub-order of the current unit.
                if (fm.subOrderId && unitSubOrderIds.has(fm.subOrderId)) {
                    proportion = 1;
                    isRelevant = true;
                }
                // Case 2: Movement is global and belongs to an order where the current unit has tasks.
                else if (fm.orderId && !fm.subOrderId) {
                    const allSubOrdersForThisOrder = orderIdToSubOrdersMap.get(fm.orderId);
                    if (allSubOrdersForThisOrder) {
                        const unitSubOrdersInThisOrder = allSubOrdersForThisOrder.filter(so => so.unit === currentUserUnit);
                        // Check if the current unit has any involvement in this order
                        if (unitSubOrdersInThisOrder.length > 0) {
                            const totalAmountForAllSubOrders = allSubOrdersForThisOrder.reduce((sum, so) => sum + (so.amount || 0), 0);
                            if (totalAmountForAllSubOrders > 0) {
                                const totalAmountForUnitSubOrders = unitSubOrdersInThisOrder.reduce((sum, so) => sum + (so.amount || 0), 0);
                                proportion = totalAmountForUnitSubOrders / totalAmountForAllSubOrders;
                                isRelevant = true;
                            }
                        }
                    }
                }
                
                // If the movement is relevant, calculate its net value and add it to the totals
                if (isRelevant && proportion > 0) {
                    const attributedInvoiceAmount = (fm.invoiceAmount || 0) * proportion;
                    const attributedPaidAmount = (fm.paidAmount || 0) * proportion;

                    let netInvoice = attributedInvoiceAmount;
                    if (fm.taxType === TaxType.IVA) {
                        netInvoice = attributedInvoiceAmount / 1.12;
                    } else if (fm.taxType === TaxType.IVA_TIMBRE) {
                        netInvoice = attributedInvoiceAmount / 1.125;
                    }
                    ventaRealFacturadaNeta += netInvoice;
                    
                    let netPaid = attributedPaidAmount;
                    if (fm.taxType === TaxType.IVA) {
                        netPaid = attributedPaidAmount / 1.12;
                    } else if (fm.taxType === TaxType.IVA_TIMBRE) {
                        netPaid = attributedPaidAmount / 1.125;
                    }
                    ventaRealCobradaNeta += netPaid;
                }
            });
        }
        
        // Operational calculations remain the same, based on the filtered data
        const totalOrders = new Set(data.map(d => d.orderId)).size;
        const pending = data.filter(d => d.status === OrderStatus.Pendiente).length;
        const invoiced = data.filter(d => d.status === OrderStatus.Facturado).length;

        return { ventaRealCobradaNeta, ventaRealFacturadaNeta, totalOrders, pending, invoiced };
    }, [data, currentUserRole, currentUserUnit, financialMovements]);
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <SummaryCard title="Venta Real Cobrada (Neto)" value={formatCurrency(summary.ventaRealCobradaNeta)} icon={<CurrencyIcon />} />
            <SummaryCard title="Venta Real Facturada (Neto)" value={formatCurrency(summary.ventaRealFacturadaNeta)} icon={<DocumentIcon />} />
            <SummaryCard title="Órdenes Totales" value={summary.totalOrders.toString()} icon={<BriefcaseIcon />} />
            <SummaryCard title="Sub-órdenes Facturadas" value={summary.invoiced.toString()} icon={<DocumentIcon />} />
            <SummaryCard title="Sub-órdenes Pendientes" value={summary.pending.toString()} icon={<ClockIcon />} />
        </div>
    );
};

interface SummaryCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center space-x-4">
            <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full text-brand-primary">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

export default SummaryCards;