import React, { useMemo, useState } from 'react';
import { Order, SubOrder, OrderStatus, UserRole, Unit } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusIcon } from './icons/PlusIcon';
import { WarningIcon } from './icons/WarningIcon';

interface FullOrderData extends Order, SubOrder {}

interface OrderTableProps {
    data: FullOrderData[];
    onEdit: (subOrder: SubOrder, order: Order) => void;
    currentUserRole: UserRole;
    currentUserUnit: Unit | null;
    onAddSubOrder: (order: Order) => void;
}

interface OrderWithSubOrders extends Order {
    subOrders: SubOrder[];
}

const OrderTable: React.FC<OrderTableProps> = ({ data, onEdit, currentUserRole, currentUserUnit, onAddSubOrder }) => {
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

    const toggleOrder = (orderId: string) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };
    
    const formatCurrency = (value: number | undefined | null) => {
        if (value === undefined || value === null) return 'Q0.00';
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
    };

    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return 'Sin fecha';
        return dateString;
    }

    const getStatusChipClass = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.Pendiente: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case OrderStatus.Facturado: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case OrderStatus.Cobrado: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };
    
    const canEdit = (subOrder: SubOrder) => {
        if (currentUserRole === UserRole.Unidad) {
            // A unit director can edit IF it's their unit AND the task is still pending.
            const isTheirUnit = subOrder.unit === currentUserUnit;
            const isPending = subOrder.status === OrderStatus.Pendiente;
            return isTheirUnit && isPending;
        }
        if (currentUserRole === UserRole.Finanzas) {
            // Finance can always edit financials if an amount is set, regardless of status.
            return subOrder.amount !== undefined && subOrder.amount !== null;
        }
        return false;
    };
    
    const getEditButtonTitle = (subOrder: SubOrder): string => {
        if (currentUserRole === UserRole.Unidad) {
            if (subOrder.unit !== currentUserUnit) {
                return "No tiene permiso para editar tareas de otra unidad.";
            }
            if (subOrder.status !== OrderStatus.Pendiente) {
                return "No se puede editar una tarea que ya ha sido facturada o cobrada.";
            }
        }
        
        if (canEdit(subOrder)) {
            return "Editar tarea";
        }

        if (currentUserRole === UserRole.Finanzas && (subOrder.amount === undefined || subOrder.amount === null)) {
             return "Finanzas solo puede editar si la unidad ha asignado un monto a la tarea.";
        }

        return "No tiene permiso para editar esta tarea";
    };

    const groupedData = useMemo(() => {
        const ordersMap: { [key: string]: Order } = {};
        const subOrdersMap: { [key: string]: SubOrder[] } = {};

        data.forEach(item => {
            if (!ordersMap[item.orderId]) {
                ordersMap[item.orderId] = {
                    id: item.orderId,
                    orderNumber: item.orderNumber,
                    client: item.client,
                    description: item.description,
                    workType: item.workType,
                    creationDate: item.creationDate,
                    quotedAmount: item.quotedAmount,
                    invoiceNumber: item.invoiceNumber,
                    invoiceDate: item.invoiceDate,
                    paymentDate: item.paymentDate,
                    paymentMethod: item.paymentMethod,
                    invoiceTotalAmount: item.invoiceTotalAmount,
                    paidAmount: item.paidAmount,
                    director: item.director,
                    executive: item.executive,
                    billingType: item.billingType,
                    financialObservations: item.financialObservations,
                };
            }
            if (!subOrdersMap[item.orderId]) {
                subOrdersMap[item.orderId] = [];
            }
            subOrdersMap[item.orderId].push(item);
        });

        return Object.values(ordersMap).map(order => {
            const subOrders = subOrdersMap[order.id] || [];
            return { ...order, subOrders };
        }).sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
    }, [data]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="w-12 px-4"></th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No. Orden</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Creación</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Cotizado</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Trabajos</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Facturado</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No. Factura</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Factura</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Pagado</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Pago</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo Pendiente</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado General</th>
                        <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {groupedData.map((order) => {
                        const isExpanded = expandedOrders.has(order.id);
                        
                        const allCobrado = order.subOrders.length > 0 && order.subOrders.every(so => so.status === OrderStatus.Cobrado);
                        const allPendiente = order.subOrders.every(so => so.status === OrderStatus.Pendiente);

                        let overallStatusText;
                        if (allCobrado) overallStatusText = "Completado";
                        else if (allPendiente) overallStatusText = "Pendiente";
                        else overallStatusText = "En Progreso";
                        
                        const subOrdersTotal = order.subOrders.reduce((sum, so) => sum + (so.amount || 0), 0);
                        const definedAmounts = [order.quotedAmount, subOrdersTotal, order.invoiceTotalAmount, order.paidAmount].filter(a => typeof a === 'number');
                        const allAmountsMatch = new Set(definedAmounts).size <= 1;
                        const showWarning = definedAmounts.length > 1 && !allAmountsMatch;

                        const balance = (order.invoiceTotalAmount || 0) - (order.paidAmount || 0);

                        return (
                            <React.Fragment key={order.id}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-2">
                                        <button onClick={() => toggleOrder(order.id)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{order.orderNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.client}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(order.creationDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(order.quotedAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(subOrdersTotal)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700 dark:text-blue-300">{formatCurrency(order.invoiceTotalAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.invoiceNumber || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(order.invoiceDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-300">{formatCurrency(order.paidAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(order.paymentDate)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>{formatCurrency(balance)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                      <div className="flex items-center gap-2">
                                        {overallStatusText}
                                        {showWarning && <WarningIcon className="w-5 h-5 text-yellow-500" title="Los montos (cotizado, tareas, factura, pagado) no coinciden." />}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {currentUserRole === UserRole.Unidad && (
                                            <button
                                                onClick={() => onAddSubOrder(order)}
                                                className="flex items-center text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-brand-primary font-semibold py-1 px-3 rounded-md transition-colors disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
                                                disabled={allCobrado}
                                                title={allCobrado ? "No se pueden añadir tareas a una orden completada" : "Añadir Tarea"}
                                            >
                                                <PlusIcon className="w-4 h-4 mr-1.5" />
                                                Añadir Tarea
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr>
                                        <td colSpan={14} className="p-0 bg-gray-50/50 dark:bg-gray-900/50">
                                            <div className="p-4 mx-4 my-2 border-l-4 border-brand-primary bg-white dark:bg-gray-800 rounded-r-lg">
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-baseline mb-3 gap-2">
                                                    <h4 className="font-semibold dark:text-white flex-shrink-0">Detalles de la Orden</h4>
                                                    <div className="text-sm text-gray-800 dark:text-gray-200 flex flex-wrap justify-start sm:justify-end gap-x-4 gap-y-1">
                                                        <div className="flex items-center">
                                                            <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1.5">Director:</span>
                                                            <span>{order.director || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1.5">Ejecutivo:</span>
                                                            <span>{order.executive || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1.5">Tipo Facturación:</span>
                                                            <span>{order.billingType === 'perTask' ? 'Facturación por Tarea' : order.billingType === 'global' ? 'Facturación Global' : 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1.5">Método:</span>
                                                            <span>{order.paymentMethod || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {(currentUserRole === UserRole.Gerencia || currentUserRole === UserRole.Finanzas) && order.financialObservations && (
                                                    <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                                                        <h5 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Observaciones Financieras:</h5>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{order.financialObservations}</p>
                                                    </div>
                                                )}

                                                <table className="min-w-full">
                                                    <thead>
                                                      <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Suborden</th>
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Creación</th>
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unidad</th>
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo Trabajo</th>
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descripción</th>
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto</th>
                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                                        <th className="relative py-2"><span className="sr-only">Edit</span></th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.subOrders.map(subOrder => (
                                                            <tr key={subOrder.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
                                                                <td className="py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{subOrder.subOrderNumber}</td>
                                                                <td className="py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(subOrder.creationDate)}</td>
                                                                <td className="py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{subOrder.unit}</td>
                                                                <td className="py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{subOrder.workType}</td>
                                                                <td className="py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">{subOrder.description}</td>
                                                                <td className="py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">{subOrder.observations || 'N/A'}</td>
                                                                <td className="py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(subOrder.amount)}</td>
                                                                <td className="py-3 whitespace-nowrap">
                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChipClass(subOrder.status)}`}>{subOrder.status}</span>
                                                                </td>
                                                                <td className="py-3 whitespace-nowrap text-right text-sm font-medium">
                                                                    {(currentUserRole === UserRole.Unidad || currentUserRole === UserRole.Finanzas) && (
                                                                        <button 
                                                                            onClick={() => onEdit(subOrder, order)} 
                                                                            className="text-brand-primary hover:text-red-700 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                                            disabled={!canEdit(subOrder)}
                                                                            title={getEditButtonTitle(subOrder)}
                                                                        >
                                                                            <PencilIcon className="w-5 h-5"/>
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {groupedData.length === 0 && (
                        <tr>
                            <td colSpan={14} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                No se encontraron resultados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default OrderTable;