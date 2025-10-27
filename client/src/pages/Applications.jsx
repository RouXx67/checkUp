import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Github,
  ArrowUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'github',
    repository: '',
    current_version: '',
    description: '',
    auto_check: true
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await axios.get('/api/updates/applications');
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Erreur lors du chargement des applications');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingApp) {
        await axios.put(`/api/updates/applications/${editingApp.id}`, formData);
        toast.success('Application mise à jour avec succès');
      } else {
        await axios.post('/api/updates/applications', formData);
        toast.success('Application ajoutée avec succès');
      }
      
      setShowModal(false);
      setEditingApp(null);
      resetForm();
      fetchApplications();
    } catch (error) {
      console.error('Error saving application:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (app) => {
    setEditingApp(app);
    setFormData({
      name: app.name,
      type: app.type,
      repository: app.repository,
      current_version: app.current_version,
      description: app.description || '',
      auto_check: app.auto_check
    });
    setShowModal(true);
  };

  const handleDelete = async (appId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette application ?')) {
      return;
    }

    try {
      await axios.delete(`/api/updates/applications/${appId}`);
      toast.success('Application supprimée avec succès');
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCheckUpdate = async (appId) => {
    try {
      const response = await axios.post(`/api/updates/applications/${appId}/check`);
      if (response.data.hasUpdate) {
        toast.success('Nouvelle version disponible !');
      } else {
        toast.success('Application à jour');
      }
      fetchApplications();
    } catch (error) {
      console.error('Error checking update:', error);
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleCheckAllUpdates = async () => {
    setCheckingUpdates(true);
    try {
      await axios.post('/api/updates/check-all');
      toast.success('Vérification terminée');
      fetchApplications();
    } catch (error) {
      console.error('Error checking all updates:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setCheckingUpdates(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'github',
      repository: '',
      current_version: '',
      description: '',
      auto_check: true
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'github':
        return <Github className="h-5 w-5" />;
      case 'docker':
        return <Package className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getUpdateBadge = (app) => {
    if (app.hasUpdate) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
          <ArrowUp className="h-3 w-3 mr-1" />
          Mise à jour disponible
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        À jour
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">Suivez les mises à jour de vos applications</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCheckAllUpdates}
            disabled={checkingUpdates}
            className="btn-secondary"
          >
            {checkingUpdates ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Vérifier tout
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une application
          </button>
        </div>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((app) => (
          <div key={app.id} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                  {getTypeIcon(app.type)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{app.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{app.type}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleCheckUpdate(app.id)}
                  className="p-1 text-gray-400 hover:text-primary-600"
                  title="Vérifier les mises à jour"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(app)}
                  className="p-1 text-gray-400 hover:text-primary-600"
                  title="Modifier"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(app.id)}
                  className="p-1 text-gray-400 hover:text-danger-600"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Dépôt/Source</p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-mono text-gray-900 truncate flex-1">
                    {app.repository}
                  </p>
                  {app.type === 'github' && (
                    <a
                      href={`https://github.com/${app.repository}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Version actuelle</p>
                  <p className="text-sm font-mono text-gray-900">{app.current_version}</p>
                </div>
                {app.latest_version && app.latest_version !== app.current_version && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Dernière version</p>
                    <p className="text-sm font-mono text-primary-600">{app.latest_version}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">État</p>
                  {getUpdateBadge(app)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Dernière vérification</p>
                  <p className="text-xs text-gray-500">
                    {app.last_checked 
                      ? new Date(app.last_checked).toLocaleString()
                      : 'Jamais'
                    }
                  </p>
                </div>
              </div>

              {app.description && (
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-sm text-gray-900">{app.description}</p>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="flex items-center">
                  {app.auto_check ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1 text-success-500" />
                      Vérification auto
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1 text-warning-500" />
                      Vérification manuelle
                    </>
                  )}
                </span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Ajouté {new Date(app.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune application configurée</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre première application à suivre</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une application
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
                    {editingApp ? 'Modifier l\'application' : 'Ajouter une application'}
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
                        placeholder="Mon Application"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="input mt-1"
                      >
                        <option value="github">GitHub</option>
                        <option value="docker">Docker Hub</option>
                        <option value="custom">API Personnalisée</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {formData.type === 'github' ? 'Dépôt GitHub' : 
                         formData.type === 'docker' ? 'Image Docker' : 'URL API'}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.repository}
                        onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
                        className="input mt-1"
                        placeholder={
                          formData.type === 'github' ? 'owner/repository' :
                          formData.type === 'docker' ? 'library/nginx' : 'https://api.example.com/version'
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Version actuelle</label>
                      <input
                        type="text"
                        required
                        value={formData.current_version}
                        onChange={(e) => setFormData({ ...formData, current_version: e.target.value })}
                        className="input mt-1"
                        placeholder="v1.0.0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description (optionnelle)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input mt-1"
                        rows="3"
                        placeholder="Description de l'application..."
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto_check"
                        checked={formData.auto_check}
                        onChange={(e) => setFormData({ ...formData, auto_check: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="auto_check" className="ml-2 block text-sm text-gray-900">
                        Vérification automatique des mises à jour
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn-primary sm:ml-3">
                    {editingApp ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingApp(null);
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

export default Applications;