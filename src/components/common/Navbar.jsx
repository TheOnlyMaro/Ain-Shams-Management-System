import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, userRole, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const navigationLinks = {
    student: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Courses', href: '/courses' },
      { label: 'Assignments', href: '/assignments' },
      { label: 'Grades', href: '/grades' },
      { label: 'Messages', href: '/messages' }, 
      { label: 'Announcements', href: '/announcements' },
    ],
    admin: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Applications', href: '/admin/applications' },
      { label: 'Messages', href: '/messages' },
      { label: 'Announcements', href: '/admin/announcements' },
      { label: 'Course Management', href: '/admin/courses' },
    ],
    staff: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Courses', href: '/staff/courses' },
      { label: 'Materials', href: '/staff/materials' },
      { label: 'Grades', href: '/staff/grades' },
      { label: 'Messages', href: '/messages' },
      { label: 'Announcements', href: '/admin/announcements' },
    ],
    parent: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Messages', href: '/messages' },
      { label: 'Announcements', href: '/announcements' },
    ],
  };

  const currentLinks = navigationLinks[userRole] || [];

  return (
    <nav className="bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 font-bold text-xl hover:text-primary-100 transition">
            <Home className="w-6 h-6" />
            <span>ASMS</span>
          </Link>

          <div className="hidden md:flex space-x-1">
            <Link
              to="/admission"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition"
            >
              Admission
            </Link>
            {isAuthenticated && currentLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-3">
                <User className="w-4 h-4" />
                <span className="text-sm">{user?.name || 'User'}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md bg-primary-700 hover:bg-primary-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
            {!isAuthenticated && (
              <div className="hidden md:flex space-x-2">
                <Link to="/login" className="px-3 py-2 rounded-md hover:bg-primary-700 transition">
                  Login
                </Link>
                <Link to="/signup" className="px-3 py-2 rounded-md bg-white text-primary-600 font-medium hover:bg-primary-50 transition">
                  Sign Up
                </Link>
              </div>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-primary-700 transition"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-3 border-t border-primary-700">
            <Link
              to="/admission"
              className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Admission
            </Link>
            {isAuthenticated && (
              <>
                <div className="px-3 py-2 text-sm font-medium mb-2">{user?.name || 'User'}</div>
                {currentLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
            {!isAuthenticated && (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
