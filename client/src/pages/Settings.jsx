import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  User,
  Bell,
  Mail,
  Webhook,
  Save,
  TestTube,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Shield,
  Globe
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile settings
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: false,
    email_smtp_host: '',
    email_smtp_port: 587,
    email_smtp_user: '',
    email_smtp_password: '',
    email_from: '',
    email_to: '',
    gotify_enabled: false,
    gotify_url: '',
    gotify_token: '',
    webhook_enabled: false,
    webhook_url: '',
    webhook_secret: '',
    alert_service_down: true,
    alert_service_slow: true,
    alert_update_available: true,
    alert_service_recovered: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [profileResponse, notificationResponse] = await Promise.all([
        axios.get('/api/auth/profile'),
        axios.get('/api/alerts/notification-settings')
      ]);

      setProfileData({
        username: profileResponse.data.username,
        email: profileResponse.data.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setNotificationSettings(notificationResponse.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        username: profileData.username,
        email: profileData.email
      };

      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          return;
        }
        if (profileData.newPassword.length < 6) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères');
          return;
        }
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      await updateProfile(updateData);
      
      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put('/api/alerts/notification-settings', notificationSettings);
      toast.success('Paramètres de notification mis à jour');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Erreur lors de la mise à jour des notifications');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (type) => {
    setTesting(prev => ({ ...prev, [type]: true }));

    try {
      await axios.post(`/api/alerts/test-notification/${type}`);
      toast.success(`Test ${type} envoyé avec succès`);
    } catch (error) {
      console.error(`Error testing ${type}:`, error);
      toast.error(`Erreur lors du test ${type}`);
    } finally {
      setTesting(prev => ({ ...prev, [type]: false }));
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profil', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Sécurité', icon: Shield }
  ];

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Gérez vos préférences et paramètres de compte</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Informations du profil</h3>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Changer le mot de passe</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileData.currentPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="input"
                        minLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="input"
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center space-x-2"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Alert Types */}
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Types d'alertes</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.alert_service_down}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      alert_service_down: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Service hors ligne</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.alert_service_slow}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      alert_service_slow: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Service lent</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.alert_update_available}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      alert_update_available: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Mise à jour disponible</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.alert_service_recovered}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      alert_service_recovered: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Service récupéré</span>
                </label>
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">Notifications Email</h3>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.email_enabled}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      email_enabled: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Activé</span>
                </label>
              </div>

              {notificationSettings.email_enabled && (
                <form onSubmit={handleNotificationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Serveur SMTP
                      </label>
                      <input
                        type="text"
                        value={notificationSettings.email_smtp_host}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email_smtp_host: e.target.value
                        }))}
                        className="input"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Port SMTP
                      </label>
                      <input
                        type="number"
                        value={notificationSettings.email_smtp_port}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email_smtp_port: parseInt(e.target.value)
                        }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Utilisateur SMTP
                      </label>
                      <input
                        type="email"
                        value={notificationSettings.email_smtp_user}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email_smtp_user: e.target.value
                        }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe SMTP
                      </label>
                      <input
                        type="password"
                        value={notificationSettings.email_smtp_password}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email_smtp_password: e.target.value
                        }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email expéditeur
                      </label>
                      <input
                        type="email"
                        value={notificationSettings.email_from}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email_from: e.target.value
                        }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email destinataire
                      </label>
                      <input
                        type="email"
                        value={notificationSettings.email_to}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email_to: e.target.value
                        }))}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => testNotification('email')}
                      disabled={testing.email}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      {testing.email ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      <span>Tester</span>
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {saving ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Sauvegarder</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Gotify Notifications */}
          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">Gotify</h3>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.gotify_enabled}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      gotify_enabled: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Activé</span>
                </label>
              </div>

              {notificationSettings.gotify_enabled && (
                <form onSubmit={handleNotificationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Gotify
                      </label>
                      <input
                        type="url"
                        value={notificationSettings.gotify_url}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          gotify_url: e.target.value
                        }))}
                        className="input"
                        placeholder="https://gotify.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token Gotify
                      </label>
                      <input
                        type="password"
                        value={notificationSettings.gotify_token}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          gotify_token: e.target.value
                        }))}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => testNotification('gotify')}
                      disabled={testing.gotify}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      {testing.gotify ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      <span>Tester</span>
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {saving ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Sauvegarder</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Webhook Notifications */}
          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Webhook className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">Webhook</h3>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.webhook_enabled}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      webhook_enabled: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Activé</span>
                </label>
              </div>

              {notificationSettings.webhook_enabled && (
                <form onSubmit={handleNotificationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Webhook
                      </label>
                      <input
                        type="url"
                        value={notificationSettings.webhook_url}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          webhook_url: e.target.value
                        }))}
                        className="input"
                        placeholder="https://hooks.slack.com/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secret (optionnel)
                      </label>
                      <input
                        type="password"
                        value={notificationSettings.webhook_secret}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          webhook_secret: e.target.value
                        }))}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => testNotification('webhook')}
                      disabled={testing.webhook}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      {testing.webhook ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      <span>Tester</span>
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {saving ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Sauvegarder</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Paramètres de sécurité</h3>
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Recommandations de sécurité
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Utilisez un mot de passe fort avec au moins 12 caractères</li>
                        <li>Activez les notifications pour surveiller les accès</li>
                        <li>Changez régulièrement vos mots de passe</li>
                        <li>Utilisez HTTPS pour accéder à l'application</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Dernière connexion</h4>
                  <p className="text-sm text-gray-600">
                    {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Jamais'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Compte créé</h4>
                  <p className="text-sm text-gray-600">
                    {user?.created_at ? new Date(user.created_at).toLocaleString() : 'Inconnu'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;