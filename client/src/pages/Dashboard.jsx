import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Server,
  Package,
  Bell,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Clock
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    services: { total: 0, online: 0, offline: 0 },
    applications: { total: 0, updates: 0 },
    alerts: { total: 0, unread: 0 }
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [servicesRes, applicationsRes, alertsRes, updatesRes] = await Promise.all([
        axios.get('/api/monitoring/services'),
        axios.get('/api/updates/applications'),
        axios.get('/api/alerts'),
        axios.get('/api/updates/history?limit=5')
      ]);

      // Calculate service stats
      const services = servicesRes.data;
      const serviceStats = {
        total: services.length,
        online: services.filter(s => s.status === 'online').length,
        offline: services.filter(s => s.status === 'offline').length
      };

      // Calculate application stats
      const applications = applicationsRes.data;
      const appStats = {
        total: applications.length,
        updates: applications.filter(app => app.hasUpdate).length
      };

      // Calculate alert stats
      const alerts = alertsRes.data;
      const alertStats = {
        total: alerts.length,
        unread: alerts.filter(alert => !alert.acknowledged).length
      };

      setStats({
        services: serviceStats,
        applications: appStats,
        alerts: alertStats
      });

      setRecentAlerts(alerts.slice(0, 5));
      setRecentUpdates(updatesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => {
    const colorClasses = {
      primary: 'bg-primary-50 text-primary-600',
      success: 'bg-success-50 text-success-600',
      danger: 'bg-danger-50 text-danger-600',
      warning: 'bg-warning-50 text-warning-600'
    };

    return (
      <div className="card p-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const AlertItem = ({ alert }) => {
    const getAlertIcon = (type) => {
      switch (type) {
        case 'service_down':
          return <XCircle className="h-4 w-4 text-danger-500" />;
        case 'service_slow':
          return <AlertTriangle className="h-4 w-4 text-warning-500" />;
        case 'update_available':
          return <Package className="h-4 w-4 text-primary-500" />;
        default:
          return <Bell className="h-4 w-4 text-gray-500" />;
      }
    };

    return (
      <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
        {getAlertIcon(alert.type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {alert.title}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {alert.message}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          <Clock className="h-3 w-3 inline mr-1" />
          {new Date(alert.created_at).toLocaleTimeString()}
        </div>
      </div>
    );
  };

  const UpdateItem = ({ update }) => (
    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
      <Package className="h-4 w-4 text-primary-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {update.application_name}
        </p>
        <p className="text-sm text-gray-500">
          {update.old_version} → {update.new_version}
        </p>
      </div>
      <div className="text-xs text-gray-400">
        <Clock className="h-3 w-3 inline mr-1" />
        {new Date(update.checked_at).toLocaleDateString()}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Tableau de bord CheckUp</h1>
        <p className="text-primary-100">
          Vue d'ensemble de vos services et applications
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Services Total"
          value={stats.services.total}
          subtitle={`${stats.services.online} en ligne, ${stats.services.offline} hors ligne`}
          icon={Server}
          color="primary"
        />
        <StatCard
          title="Services En Ligne"
          value={stats.services.online}
          subtitle={`${Math.round((stats.services.online / stats.services.total) * 100) || 0}% disponibilité`}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Applications"
          value={stats.applications.total}
          subtitle={`${stats.applications.updates} mises à jour disponibles`}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Alertes"
          value={stats.alerts.unread}
          subtitle={`${stats.alerts.total} total`}
          icon={Bell}
          color={stats.alerts.unread > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Alertes Récentes</h3>
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {recentAlerts.length > 0 ? (
              <div className="space-y-2">
                {recentAlerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-4" />
                <p className="text-gray-500">Aucune alerte récente</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Mises à Jour Récentes</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {recentUpdates.length > 0 ? (
              <div className="space-y-2">
                {recentUpdates.map((update) => (
                  <UpdateItem key={update.id} update={update} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune mise à jour récente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">État du Système</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900">Système Opérationnel</span>
            </div>
            <div className="text-sm text-gray-500">
              Dernière vérification: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;