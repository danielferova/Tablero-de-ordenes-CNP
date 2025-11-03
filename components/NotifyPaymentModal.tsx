import React, { useState } from 'react';
import { Order } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { WarningIcon } from './icons/WarningIcon';

export interface PaymentNotificationDetails {
    businessName: string;
    taxId: string;
    address: string;
    description: string;
    invoiceAmount: number | null;
    paidAmount: number | null;
    date: string | null;
}

interface NotifyPaymentModalProps {
    order: Order;
    onClose: () => void;
    onSubmit: (order: Order, payments: PaymentNotificationDetails[], clientEmail: string) => void;
}

interface PaymentFormState {
    id: string;
    businessName: string;
    taxId: string;
    address: string;
    description: string;
    invoiceAmount: string;
    paidAmount: string;
    date: string;
}

const NotifyPaymentModal: React.FC<NotifyPaymentModalProps> = ({ order, onClose, onSubmit }) => {
    const [payments, setPayments] = useState<PaymentFormState[]>([
        { id: `payment-${Date.now()}`, businessName: '', taxId: '', address: '', description: '', invoiceAmount: '', paidAmount: '', date: '' }
    ]);
    const [clientEmail, setClientEmail] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const handleAddPayment = () => {
        setPayments(prev => [...prev, { id: `payment-${Date.now()}`, businessName: '', taxId: '', address: '', description: '', invoiceAmount: '', paidAmount: '', date: '' }]);
    };

    const handleRemovePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handlePaymentChange = (id: string, field: keyof Omit<PaymentFormState, 'id'>, value: string) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!clientEmail.trim() || !/^\S+@\S+\.\S+$/.test(clientEmail)) {
            setFormError('Debe proporcionar un correo de cliente válido.');
            return;
        }

        const processedPayments: PaymentNotificationDetails[] = [];

        for (const p of payments) {
            if (!p.businessName.trim() || !p.taxId.trim() || !p.address.trim() || !p.description.trim()) {
                setFormError('Para cada notificación, debe completar Razón Social, NIT, Dirección y Descripción.');
                return;
            }

            const invoiceAmountStr = p.invoiceAmount.trim();
            const paidAmountStr = p.paidAmount.trim();
            const paymentDate = p.date.trim();

            if (!invoiceAmountStr && !paidAmountStr) {
                setFormError('Debe proporcionar al menos un "Monto a Facturar" o un "Monto Pagado" para cada notificación.');
                return;
            }

            let invoiceAmount: number | null = null;
            if (invoiceAmountStr) {
                invoiceAmount = parseFloat(invoiceAmountStr);
                if (isNaN(invoiceAmount) || invoiceAmount <= 0) {
                    setFormError('Si se ingresa, el "Monto a Facturar" debe ser un número positivo.');
                    return;
                }
            }
            
            let paidAmount: number | null = null;
            if (paidAmountStr) {
                paidAmount = parseFloat(paidAmountStr);
                if (isNaN(paidAmount) || paidAmount <= 0) {
                    setFormError('Si se ingresa, el "Monto Pagado" debe ser un número positivo.');
                    return;
                }
                if (!paymentDate) {
                    setFormError('Si se ingresa un "Monto Pagado", la "Fecha de Pago" es obligatoria.');
                    return;
                }
            }
            
            processedPayments.push({
                businessName: p.businessName.trim(),
                taxId: p.taxId.trim(),
                address: p.address.trim(),
                description: p.description.trim(),
                invoiceAmount,
                paidAmount,
                date: paymentDate || null,
            });
        }
        
        if(processedPayments.length === 0) {
            setFormError('Debe añadir al menos un registro para notificar.');
            return;
        }

        onSubmit(order, processedPayments, clientEmail);
    };

    const inputClasses = "w-full mt-1 p-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Notificar Pago para Orden: <span className="text-brand-primary">{order.orderNumber}</span>
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cliente: {order.client}</p>
                </header>

                <main className="flex-grow overflow-y-auto p-6">
                    <form id="notify-payment-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Correo del Cliente para Entrega</label>
                            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className={inputClasses} required placeholder="ejemplo@cliente.com" />
                        </div>
                        <hr className="border-gray-200 dark:border-gray-700" />
                        
                        {payments.map((p, index) => (
                            <div key={p.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 relative">
                                {payments.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePayment(p.id)}
                                        className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
                                        title="Eliminar este pago"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Detalles de Notificación #{index + 1}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Razón Social</label>
                                        <input type="text" value={p.businessName} onChange={e => handlePaymentChange(p.id, 'businessName', e.target.value)} className={inputClasses} required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">NIT</label>
                                        <input type="text" value={p.taxId} onChange={e => handlePaymentChange(p.id, 'taxId', e.target.value)} className={inputClasses} required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Dirección de Facturación</label>
                                        <input type="text" value={p.address} onChange={e => handlePaymentChange(p.id, 'address', e.target.value)} className={inputClasses} required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Descripción (Para Factura)</label>
                                        <textarea value={p.description} onChange={e => handlePaymentChange(p.id, 'description', e.target.value)} className={inputClasses} required rows={2} />
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Monto a Facturar (Q)</label>
                                        <input type="number" step="0.01" min="0.01" value={p.invoiceAmount} onChange={e => handlePaymentChange(p.id, 'invoiceAmount', e.target.value)} className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Monto Pagado (Q)</label>
                                        <input type="number" step="0.01" min="0.01" value={p.paidAmount} onChange={e => handlePaymentChange(p.id, 'paidAmount', e.target.value)} className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Fecha de Pago</label>
                                        <input type="date" value={p.date} onChange={e => handlePaymentChange(p.id, 'date', e.target.value)} className={inputClasses} />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div>
                            <button type="button" onClick={handleAddPayment} className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-semibold py-2 px-3 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors">
                                <PlusIcon className="w-4 h-4 mr-1.5" />
                                Agregar Otra Notificación
                            </button>
                        </div>

                        {formError && (
                            <div className="flex items-center text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm">
                                <WarningIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                                {formError}
                            </div>
                        )}
                    </form>
                </main>

                <footer className="p-4 flex justify-end space-x-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                    <button type="submit" form="notify-payment-form" className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700">Enviar Notificación a Finanzas</button>
                </footer>
            </div>
        </div>
    );
};

export default NotifyPaymentModal;
