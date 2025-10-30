import React, { useMemo } from 'react';
import { Order, SubOrder, OrderStatus, UserRole, Unit } from '../types';
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
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ data, currentUserRole, currentUserUnit, subOrderFinancials }) => {
    const summary = useMemo(() => {
        let totalRevenue = 0;
        const uniqueOrdersMap = new Map<string, boolean>();

        if (currentUserRole === UserRole.Unidad && currentUserUnit) {
            // For a Unit Director, sum the attributed revenue for their unit's sub-orders within the filtered data.
            const processedSubOrderIds = new Set<string>();
            data.forEach(item => {
                if (item.unit === currentUserUnit && !processedSubOrderIds.has(item.id)) {
                    totalRevenue += subOrderFinancials.paidPerSubOrder.get(item.id) || 0;
                    processedSubOrderIds.add(item.id);
                }
                // Still need to count unique orders for the "Total Orders" card
                if (!uniqueOrdersMap.has(item.orderId)) {
                    uniqueOrdersMap.set(item.orderId, true);
                }
            });
        } else {
            // For other roles, use the existing logic: sum the total paid amount of unique orders.
            const uniqueOrderPaidAmounts = new Map<string, number>();
            data.forEach(item => {
                if (!uniqueOrderPaidAmounts.has(item.orderId)) {
                    uniqueOrderPaidAmounts.set(item.orderId, item.paidAmount || 0);
                }
            });
            totalRevenue = Array.from(uniqueOrderPaidAmounts.values())
                .reduce((sum, amount) => sum + amount, 0);

            // Populate uniqueOrdersMap for the total orders count
            uniqueOrderPaidAmounts.forEach((_, orderId) => uniqueOrdersMap.set(orderId, true));
        }
        
        const totalOrders = uniqueOrdersMap.size;
        
        const pending = data.filter(d => d.status === OrderStatus.Pendiente).length;
        const invoiced = data.filter(d => d.status === OrderStatus.Facturado).length;

        return { totalRevenue, totalOrders, pending, invoiced };
    }, [data, currentUserRole, currentUserUnit, subOrderFinancials]);
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard title="Ingresos Totales (Cobrado)" value={formatCurrency(summary.totalRevenue)} icon={<CurrencyIcon />} />
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