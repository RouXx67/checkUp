const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
  }

  // Initialize email transporter
  initializeEmail(settings) {
    if (!settings.email_enabled || !settings.email_smtp_host) {
      this.emailTransporter = null;
      return;
    }

    this.emailTransporter = nodemailer.createTransporter({
      host: settings.email_smtp_host,
      port: settings.email_smtp_port,
      secure: settings.email_smtp_port === 465,
      auth: {
        user: settings.email_smtp_user,
        pass: settings.email_smtp_password
      }
    });
  }

  // Send email notification
  async sendEmail(settings, subject, message, priority = 'medium') {
    if (!this.emailTransporter || !settings.email_enabled) {
      throw new Error('Email non configuré');
    }

    const priorityEmoji = {
      high: '🚨',
      medium: '⚠️',
      low: 'ℹ️'
    };

    const mailOptions = {
      from: settings.email_from,
      to: settings.email_to,
      subject: `${priorityEmoji[priority]} CheckUp - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">CheckUp Alert</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Système de monitoring</p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${this.getPriorityColor(priority)};">
            <h3 style="color: #333; margin-top: 0;">${subject}</h3>
            <p style="color: #555; line-height: 1.6;">${message}</p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                Envoyé le ${new Date().toLocaleString('fr-FR')} par CheckUp
              </p>
            </div>
          </div>
        </div>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  // Send Gotify notification
  async sendGotify(settings, title, message, priority = 'medium') {
    if (!settings.gotify_enabled || !settings.gotify_url || !settings.gotify_token) {
      throw new Error('Gotify non configuré');
    }

    const priorityMap = {
      low: 2,
      medium: 5,
      high: 8
    };

    const payload = {
      title: `CheckUp - ${title}`,
      message: message,
      priority: priorityMap[priority] || 5
    };

    await axios.post(
      `${settings.gotify_url}/message`,
      payload,
      {
        headers: {
          'X-Gotify-Key': settings.gotify_token,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Send webhook notification
  async sendWebhook(settings, title, message, priority = 'medium', alertType = 'alert') {
    if (!settings.webhook_enabled || !settings.webhook_url) {
      throw new Error('Webhook non configuré');
    }

    const payload = {
      title: `CheckUp - ${title}`,
      message: message,
      priority: priority,
      type: alertType,
      timestamp: new Date().toISOString(),
      source: 'CheckUp'
    };

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CheckUp/1.0'
    };

    // Add signature if secret is configured
    if (settings.webhook_secret) {
      const signature = crypto
        .createHmac('sha256', settings.webhook_secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-CheckUp-Signature'] = `sha256=${signature}`;
    }

    await axios.post(settings.webhook_url, payload, { headers });
  }

  // Send test notification
  async sendTestNotification(type, settings) {
    const testTitle = 'Test de notification';
    const testMessage = `Ceci est un test de notification ${type} depuis CheckUp. Si vous recevez ce message, la configuration fonctionne correctement.`;

    switch (type) {
      case 'email':
        await this.sendEmail(settings, testTitle, testMessage, 'low');
        break;
      case 'gotify':
        await this.sendGotify(settings, testTitle, testMessage, 'low');
        break;
      case 'webhook':
        await this.sendWebhook(settings, testTitle, testMessage, 'low', 'test');
        break;
      default:
        throw new Error('Type de notification non supporté');
    }
  }

  // Send alert notification to all enabled channels
  async sendAlert(settings, alert) {
    const promises = [];

    // Check if alert type is enabled
    const alertTypeEnabled = this.isAlertTypeEnabled(settings, alert.type);
    if (!alertTypeEnabled) {
      return;
    }

    if (settings.email_enabled) {
      this.initializeEmail(settings);
      promises.push(
        this.sendEmail(settings, alert.title, alert.message, alert.priority)
          .catch(err => console.error('Email notification failed:', err))
      );
    }

    if (settings.gotify_enabled) {
      promises.push(
        this.sendGotify(settings, alert.title, alert.message, alert.priority)
          .catch(err => console.error('Gotify notification failed:', err))
      );
    }

    if (settings.webhook_enabled) {
      promises.push(
        this.sendWebhook(settings, alert.title, alert.message, alert.priority, alert.type)
          .catch(err => console.error('Webhook notification failed:', err))
      );
    }

    await Promise.allSettled(promises);
  }

  // Check if alert type is enabled in settings
  isAlertTypeEnabled(settings, alertType) {
    switch (alertType) {
      case 'service_down':
        return settings.alert_service_down;
      case 'service_slow':
        return settings.alert_service_slow;
      case 'update_available':
        return settings.alert_update_available;
      case 'service_recovered':
        return settings.alert_service_recovered;
      default:
        return true;
    }
  }

  // Get priority color for styling
  getPriorityColor(priority) {
    switch (priority) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  }
}

module.exports = new NotificationService();