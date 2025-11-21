import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, FormInput, Alert, LoadingSpinner } from '../../components/common';
import { validateEmail, validateForm } from '../../utils/validation';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationRules = {
      email: { required: true, type: 'email' },
      password: { required: true, type: 'password' },
    };

    const newErrors = validateForm(formData, validationRules);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        // call login through context which will use backend when available
        const user = await login({ email: formData.email, password: formData.password });
        if (user) {
          setSuccessMessage('Login successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setErrorMessage('Login failed.');
        }
      } catch (error) {
        setErrorMessage('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800">Welcome Back</h1>
            <p className="text-secondary-600 mt-2">Sign in to your account</p>
          </div>

          {errorMessage && (
            <Alert
              type="error"
              title="Login Error"
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Login As
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

            <FormInput
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@gmail.com"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              required
              icon={<Mail className="w-5 h-5" />}
            />

            <FormInput
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              required
              icon={<Lock className="w-5 h-5" />}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-secondary-600 hover:text-secondary-800 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 mr-2 rounded" />
                Remember me
              </label>
              <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </a>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? <LoadingSpinner /> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-secondary-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign Up
              </Link>
            </p>
          </div>
        </Card>


      </div>
    </div>
  );
};
