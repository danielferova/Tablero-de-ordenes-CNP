import React, { useState, useMemo, useEffect } from 'react';
import { Order, SubOrder, Unit, UserRole, OrderStatus } from '../types';
import OrderTable from './OrderTable';
import FilterControls from './FilterControls';
import SummaryCards from './SummaryCards';

interface FullOrderData extends Order, SubOrder {}

interface DashboardProps {
    data: FullOrderData[];
    onEdit: (subOrderId: string, orderId: string) => void;
    currentUserRole: UserRole;
    currentUserUnit: Unit | null;
    currentUserDirectorName: string | null;
    onAddSubOrder: (order: Order) => void;
    onFilteredDataChange: (data: FullOrderData[]) => void;
    onNotifyPayment: (order: Order) => void;
    subOrderFinancials: { paidPerSubOrder: Map<string, number> };
    directors: string[];
    executives: string[];
    onAdjustBudget: (order: Order) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onEdit, currentUserRole, currentUserUnit, currentUserDirectorName, onAddSubOrder, onFilteredDataChange, onNotifyPayment, subOrderFinancials, directors, executives, onAdjustBudget }) => {
    const [filters, setFilters] = useState<{
        unit: Unit[];
        status: string;
        overallStatus: string;
        client: string;
        orderNumber: string;
        invoiceNumber: string;
        dateRange: { start: string; end: string };
        director: string;
        executive: string;
    }>({
        unit: [],
        status: 'all',
        overallStatus: 'all',
        client: '',
        orderNumber: '',
        invoiceNumber: '',
        dateRange: { start: '', end: '' },
        director: 'all',
        executive: 'all',
    });

    const filteredData = useMemo(() => {
        // Step 1: Establish the base dataset. Filter by role first.
        let baseData = data;
        if (currentUserRole === UserRole.Unidad && currentUserUnit) {
            // A Unit Director sees all sub-orders for any order they are involved in.
            const relevantOrderIds = new Set(
                data.filter(item => item.unit === currentUserUnit).map(item => item.orderId)
            );
            baseData = data.filter(item => relevantOrderIds.has(item.orderId));
        } else if (currentUserRole === UserRole.Comercial && currentUserDirectorName) {
            // A Commercial Director only sees orders assigned to them.
            baseData = data.filter(item => item.director === currentUserDirectorName);
        }

        // Pre-calculate overall status for each order within the base dataset
        const ordersWithSubOrders = new Map<string, SubOrder[]>();
        baseData.forEach(item => {
            if (!ordersWithSubOrders.has(item.orderId)) {
                ordersWithSubOrders.set(item.orderId, []);
            }
            ordersWithSubOrders.get(item.orderId)!.push(item);
        });

        const overallStatusMap = new Map<string, string>();
        ordersWithSubOrders.forEach((subOrders, orderId) => {
            const allCobrado = subOrders.length > 0 && subOrders.every(so => so.status === OrderStatus.Cobrado);
            const allPendiente = subOrders.every(so => so.status === OrderStatus.Pendiente);
            let overallStatus;
            if (allCobrado) overallStatus = "Completado";
            else if (allPendiente) overallStatus = "Pendiente";
            else overallStatus = "En Progreso";
            overallStatusMap.set(orderId, overallStatus);
        });

        // Step 2: Apply UI filters on top of the role-based dataset.
        return baseData.filter(item => {
            if (filters.overallStatus !== 'all' && overallStatusMap.get(item.orderId) !== filters.overallStatus) {
                return false;
            }

            if (!item.creationDate) return false;
            // Use replace to handle dates as local timezone, not UTC
            const itemDate = new Date(item.creationDate.replace(/-/g, '\/'));
            const startDate = filters.dateRange.start ? new Date(filters.dateRange.start.replace(/-/g, '\/')) : null;
            const endDate = filters.dateRange.end ? new Date(filters.dateRange.end.replace(/-/g, '\/')) : null;

            // Adjust endDate to include the whole day to ensure accurate range filtering
            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
            }

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;

            // Apply filters based on user role.
            if (currentUserRole === UserRole.Finanzas || currentUserRole === UserRole.Gerencia) {
                if (filters.unit.length > 0 && !filters.unit.includes(item.unit as Unit)) return false;
                if (filters.director !== 'all' && item.director !== filters.director) return false;
                if (filters.executive !== 'all' && item.executive !== filters.executive) return false;
            } else if (currentUserRole === UserRole.Unidad) {
                // For Unit Directors, only apply director and executive filters. Unit filter is implicitly handled.
                if (filters.director !== 'all' && item.director !== filters.director) return false;
                if (filters.executive !== 'all' && item.executive !== filters.executive) return false;
            }

            if (filters.status !== 'all' && item.status !== filters.status) return false;
            if (filters.client && !item.client.toLowerCase().includes(filters.client.toLowerCase())) return false;
            if (filters.orderNumber && !item.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())) return false;
            if (filters.invoiceNumber && !item.invoiceNumber?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;

            return true;
        });
    }, [data, filters, currentUserRole, currentUserUnit, currentUserDirectorName]);

    useEffect(() => {
        onFilteredDataChange(filteredData);
    }, [filteredData, onFilteredDataChange]);

    return (
        <main>
            <SummaryCards 
                data={filteredData}
                currentUserRole={currentUserRole}
                currentUserUnit={currentUserUnit}
                subOrderFinancials={subOrderFinancials}
            />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mt-6 p-4">
                <FilterControls 
                    filters={filters} 
                    setFilters={setFilters} 
                    isUnitDirector={currentUserRole === UserRole.Unidad}
                    isCommercialDirector={false}
                    directors={directors}
                    executives={executives}
                />
                <OrderTable 
                    data={filteredData} 
                    onEdit={onEdit}
                    currentUserRole={currentUserRole}
                    currentUserUnit={currentUserUnit}
                    onAddSubOrder={onAddSubOrder}
                    onNotifyPayment={onNotifyPayment}
                    onAdjustBudget={onAdjustBudget}
                />
            </div>
        </main>
    );
};

export default Dashboard;