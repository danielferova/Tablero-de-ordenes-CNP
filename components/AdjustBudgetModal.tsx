import React, { useState, useEffect, useMemo } from 'react';
import { Order, SubOrder } from '../types';
import { WarningIcon } from './icons/WarningIcon';

interface AdjustBudgetModalProps {
    order: Order;
    subOrders: SubOrder[];
    onClose: () => void;
    onSubmit: (updatedOrder: Order, updatedSubOrders: SubOrder[]) => void;
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

const AdjustBudgetModal: React.FC<AdjustBudgetModalProps> = ({ order, subOrders, onClose, onSubmit }) => {
    const [quotedAmount, setQuotedAmount] = useState(order.quotedAmount?.toString() || '');
    const [budgetedAmounts, setBudgetedAmounts] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        setQuotedAmount(order.quotedAmount?.toString() || '');
        // Initialize with the real cost if it exists, otherwise the budget.
        // This pre-fills the form with the Unit Director's latest cost, making it an "approval" step for the Commercial Director.
        const initialBudgets = subOrders.reduce((acc, so) => {
            // Use the 'amount' (real cost) if it has been set, as it represents the most recent value from the unit.
            // Otherwise, fall back to the 'budgetedAmount'.
            const initialValue = so.amount !== undefined && so.amount !== null ? so.amount : so.budgetedAmount;
            acc[so.id] = initialValue?.toString() || '0';
            return acc;
        }, {} as { [key: string]: string });
        setBudgetedAmounts(initialBudgets);
    }, [order, subOrders]);

    const handleBudgetChange = (subOrderId: string, value: string) => {
        setBudgetedAmounts(prev => ({ ...prev, [subOrderId]: value }));
    };

    const totalAssigned = useMemo(() => {
        // FIX: Explicitly type `reduce` parameters to prevent `unknown` type errors.
        return Object.values(budgetedAmounts).reduce((sum: number, amountStr: string) => {
            const amount = parseFloat(amountStr);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
    }, [budgetedAmounts]);

    const currentQuotedAmount = useMemo(() => parseFloat(quotedAmount) || 0, [quotedAmount]);
    const difference = useMemo(() => currentQuotedAmount - totalAssigned, [currentQuotedAmount, totalAssigned]);
    const isSaveDisabled = useMemo(() => Math.abs(difference) > 0.01, [difference]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaveDisabled) return;

        const updatedOrder = {
            ...order,
            quotedAmount: currentQuotedAmount,
        };

        const updatedSubOrders = subOrders.map(so => ({
            ...so,
            budgetedAmount: parseFloat(budgetedAmounts[so.id]) || 0,
        }));

        onSubmit(updatedOrder, updatedSubOrders);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Ajustar Presupuestos: <span className="text-brand-primary">{order.orderNumber}</span>
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cliente: {order.client}</p>
                </header>

                <main className="p-6 overflow-y-auto flex-grow space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Total Cotizado (Editable)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={quotedAmount}
                            onChange={(e) => setQuotedAmount(e.target.value)}
                            className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                            Presupuestos Asignados por Tarea
                        </h3>
                        {subOrders.map(so => (
                            <div key={so.id} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <div className="md:col-span-2">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{so.subOrderNumber} - {so.unit}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{so.description}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Monto de Trabajo (Costo Real)</label>
                                    <p className="mt-1 p-2 text-sm font-semibold rounded-md bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{formatCurrency(so.amount)}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Presupuesto Asignado (Editable)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={budgetedAmounts[so.id] || ''}
                                        onChange={(e) => handleBudgetChange(so.id, e.target.value)}
                                        className="mt-1 w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
                
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                     <div className={`p-3 rounded-md text-sm ${isSaveDisabled ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                        <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-100">
                            <span>Monto Cotizado:</span>
                            <span>{formatCurrency(currentQuotedAmount)}</span>
                        </div>
                        <div className="flex justify-between mt-1 text-gray-700 dark:text-gray-300">
                            <span>Total Asignado:</span>
                            <span>{formatCurrency(totalAssigned)}</span>
                        </div>
                        <div className={`flex justify-between mt-2 font-bold ${isSaveDisabled ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>
                            <span>Diferencia:</span>
                            <span>{formatCurrency(difference)}</span>
                        </div>
                    </div>
                    {isSaveDisabled && (
                        <div className="flex items-center text-yellow-700 dark:text-yellow-300 text-xs">
                            <WarningIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            Los montos deben cuadrar (diferencia de Q0.00) para poder guardar.
                        </div>
                    )}
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="button" onClick={handleSubmit} disabled={isSaveDisabled} className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed">
                            Guardar Cambios
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AdjustBudgetModal;