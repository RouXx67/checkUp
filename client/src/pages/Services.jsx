import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Server,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  Database,
  Container,
  Wifi,
  Eye,
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'http',
    url: '',
    port: '',
    interval: 300,
    timeout: 30,
    description: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/monitoring/services');
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await axios.put(`/api/monitoring/services/${editingService.id}`, formData);
        toast.success('Service mis à jour avec succès');
      } else {
        await axios.post('/api/monitoring/services', formData);
        toast.success('Service ajouté avec succès');
      }
      
      setShowModal(false);
      setEditingService(null);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      type: service.type,
      url: service.url,
      port: service.port || '',
      interval: service.interval,
      timeout: service.timeout,
      description: service.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (serviceId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }

    try {
      await axios.delete(`/api/monitoring/services/${serviceId}`);
      toast.success('Service supprimé avec succès');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleTest = async (serviceId) => {
    try {
      const response = await axios.post(`/api/monitoring/services/${serviceId}/test`);
      if (response.data.success) {
        toast.success('Test réussi - Service accessible');
      } else {
        toast.error('Test échoué - Service inaccessible');
      }
    } catch (error) {
      console.error('Error testing service:', error);
      toast.error('Erreur lors du test');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'http',
      url: '',
      port: '',
      interval: 300,
      timeout: 30,
      description: ''
    });
  };

  const getServiceIcon = (type) => {
    switch (type) {
      case 'http':
      case 'https':
        return <Globe className="h-5 w-5" />;
      case 'docker':
        return <Container className="h-5 w-5" />;
      case 'proxmox':
        return <Database className="h-5 w-5" />;
      case 'ping':
        return <Wifi className="h-5 w-5" />;
      default:
        return <Server className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status, responseTime) => {
    switch (status) {
      case 'online':
        return (
          <span className="status-online">
            <CheckCircle className="h-3 w-3 mr-1" />
            En ligne {responseTime && `(${responseTime}ms)`}
          </span>
        );
      case 'offline':
        return (
          <span className="status-offline">
            <XCircle className="h-3 w-3 mr-1" />
            Hors ligne
          </span>
        );
      case 'warning':
        return (
          <span className="status-warning">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Lent {responseTime && `(${responseTime}ms)`}
          </span>
        );
      default:
        return (
          <span className="status-unknown">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Inconnu
          </span>
        );
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600">Gérez et surveillez vos services</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un service
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.id} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                  {getServiceIcon(service.type)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{service.type}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleTest(service.id)}
                  className="p-1 text-gray-400 hover:text-primary-600"
                  title="Tester le service"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(service)}
                  className="p-1 text-gray-400 hover:text-primary-600"
                  title="Modifier"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-1 text-gray-400 hover:text-danger-600"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">URL/Adresse</p>
                <p className="text-sm font-mono text-gray-900 truncate">
                  {service.url}{service.port && `:${service.port}`}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">État</p>
                  {getStatusBadge(service.status, service.response_time)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Dernière vérification</p>
                  <p className="text-xs text-gray-500">
                    {service.last_checked 
                      ? new Date(service.last_checked).toLocaleString()
                      : 'Jamais'
                    }
                  </p>
                </div>
              </div>

              {service.description && (
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-sm text-gray-900">{service.description}</p>
                </div>
              )}

              <div className="flex justify-between text-xs text-gray-500">
                <span>Intervalle: {service.interval}s</span>
                <span>Timeout: {service.timeout}s</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun service configuré</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre premier service à surveiller</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un service
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingService ? 'Modifier le service' : 'Ajouter un service'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nom</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input mt-1"
                        placeholder="Mon service"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="input mt-1"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                        <option value="ping">Ping</option>
                        <option value="docker">Docker</option>
                        <option value="proxmox">Proxmox</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">URL/Adresse</label>
                      <input
                        type="text"
                        required
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="input mt-1"
                        placeholder="https://example.com ou 192.168.1.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Port (optionnel)</label>
                      <input
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                        className="input mt-1"
                        placeholder="80, 443, 8080..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Intervalle (s)</label>
                        <input
                          type="number"
                          required
                          min="60"
                          value={formData.interval}
                          onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                          className="input mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Timeout (s)</label>
                        <input
                          type="number"
                          required
                          min="5"
                          value={formData.timeout}
                          onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                          className="input mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description (optionnelle)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input mt-1"
                        rows="3"
                        placeholder="Description du service..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn-primary sm:ml-3">
                    {editingService ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingService(null);
                      resetForm();
                    }}
                    className="btn-secondary mt-3 sm:mt-0"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;