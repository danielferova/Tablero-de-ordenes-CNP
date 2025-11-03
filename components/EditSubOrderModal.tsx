import React, { useState, useEffect, useMemo } from 'react';
import { SubOrder, Order, OrderStatus } from '../types';
import { WarningIcon } from './icons/WarningIcon';

interface EditSubOrderModalProps {
    subOrder: SubOrder;
    parentOrder: Order;
    siblingSubOrders: SubOrder[];
    onClose: () => void;
    onSubmit: (subOrder: SubOrder) => void;
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};


const EditSubOrderModal: React.FC<EditSubOrderModalProps> = ({ subOrder, parentOrder, siblingSubOrders, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        taskName: subOrder.taskName || '',
        amount: subOrder.amount?.toString() || '',
        spentAmount: subOrder.spentAmount?.toString() || '',
        observations: subOrder.observations || '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const isReadOnly = useMemo(() => {
        return subOrder.status === OrderStatus.Facturado || subOrder.status === OrderStatus.Cobrado;
    }, [subOrder.status]);

    // Determine the effective budget for display and comparison.
    const effectiveBudget = useMemo(() => {
        // A specific budget was assigned (>0), so that's the source of truth.
        if (subOrder.budgetedAmount && subOrder.budgetedAmount > 0) {
            return subOrder.budgetedAmount;
        }
        // No specific budget was set, but it's the only task in the order.
        // In this case, the budget is inferred to be the total quoted amount for the order.
        if (siblingSubOrders.length === 1) {
            return parentOrder.quotedAmount ?? 0;
        }
        // Default to the stored value (likely 0) if there are multiple tasks and no specific budget.
        return subOrder.budgetedAmount || 0;
    }, [subOrder.budgetedAmount, parentOrder.quotedAmount, siblingSubOrders.length]);


    useEffect(() => {
        setFormData({
            taskName: subOrder.taskName || '',
            amount: subOrder.amount?.toString() || '',
            spentAmount: subOrder.spentAmount?.toString() || '',
            observations: subOrder.observations || '',
        });
    }, [subOrder]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormError(null); // Clear previous non-budget related errors on change
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const spentAmountValue = formData.spentAmount === '' ? undefined : parseFloat(String(formData.spentAmount));

        if (spentAmountValue !== undefined && (isNaN(spentAmountValue) || spentAmountValue < 0)) {
            setFormError('Si se ingresa, el monto gastado no puede ser negativo.');
            return;
        }

        if (isReadOnly) {
            const updatedSubOrder: SubOrder = {
                ...subOrder, // Start with original values to preserve locked fields
                spentAmount: spentAmountValue,
                // Observations and other fields are preserved from the original `subOrder` spread
            };
            onSubmit(updatedSubOrder);
            return;
        }

        // Full validation for non-readonly (Pending) tasks
        const amountValue = formData.amount === '' ? NaN : parseFloat(String(formData.amount));
        
        if (!formData.taskName.trim()) {
            setFormError('El "Nombre del Trabajo / Servicio" es un campo obligatorio.');
            return;
        }
        if (isNaN(amountValue)) {
            setFormError('El monto de tarea debe ser un número válido.');
            return;
        }
        if (amountValue < 0) {
            setFormError('El monto de tarea no puede ser negativo.');
            return;
        }

        const updatedSubOrder: SubOrder = {
            ...subOrder,
            taskName: formData.taskName,
            amount: amountValue,
            spentAmount: spentAmountValue,
            observations: formData.observations,
        };

        // If the budget was inferred because it was missing on a single-task order,
        // this is a good opportunity to correct the data in the database.
        const hasOriginalBudget = subOrder.budgetedAmount && subOrder.budgetedAmount > 0;
        if (!hasOriginalBudget && siblingSubOrders.length === 1) {
            updatedSubOrder.budgetedAmount = parentOrder.quotedAmount;
        }
        
        onSubmit(updatedSubOrder);
    };
    
    // Calculate the difference between the current input and the effective budget for real-time feedback.
    const currentAmount = parseFloat(formData.amount) || 0;
    const difference = currentAmount - effectiveBudget;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isReadOnly ? 'Actualizar Tarea' : 'Editar Tarea'} de: <span className="text-brand-primary">{subOrder.unit}</span>
                    </h2>
                </header>
                <main className="p-6 overflow-y-auto flex-grow">
                    <form id="edit-suborder-form" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            {isReadOnly && (
                                <div className="p-3 mb-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-md border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-3">
                                    <WarningIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Modo de Edición Limitada</p>
                                        <p>Esta tarea ya ha sido facturada/cobrada. Solo se puede modificar el "Monto Gastado".</p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Trabajo (Asignado)</label>
                                 <input
                                    type="text"
                                    value={subOrder.workType || ''}
                                    className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none cursor-not-allowed"
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Trabajo / Servicio</label>
                                <input
                                    type="text"
                                    name="taskName"
                                    value={formData.taskName}
                                    onChange={handleChange}
                                    className={`mt-1 w-full p-2 border rounded-md focus:outline-none ${isReadOnly ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-primary'}`}
                                    placeholder="Ej: Impresión de Lona, Spot de Radio 30s"
                                    readOnly={isReadOnly}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción de Tarea (Asignada por Dir. Comercial)</label>
                                <textarea
                                    name="description"
                                    value={subOrder.description || ''}
                                    rows={3}
                                    className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none cursor-not-allowed"
                                    readOnly
                                    disabled
                                />
                                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    La descripción de la tarea es asignada por el Director Comercial y no puede ser modificada.
                                </p>
                            </div>
                            <div className="p-3 mb-2 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-blue-800 dark:text-blue-200">Presupuesto asignado a esta tarea:</span>
                                    <span className="font-bold text-blue-900 dark:text-blue-100">{formatCurrency(effectiveBudget)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="text-gray-600 dark:text-gray-400">Monto total cotizado para la orden:</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(parentOrder.quotedAmount)}</span>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto de Tarea (Presupuesto)</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        className={`mt-1 w-full p-2 border rounded-md focus:outline-none ${isReadOnly ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-primary'}`}
                                        required
                                        readOnly={isReadOnly}
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Gastado (Referencia)</label>
                                    <input
                                        type="number"
                                        name="spentAmount"
                                        value={formData.spentAmount}
                                        onChange={handleChange}
                                        className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        step="0.01"
                                        min="0"
                                        placeholder="Costo interno (opcional)"
                                    />
                                </div>
                            </div>
                                {/* Discrepancy/Surplus Indicator */}
                                {!isReadOnly && Math.abs(difference) > 0.01 && (
                                    <div className={`mt-2 p-2 rounded-md text-sm flex items-start ${difference > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'}`}>
                                        <WarningIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold">
                                                {difference > 0 ? 'Excedente' : 'Discrepancia'}: {formatCurrency(Math.abs(difference))}
                                            </p>
                                            <p className="text-xs">Se notificará al Director Comercial sobre este ajuste para su revisión.</p>
                                        </div>
                                    </div>
                                )}
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones (Opcional)</label>
                                <textarea
                                    name="observations"
                                    value={formData.observations}
                                    onChange={handleChange}
                                    rows={3}
                                    className={`mt-1 w-full p-2 border rounded-md focus:outline-none ${isReadOnly ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-primary'}`}
                                    readOnly={isReadOnly}
                                />
                            </div>

                            {formError && (
                                <div className="flex items-center text-red-600 dark:text-red-400 p-2 mt-2 bg-red-50 dark:bg-red-900/20 rounded-md text-sm">
                                    <WarningIcon className="w-5 h-5 mr-2" />
                                    {formError}
                                </div>
                             )}
                        </div>
                    </form>
                </main>
                <footer className="p-4 flex justify-end space-x-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                    <button type="submit" form="edit-suborder-form" className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700">Guardar Cambios</button>
                </footer>
            </div>
        </div>
    );
};

export default EditSubOrderModal;
