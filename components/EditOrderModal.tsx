import React, { useState, useEffect, useMemo } from 'react';
import { Order, SubOrder, OrderStatus, PaymentMethod } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { WarningIcon } from './icons/WarningIcon';

interface EditOrderModalProps {
    order: Order;
    subOrders: SubOrder[];
    onClose: () => void;
    onSubmit: (order: Order, subOrders: SubOrder[]) => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, subOrders, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Order>({ ...order });
    const [editableSubOrders, setEditableSubOrders] = useState<SubOrder[]>([]);

    useEffect(() => {
        setFormData({ ...order });
        // Create a deep enough copy of sub-orders to avoid circular reference issues with JSON.stringify
        setEditableSubOrders(subOrders.map(so => ({...so})));
    }, [order, subOrders]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const parsedValue = (name === 'invoiceTotalAmount' || name === 'paidAmount') 
            ? (value === '' ? undefined : parseFloat(value)) 
            : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };
    
    const handleSubOrderStatusChange = (subOrderId: string, newStatus: OrderStatus) => {
        setEditableSubOrders(prev =>
            prev.map(so => (so.id === subOrderId ? { ...so, status: newStatus } : so))
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData, editableSubOrders);
    };

    const subOrdersTotal = useMemo(() => {
        return editableSubOrders.reduce((sum, so) => sum + (so.amount || 0), 0);
    }, [editableSubOrders]);

    const formatCurrency = (value: number | undefined | null) => {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
    };
    
    const definedAmounts = [order.quotedAmount, formData.invoiceTotalAmount, subOrdersTotal, formData.paidAmount].filter(a => typeof a === 'number');
    const allAmountsMatch = new Set(definedAmounts).size <= 1;
    const showMismatchWarning = definedAmounts.length > 1 && !allAmountsMatch;

    // Validation logic for status changes
    const canBeFacturado = !!(formData.invoiceNumber && formData.invoiceDate && typeof formData.invoiceTotalAmount === 'number');
    const canBeCobrado = canBeFacturado && !!(typeof formData.paidAmount === 'number' && formData.paymentDate);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Gestionar Facturación: <span className="text-brand-primary">{order.orderNumber}</span></h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">No. Factura General</label>
                            <input type="text" name="invoiceNumber" value={formData.invoiceNumber || ''} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Factura</label>
                            <input type="date" name="invoiceDate" value={formData.invoiceDate || ''} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Total Factura (Q)</label>
                            <input type="number" step="0.01" name="invoiceTotalAmount" value={formData.invoiceTotalAmount ?? ''} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Pagado (Q)</label>
                             <input type="number" step="0.01" name="paidAmount" value={formData.paidAmount ?? ''} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Pago</label>
                            <input type="date" name="paymentDate" value={formData.paymentDate || ''} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div className="md:col-span-2">
                             <div className="mt-2 p-3 rounded-md bg-gray-100 dark:bg-gray-700/50 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-gray-600 dark:text-gray-300">Monto Cotizado:</span>
                                  <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(order.quotedAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-gray-600 dark:text-gray-300">Suma de Tareas:</span>
                                  <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(subOrdersTotal)}</span>
                                </div>
                                {definedAmounts.length > 1 && (
                                     showMismatchWarning ? (
                                        <div className="flex items-center text-red-600 dark:text-red-400 pt-1 border-t border-gray-200 dark:border-gray-600/50">
                                            <WarningIcon className="w-5 h-5 mr-1.5" />
                                            <span className="text-sm font-semibold">Los montos no coinciden</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-green-600 dark:text-green-400 pt-1 border-t border-gray-200 dark:border-gray-600/50">
                                            <CheckCircleIcon className="w-5 h-5 mr-1.5" />
                                            <span className="text-sm font-semibold">Montos Coinciden</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Gestionar Estado de Tareas</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            Actualice el estado de cada tarea individualmente. El cambio de estado solo es posible para tareas con un monto asignado.
                        </p>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {editableSubOrders.map(so => (
                                <div key={so.id} className={`flex items-center justify-between p-2 rounded-md ${!so.amount ? 'opacity-50' : ''} bg-gray-50 dark:bg-gray-700/50`}>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{so.subOrderNumber}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{so.unit}</p>
                                    </div>
                                    <select
                                        value={so.status}
                                        onChange={(e) => handleSubOrderStatusChange(so.id, e.target.value as OrderStatus)}
                                        className="w-40 p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                                        disabled={so.amount === undefined || so.amount === null}
                                    >
                                        <option value={OrderStatus.Pendiente}>{OrderStatus.Pendiente}</option>
                                        <option 
                                            value={OrderStatus.Facturado}
                                            disabled={!canBeFacturado}
                                            title={!canBeFacturado ? 'Debe completar No. Factura, Fecha Factura y Monto Factura.' : ''}
                                        >
                                            {OrderStatus.Facturado}
                                        </option>
                                        <option 
                                            value={OrderStatus.Cobrado}
                                            disabled={!canBeCobrado}
                                            title={!canBeCobrado ? 'Debe completar datos de Factura, Monto Pagado y Fecha de Pago.' : ''}
                                        >
                                            {OrderStatus.Cobrado}
                                        </option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditOrderModal;