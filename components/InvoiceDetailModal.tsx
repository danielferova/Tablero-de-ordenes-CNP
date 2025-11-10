import React from 'react';
import { FinancialMovement } from '../types';

interface InvoiceDetailModalProps {
    movement: FinancialMovement;
    onClose: () => void;
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

const formatDate = (isoString: string | undefined | null): string => {    
    if (!isoString) return 'No disponible';
    try {
        return new Date(isoString).toLocaleString('es-GT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (e) {
        return 'Fecha inválida';
    }
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600 pb-2 mb-4 col-span-2">
        {children}
    </h3>
);

const DetailItem: React.FC<{ label: string; value: React.ReactNode; color?: string; mono?: boolean }> = ({ label, value, color = 'text-gray-500 dark:text-gray-400', mono = false }) => (
    <div className="flex flex-col">
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        <span className={`text-base text-gray-900 dark:text-white mt-1 break-words ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</span>
    </div>
);

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ movement, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Información Fiscal del Documento
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Factura: {movement.invoiceNumber}</p>
                </header>
                <main className="p-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        
                        <SectionTitle>Emisor</SectionTitle>
                        <DetailItem label="NIT" value={movement.issuerNit} color="text-amber-600 dark:text-amber-400" />
                        <DetailItem label="NOMBRE" value={movement.issuerName} color="text-amber-600 dark:text-amber-400" />

                        <SectionTitle>Receptor</SectionTitle>
                        <DetailItem label="NIT" value={movement.receiverNit} color="text-emerald-600 dark:text-emerald-400" />
                        <DetailItem label="NOMBRE" value={movement.receiverName} color="text-emerald-600 dark:text-emerald-400" />

                        <SectionTitle>Datos del DTE</SectionTitle>
                        <DetailItem label="AUTORIZACIÓN UUID" value={movement.authorizationUuid} mono />
                        <DetailItem label="FECHA Y HORA DE EMISIÓN" value={formatDate(movement.issueDateTime)} />
                        <DetailItem label="SERIE DTE" value={movement.series} />
                        <DetailItem label="AGENTE RETENCIÓN IVA" value={movement.vatWithholdingAgent} />
                        <DetailItem label="NÚMERO DTE" value={movement.dteNumber} />
                        <div></div> {/* Placeholder for alignment */}

                        <SectionTitle>Total</SectionTitle>
                        <DetailItem label="MONTO TOTAL" value={<span className="font-bold text-xl">{formatCurrency(movement.invoiceAmount)}</span>} />

                    </div>
                </main>
                <footer className="p-4 flex justify-end space-x-4 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                        Cerrar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InvoiceDetailModal;