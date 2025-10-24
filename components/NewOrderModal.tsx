import React, { useState } from 'react';
import { Unit, PaymentMethod } from '../types';
import { ALL_UNITS } from '../constants';

interface NewOrderModalProps {
    onClose: () => void;
    onSubmit: (orderData: { client: string; description: string; workType: string; quotedAmount: number; paymentMethod: PaymentMethod }, units: Unit[]) => void;
}

const NewOrderModal: React.FC<NewOrderModalProps> = ({ onClose, onSubmit }) => {
    const [client, setClient] = useState('');
    const [description, setDescription] = useState('');
    const [workType, setWorkType] = useState('');
    const [quotedAmount, setQuotedAmount] = useState('');
    const [selectedUnits, setSelectedUnits] = useState<Unit[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

    const handleUnitToggle = (unit: Unit) => {
        setSelectedUnits(prev =>
            prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(quotedAmount);
        if (!client || !description || !workType || !quotedAmount || !paymentMethod || selectedUnits.length === 0) {
            alert('Por favor, complete todos los campos y seleccione al menos una unidad.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            alert('El monto cotizado debe ser un número positivo.');
            return;
        }
        onSubmit({ client, description, workType, quotedAmount: amount, paymentMethod }, selectedUnits);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Crear Nueva Orden</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <input type="text" placeholder="Nombre del Cliente" value={client} onChange={e => setClient(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
                        <textarea placeholder="Descripción del Trabajo" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Tipo de Trabajo" value={workType} onChange={e => setWorkType(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
                            <input type="number" placeholder="Monto Cotizado (Q)" value={quotedAmount} onChange={e => setQuotedAmount(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
                        </div>
                        <div>
                            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pago</label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asignar a Unidades:</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_UNITS.map(unit => (
                                    <label key={unit} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedUnits.includes(unit)}
                                            onChange={() => handleUnitToggle(unit)}
                                            className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{unit}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700">Crear Orden</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewOrderModal;