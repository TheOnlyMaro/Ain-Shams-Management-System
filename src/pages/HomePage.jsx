import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Award, BarChart3, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/common';

export const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Course Management',
      description: 'Browse courses, access materials, and manage your enrollment',
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Assignment & Grading',
      description: 'Submit assignments and track your academic progress',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Admissions',
      description: 'Submit applications and manage your admission status',
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Analytics Dashboard',
      description: 'View comprehensive performance metrics and insights',
    },
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <h1 className="text-5xl font-bold text-secondary-900 mb-6 leading-tight">
              Welcome to <span className="text-primary-600">University Management System</span>
            </h1>
            <p className="text-xl text-secondary-600 mb-8">
              A comprehensive platform for streamlining administrative and academic processes. Manage your studies, applications, and stay connected with your university community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGetStarted}
                className="flex items-center justify-center gap-2"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                <ArrowRight className="w-5 h-5" />
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/signup')}
                  className="flex items-center justify-center gap-2"
                >
                  Sign Up Now
                  <ChevronRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-8 text-white transform hover:scale-105 transition">
              <div className="text-4xl font-bold mb-2">1000+</div>
              <p className="text-blue-100">Active Students</p>
            </div>
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-8 text-white transform hover:scale-105 transition">
              <div className="text-4xl font-bold mb-2">500+</div>
              <p className="text-purple-100">Courses</p>
            </div>
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-8 text-white transform hover:scale-105 transition">
              <div className="text-4xl font-bold mb-2">98%</div>
              <p className="text-green-100">Satisfaction Rate</p>
            </div>
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg p-8 text-white transform hover:scale-105 transition">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <p className="text-orange-100">Support</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-secondary-900 mb-4">Key Features</h2>
          <p className="text-xl text-secondary-600">
            Everything you need for academic success in one place
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              hoverable
              className="transform hover:scale-105 transition duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary-600">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-secondary-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-secondary-600">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your academic journey?</h2>
          <p className="text-primary-100 mb-8">
            Join thousands of students already using our platform
          </p>
          <Button
            variant="primary"
            size="lg"
            className="bg-white text-primary-600 hover:bg-primary-50"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/admission')}
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Apply Now'}
          </Button>
        </div>
      </section>
    </div>
  );
};
