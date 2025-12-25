import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, FormInput, FormSelect, Alert, LoadingSpinner } from '../../components/common';
import { validateEmail, validateForm, validatePhoneNumber } from '../../utils/validation';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, loading } = useAuth();
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    specialInfo: '',
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  }, [errors]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationRules = {
      name: { required: true, minLength: 2 },
      email: { required: true, type: 'email' },
      password: { required: true, type: 'password' },
      phone: { required: true, type: 'phone' },
      specialInfo: { required: role !== 'parent' },
    };

    let newErrors = validateForm(formData, validationRules);

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const userData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role,
          specialInfo: formData.specialInfo,
          staffType: role === 'staff' ? formData.specialInfo : undefined,
          createdAt: new Date().toISOString(),
          password: formData.password,
        };
        const created = await signup(userData);
        if (created) {
          setSuccessMessage('Account created successfully! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setErrorMessage('Signup failed');
        }
      } catch (error) {
        setErrorMessage('Signup failed. Please try again.');
      }
    }
  };

  const getSpecialInfoLabel = () => {
    switch (role) {
      case 'student':
        return 'Student ID (or leave blank if new)';
      case 'admin':
        return 'Employee ID';
      case 'staff':
        return 'Staff ID';
      case 'parent':
        return 'Student Name (Relation)';
      default:
        return 'Additional Information';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <Card className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800">Join Our University</h1>
            <p className="text-secondary-600 mt-2">Create your account to get started</p>
          </div>

          {errorMessage && (
            <Alert
              type="error"
              title="Signup Error"
              message={errorMessage}
              onClose={() => setErrorMessage('')}
              dismissible
              className="mb-4"
            />
          )}

          {successMessage && (
            <Alert
              type="success"
              title="Success"
              message={successMessage}
              dismissible={false}
              className="mb-4"
            />
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Register As
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="student">Student</option>
                <option value="admin">Administrator</option>
                <option value="staff">Staff</option>
                <option value="parent">Parent</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Full Name"
                name="name"
                type="text"
                placeholder="Ahmed Hazem"
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
                required
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                placeholder="you@gmail.com"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                required
              />

              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
                required
              />
            </div>

            <FormInput
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="+2 0100 000 0000"
              value={formData.phone}
              onChange={handleInputChange}
              error={errors.phone}
              required
            />

            <FormInput
              label={getSpecialInfoLabel()}
              name="specialInfo"
              type="text"
              placeholder="Enter information"
              value={formData.specialInfo}
              onChange={handleInputChange}
              error={errors.specialInfo}
              required={role !== 'parent'}
            />

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-secondary-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
