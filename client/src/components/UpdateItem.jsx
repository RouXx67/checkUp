import React from 'react';
import {
  Package,
  Github,
  Globe,
  Clock,
  ArrowUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const UpdateItem = ({ update, compact = false }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'github':
        return <Github className="h-4 w-4 text-gray-700" />;
      case 'docker':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'custom':
        return <Globe className="h-4 w-4 text-green-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (hasUpdate, currentVersion, latestVersion) => {
    if (hasUpdate) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          <ArrowUp className="h-3 w-3 mr-1" />
          Disponible
        </span>
      );
    }
    
    if (currentVersion === latestVersion) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          À jour
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <AlertCircle className="h-3 w-3 mr-1" />
        Inconnu
      </span>
    );
  };

  const hasUpdate = update.current_version !== update.latest_version && update.latest_version;

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
        <div className="flex-shrink-0">
          {getTypeIcon(update.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {update.name}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            {getStatusBadge(hasUpdate, update.current_version, update.latest_version)}
            {hasUpdate && (
              <span className="text-xs text-gray-500">
                {update.current_version} → {update.latest_version}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-xs text-gray-500">
          <Clock className="h-3 w-3 inline mr-1" />
          {new Date(update.last_checked).toLocaleDateString()}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getTypeIcon(update.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {update.name}
                </h4>
                {getStatusBadge(hasUpdate, update.current_version, update.latest_version)}
              </div>
              
              {update.description && (
                <p className="text-sm text-gray-600 mb-2">{update.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Version actuelle:</span>
                  <span className="ml-2 font-mono text-gray-900">
                    {update.current_version || 'Inconnue'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Dernière version:</span>
                  <span className="ml-2 font-mono text-gray-900">
                    {update.latest_version || 'Inconnue'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Vérifié le {new Date(update.last_checked).toLocaleString()}
                </span>
                <span className="capitalize">
                  Type: {update.type}
                </span>
                {update.url && (
                  <a
                    href={update.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800"
                  >
                    Voir le projet
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateItem;