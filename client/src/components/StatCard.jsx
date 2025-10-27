import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'primary', trend, subtitle }) => {
  const getColorClasses = (color) => {
    switch (color) {
      case 'success':
        return 'text-success-600 bg-success-100';
      case 'warning':
        return 'text-warning-600 bg-warning-100';
      case 'danger':
        return 'text-danger-600 bg-danger-100';
      case 'primary':
      default:
        return 'text-primary-600 bg-primary-100';
    }
  };

  const getTrendColor = (trend) => {
    if (!trend) return '';
    return trend > 0 ? 'text-success-600' : trend < 0 ? 'text-danger-600' : 'text-gray-600';
  };

  return (
    <div className="card p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {trend !== undefined && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${getTrendColor(trend)}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </div>
              )}
            </dd>
            {subtitle && (
              <dd className="text-sm text-gray-600 mt-1">{subtitle}</dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StatCard;