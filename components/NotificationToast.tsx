
import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { CloseIcon } from './icons/CloseIcon';
import { WhatsappIcon } from './icons/WhatsappIcon';

interface NotificationToastProps {
  title: string;
  message: string;
  whatsappLink: string;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ title, message, whatsappLink, onClose }) => {
  return (
    <div className="fixed bottom-5 right-5 w-full max-w-sm bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black dark:ring-gray-700 ring-opacity-5 overflow-hidden z-50">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            <div className="mt-4">
               <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm"
               >
                <WhatsappIcon className="h-5 w-5 mr-2" />
                Notificar por WhatsApp
              </a>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button onClick={onClose} className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-brand-primary">
              <span className="sr-only">Close</span>
              <CloseIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
