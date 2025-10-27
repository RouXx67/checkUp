import React from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Bell,
  Clock
} from 'lucide-react';

const AlertItem = ({ alert, compact = false }) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'service_down':
        return <XCircle className="h-4 w-4 text-danger-500" />;
      case 'service_slow':
        return <AlertTriangle className="h-4 w-4 text-warning-500" />;
      case 'update_available':
        return <Package className="h-4 w-4 text-primary-500" />;
      case 'service_recovered':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertBadge = (type) => {
    switch (type) {
      case 'service_down':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
            Hors ligne
          </span>
        );
      case 'service_slow':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            Lent
          </span>
        );
      case 'update_available':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            Mise à jour
          </span>
        );
      case 'service_recovered':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
            Récupéré
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Autre
          </span>
        );
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-danger-500';
      case 'medium':
        return 'border-l-warning-500';
      case 'low':
        return 'border-l-primary-500';
      default:
        return 'border-l-gray-300';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 p-3 border-l-4 ${getPriorityColor(alert.priority)} bg-white rounded-r-lg`}>
        <div className="flex-shrink-0">
          {getAlertIcon(alert.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {alert.title}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            {getAlertBadge(alert.type)}
            <span className="text-xs text-gray-500 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(alert.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {!alert.acknowledged && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Nouveau
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`border-l-4 ${getPriorityColor(alert.priority)} bg-white rounded-r-lg shadow-sm`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {alert.title}
                </h4>
                {getAlertBadge(alert.type)}
                {!alert.acknowledged && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Nouveau
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(alert.created_at).toLocaleString()}
                </span>
                {alert.service_name && (
                  <span>Service: {alert.service_name}</span>
                )}
                <span className="capitalize">
                  Priorité: {alert.priority}
                </span>
              </div>
              {alert.acknowledged && (
                <div className="mt-2 text-xs text-gray-500">
                  Acquittée le {new Date(alert.acknowledged_at).toLocaleString()}
                </div>
              )}
              {alert.resolved && (
                <div className="mt-2 text-xs text-success-600">
                  Résolue le {new Date(alert.resolved_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertItem;