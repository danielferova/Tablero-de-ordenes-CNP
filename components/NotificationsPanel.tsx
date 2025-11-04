import React, { useRef, useEffect, useMemo } from 'react';
import { AppNotification } from '../App';
import { CloseIcon } from './icons/CloseIcon';
import { TrashIcon } from './icons/TrashIcon';

interface NotificationsPanelProps {
    notifications: AppNotification[];
    onClose: () => void;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onDelete: (id: string) => void;
}

// Time formatting utility
const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} año${Math.floor(interval) > 1 ? 's' : ''}`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} mes${Math.floor(interval) > 1 ? 'es' : ''}`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} día${Math.floor(interval) > 1 ? 's' : ''}`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m`;
    return `Ahora`;
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose, onMarkAsRead, onMarkAllAsRead, onDelete }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent onClick on the `li` from firing (which marks as read)
        onDelete(id);
    };

    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: AppNotification[] } = {};

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const isSameDay = (d1: Date, d2: Date) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        const sortedNotifications = [...notifications].sort((a, b) => b.date.getTime() - a.date.getTime());

        sortedNotifications.forEach(notification => {
            let groupLabel: string;
            const notificationDate = notification.date;

            if (isSameDay(notificationDate, today)) {
                groupLabel = 'Hoy';
            } else if (isSameDay(notificationDate, yesterday)) {
                groupLabel = 'Ayer';
            } else {
                groupLabel = new Intl.DateTimeFormat('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                }).format(notificationDate);
                groupLabel = groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1);
            }

            if (!groups[groupLabel]) {
                groups[groupLabel] = [];
            }
            groups[groupLabel].push(notification);
        });

        return groups;
    }, [notifications]);

    const orderedGroupKeys = useMemo(() => {
        return Object.keys(groupedNotifications).sort((a, b) => {
            const dateA = groupedNotifications[a][0].date.getTime();
            const dateB = groupedNotifications[b][0].date.getTime();
            return dateB - dateA;
        });
    }, [groupedNotifications]);

    return (
        <div ref={panelRef} className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-30 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 flex flex-col">
            <header className="flex-shrink-0 flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
                <div className="flex items-center space-x-2">
                    {notifications.some(n => !n.read) && (
                         <button onClick={onMarkAllAsRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            Marcar todas como leídas
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <CloseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            </header>
            <div className="flex-grow max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">No hay notificaciones.</p>
                ) : (
                    <ul>
                        {orderedGroupKeys.map(groupKey => (
                            <React.Fragment key={groupKey}>
                                <li className="sticky top-0 bg-white dark:bg-gray-800 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
                                    <h4 className="px-3 pt-3 pb-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{groupKey}</h4>
                                </li>
                                {groupedNotifications[groupKey].map(n => (
                                    <li 
                                        key={n.id} 
                                        className={`group p-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 flex items-start gap-3 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                        onClick={() => onMarkAsRead(n.id)}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <span className={`block h-2 w-2 rounded-full ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`}></span>
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{n.title}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{n.message}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeSince(n.date)}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button 
                                                onClick={(e) => handleDeleteClick(e, n.id)}
                                                className="p-1 rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Eliminar notificación"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </React.Fragment>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;
