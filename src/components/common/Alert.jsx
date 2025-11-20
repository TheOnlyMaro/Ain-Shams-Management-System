import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  dismissible = true,
}) => {
  const icons = {
    info: <Info className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
  };

  const styles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  };

  return (
    <div className={`border rounded-lg p-4 flex items-start space-x-3 ${styles[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1">
        {title && <h3 className="font-semibold">{title}</h3>}
        {message && <p className="text-sm mt-1">{message}</p>}
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:opacity-75 transition"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
