import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Server,
  Trash2,
  Check,
  X,
  Filter,
  Clock,
  Eye
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, acknowledged
  const [typeFilter, setTypeFilter] = useState('all'); // all, service_down, service_slow, update_available

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/api/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await axios.put(`/api/alerts/${alertId}/acknowledge`);
      toast.success('Alerte acquittée');
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Erreur lors de l\'acquittement');
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await axios.put(`/api/alerts/${alertId}/resolve`);
      toast.success('Alerte résolue');
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const handleDelete = async (alertId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
      return;
    }

    try {
      await axios.delete(`/api/alerts/${alertId}`);
      toast.success('Alerte supprimée');
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'service_down':
        return <XCircle className="h-5 w-5 text-danger-500" />;
      case 'service_slow':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'update_available':
        return <Package className="h-5 w-5 text-primary-500" />;
      case 'service_recovered':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertBadge = (type) => {
    switch (type) {
      case 'service_down':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
            Service hors ligne
          </span>
        );
      case 'service_slow':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            Service lent
          </span>
        );
      case 'update_available':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            Mise à jour disponible
          </span>
        );
      case 'service_recovered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
            Service récupéré
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread' && alert.acknowledged) return false;
    if (filter === 'acknowledged' && !alert.acknowledged) return false;
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = alerts.filter(alert => !alert.acknowledged).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
          <p className="text-gray-600">
            Gérez vos alertes système {unreadCount > 0 && `(${unreadCount} non lues)`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input"
            >
              <option value="all">Toutes</option>
              <option value="unread">Non lues ({unreadCount})</option>
              <option value="acknowledged">Acquittées</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">Tous les types</option>
              <option value="service_down">Service hors ligne</option>
              <option value="service_slow">Service lent</option>
              <option value="update_available">Mise à jour disponible</option>
              <option value="service_recovered">Service récupéré</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`card border-l-4 ${getPriorityColor(alert.priority)} ${
              !alert.acknowledged ? 'bg-blue-50' : ''
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {alert.title}
                      </h3>
                      {getAlertBadge(alert.type)}
                      {!alert.acknowledged && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Nouveau
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-3">{alert.message}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                      {alert.service_name && (
                        <span className="flex items-center">
                          <Server className="h-4 w-4 mr-1" />
                          {alert.service_name}
                        </span>
                      )}
                      <span className="capitalize">
                        Priorité: {alert.priority}
                      </span>
                    </div>
                    {alert.acknowledged && (
                      <div className="mt-2 text-sm text-gray-500">
                        Acquittée le {new Date(alert.acknowledged_at).toLocaleString()}
                      </div>
                    )}
                    {alert.resolved && (
                      <div className="mt-2 text-sm text-success-600">
                        Résolue le {new Date(alert.resolved_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="p-2 text-gray-400 hover:text-primary-600"
                      title="Acquitter"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {!alert.resolved && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="p-2 text-gray-400 hover:text-success-600"
                      title="Résoudre"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-gray-400 hover:text-danger-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          {filter === 'all' ? (
            <>
              <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune alerte</h3>
              <p className="text-gray-500">Tout fonctionne parfaitement !</p>
            </>
          ) : (
            <>
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune alerte {filter === 'unread' ? 'non lue' : 'acquittée'}
              </h3>
              <p className="text-gray-500">
                Changez les filtres pour voir d'autres alertes
              </p>
            </>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {alerts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{unreadCount}</div>
              <div className="text-sm text-gray-500">Non lues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">
                {alerts.filter(a => a.resolved).length}
              </div>
              <div className="text-sm text-gray-500">Résolues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger-600">
                {alerts.filter(a => a.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-500">Haute priorité</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;