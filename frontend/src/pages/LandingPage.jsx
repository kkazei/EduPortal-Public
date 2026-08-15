import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  BookOpen, 
  Users, 
  Award, 
  TrendingUp, 
  Bell, 
  Calendar,
  ArrowRight,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';
import { useSiteMetricsStore } from '../store/siteMetricsStore';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const { totalUnique, fetchTotal } = useSiteMetricsStore();

  const dashboardHref = useMemo(() => {
    if (!isAuthenticated) return '/login';
    const role = user?.user_role;
    if (role === 'student') return '/student-dashboard';
    if (role === 'superadmin') return '/superadmin/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/dashboard';
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchTotal().catch(()=>{});
  }, [fetchTotal]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50/30">
      {/* Navigation */}
      <nav 
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled ? 'glass shadow-xl' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center space-x-3 group animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500/20 rounded-2xl blur group-hover:bg-primary-500/30 transition-all"></div>
                <GraduationCap className="h-10 w-10 text-primary-600 relative z-10 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-display font-bold gradient-text-ocean">EduPortal</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Features</a>
              <a href="#about" className="text-gray-700 hover:text-primary-600 transition-colors font-medium">About</a>
              <Link 
                to={dashboardHref}
                className="btn-primary"
              >
                {isAuthenticated ? 'Dashboard' : 'Login'}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 animate-slide-down">
              <div className="flex flex-col space-y-3 bg-white rounded-2xl p-4 shadow-lg">
                <a 
                  href="#features" 
                  className="text-gray-700 hover:text-primary-600 transition-colors font-medium py-2 px-3 hover:bg-gray-50 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </a>
                <a 
                  href="#about" 
                  className="text-gray-700 hover:text-primary-600 transition-colors font-medium py-2 px-3 hover:bg-gray-50 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </a>
                <Link 
                  to={dashboardHref}
                  className="btn-primary text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {isAuthenticated ? 'Dashboard' : 'Login'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-300/20 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="animate-slide-in-left space-y-8">
              {/* Removed legacy badge per user request */}
              
              <h1 className="text-5xl md:text-7xl font-display font-bold text-gray-900 leading-tight">
                Transform Your
                <span className="gradient-text-ocean block mt-2">
                  Educational
                </span>
                <span className="text-gray-900">Experience</span>
              </h1>
              
              {/* Visits Badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl glass-card border border-primary-200 hover:shadow-lg transition-all">
                <TrendingUp className="h-5 w-5 text-primary-600" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Total Visits:</span>
                  <span className="text-xl font-bold gradient-text-ocean">
                    {(totalUnique || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
                A comprehensive platform for students, teachers, and administrators to manage 
                classes, track attendance, monitor grades, and stay connected.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  to={dashboardHref}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 text-white text-sm font-semibold tracking-wide shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-600/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-all"
                >
                  {isAuthenticated ? 'Dashboard' : 'Get Started'}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/student-login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold tracking-wide text-gray-700 border border-gray-200 shadow-sm hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-all"
                  >
                    Student Portal
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                )}
              </div>
              
              {/* Removed trust indicator list per user request */}
            </div>

            {/* Hero Illustration */}
            <div className="animate-slide-in-right">
              <div className="relative hover-lift">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-200/40 to-secondary-200/40 rounded-3xl transform rotate-3 blur-2xl"></div>
                <div className="relative glass-card p-8 md:p-12 shadow-card-hover border-2 border-white/50">
                  <img
                    src="/HeroImage.png"
                    alt="Educational learning environment"
                    className="w-full h-auto object-contain select-none drop-shadow-xl animate-scale-in image-float"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary-200 mb-4">
              <Sparkles className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-semibold text-primary-700">What We Offer</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4">
              Powerful <span className="gradient-text-ocean">Features</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage education effectively in one place
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <BookOpen className="h-7 w-7" />,
                title: "Class Management",
                description: "Organize classes, subjects, and schedules with ease",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: <Users className="h-7 w-7" />,
                title: "Student Tracking",
                description: "Monitor student progress and maintain comprehensive records",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: <Award className="h-7 w-7" />,
                title: "Grade Management",
                description: "Record, calculate, and track student grades efficiently",
                color: "from-green-500 to-emerald-500"
              },
              {
                icon: <Calendar className="h-7 w-7" />,
                title: "Attendance System",
                description: "Track attendance with detailed reports and analytics",
                color: "from-orange-500 to-red-500"
              },
              {
                icon: <Bell className="h-7 w-7" />,
                title: "Announcements",
                description: "Keep everyone informed with instant notifications",
                color: "from-indigo-500 to-purple-500"
              },
              {
                icon: <TrendingUp className="h-7 w-7" />,
                title: "Analytics",
                description: "Gain insights with comprehensive analytics and reports",
                color: "from-teal-500 to-cyan-500"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="card-modern hover-lift group p-8 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`h-14 w-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* About Illustration */}
            <div className="animate-slide-in-left order-2 md:order-1">
              <div className="relative hover-lift">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-3xl transform -rotate-3 blur-2xl"></div>
                <div className="relative glass-card p-8 md:p-12 shadow-card-hover border-2 border-white/50">
                  <img
                    src="/AboutImage.png"
                    alt="School building illustration"
                    className="w-full h-auto object-contain select-none drop-shadow-xl animate-scale-in image-float"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            <div className="animate-slide-in-right order-1 md:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-secondary-200">
                <GraduationCap className="h-4 w-4 text-secondary-600" />
                <span className="text-sm font-semibold text-secondary-700">About Us</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 leading-tight">
                Built for
                <span className="gradient-text block mt-2">
                  Tapinac Elementary School
                </span>
              </h2>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                EduPortal is a comprehensive educational management system designed to streamline 
                administrative tasks, enhance communication, and improve the overall learning experience.
              </p>
              
              <ul className="space-y-4">
                {[
                  { text: "Real-time updates and notifications", icon: Bell },
                  { text: "Mobile-responsive design", icon: Sparkles },
                  { text: "Secure data management", icon: Shield },
                  { text: "Role-based access control", icon: Users }
                ].map((item, index) => (
                  <li key={index} className="flex items-start text-gray-700 group">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 pt-2">
                      <span className="text-base font-medium">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-display font-bold">EduPortal</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Where Grades Meet Simplicity.
              </p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-primary-400 transition-colors inline-flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  Features
                </a></li>
                <li><a href="#about" className="hover:text-primary-400 transition-colors inline-flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  About
                </a></li>
                <li><Link to="/login" className="hover:text-primary-400 transition-colors inline-flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  Login
                </Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Resources</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-primary-400 transition-colors inline-flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  Documentation
                </a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors inline-flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  Support
                </a></li>
                <li>
                  <button 
                    onClick={() => setShowPrivacyPolicy(true)}
                    className="hover:text-primary-400 transition-colors inline-flex items-center gap-2 group"
                  >
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Contact</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2">
                  <Bell className="h-5 w-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <span>sses.eduportal@gmail.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <span>(63) 9926897132</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p className="text-sm">© 2025 Developed by Jirro Aeron Guiao for Tapinac Elementary School</p>
          </div>
        </div>
      </footer>
      
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        isOpen={showPrivacyPolicy} 
        onClose={() => setShowPrivacyPolicy(false)} 
      />
    </div>
  );
};

export default LandingPage;
