import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, BookOpen, School, GraduationCap, Loader } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/Input";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";
import { useAuthStore } from "../../store/authStore";

const SignUpPage = () => {
  const [user_fullname, setUserFullname] = useState("");
  const [user_email, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const { signup, error, isLoading } = useAuthStore();

  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      if (!user_fullname || !user_email || !password) {
        throw new Error("Please fill all required fields");
      }

      await signup(user_email, password, user_fullname);
      navigate("/dashboard"); // Navigate to the dashboard after successful signup
    } catch (error) {
      console.log(error);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6">
      <div className="absolute top-6 left-6 flex items-center">
        <BookOpen className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-blue-800 ml-2">EduPortal</h1>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col md:flex-row w-full max-w-5xl overflow-hidden rounded-2xl shadow-xl"
      >
        {/* Left column - Form */}
        <div className="w-full md:w-1/2 bg-white p-8 sm:p-12">
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-600">Join our educational community</p>
          </motion.div>

          <form onSubmit={handleSignUp}>
            <motion.div variants={itemVariants}>
              <div className="mb-5">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  icon={User}
                  type="text"
                  placeholder="John Doe"
                  value={user_fullname}
                  onChange={(e) => setUserFullname(e.target.value)}
                  className="focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  icon={Mail}
                  type="email"
                  placeholder="name@school.edu"
                  value={user_email}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <Input
                  id="password"
                  icon={Lock}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-6">
              <PasswordStrengthMeter password={password} />
              <p className="text-xs text-gray-500 mt-1">
                Use 8+ characters with a mix of letters, numbers, and symbols
              </p>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border-l-4 border-red-500 p-4 mb-6"
              >
                <div className="flex">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </motion.button>
            </motion.div>
          </form>

          <motion.div 
            variants={itemVariants}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 font-medium hover:text-blue-800">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Right column - Educational illustration */}
        <div className="hidden md:flex md:w-1/2 bg-blue-600 p-8 justify-center items-center">
          <div className="text-center">
            <motion.div 
              variants={itemVariants}
              className="flex justify-center mb-6"
            >
              <School className="h-24 w-24 text-white" />
            </motion.div>
            <motion.h2 
              variants={itemVariants}
              className="text-3xl font-bold text-white mb-4"
            >
              Join Our School Portal
            </motion.h2>
            <motion.p 
              variants={itemVariants}
              className="text-blue-100 text-lg max-w-sm mx-auto"
            >
              Create an account to access educational resources, track academic progress, and stay connected with our school community.
            </motion.p>
            <motion.div 
              variants={itemVariants}
              className="mt-8 grid grid-cols-2 gap-4"
            >
              <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                <GraduationCap className="h-8 w-8 text-white mx-auto mb-2" />
                <h3 className="font-medium text-white">Academic Tracking</h3>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                <BookOpen className="h-8 w-8 text-white mx-auto mb-2" />
                <h3 className="font-medium text-white">Learning Resources</h3>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUpPage;