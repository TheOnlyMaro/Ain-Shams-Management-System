export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 8;
};

export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateForm = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const value = data[field];
    const rule = rules[field];

    if (rule.required && !value) {
      errors[field] = `${field} is required`;
    } else if (value && rule.type === 'email' && !validateEmail(value)) {
      errors[field] = 'Invalid email format';
    } else if (value && rule.type === 'password' && !validatePassword(value)) {
      errors[field] = 'Password must be at least 8 characters';
    } else if (value && rule.type === 'phone' && !validatePhoneNumber(value)) {
      errors[field] = 'Invalid phone number format';
    } else if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    } else if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
    }
  });

  return errors;
};

export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};
