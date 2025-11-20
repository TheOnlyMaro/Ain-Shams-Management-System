import React from 'react';

export const FormInput = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-secondary-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}
    </div>
  );
};

export const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-secondary-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}
    </div>
  );
};

export const FormTextarea = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  className = '',
  disabled = false,
  rows = 4,
}) => {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-secondary-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 resize-none ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}
    </div>
  );
};

export const FormCheckbox = ({
  label,
  name,
  checked,
  onChange,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
      />
      {label && (
        <label htmlFor={name} className="ml-2 text-sm font-medium text-secondary-700">
          {label}
        </label>
      )}
    </div>
  );
};
