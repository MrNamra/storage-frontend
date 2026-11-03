import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, ArrowLeft, Shield, Lock, HardDrive, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const termsData = [
  {
    icon: Lock,
    title: '1. User Account & Security',
    content: 'By creating an account with CloudVault, you agree to provide accurate registration information. You are solely responsible for maintaining the confidentiality of your account credentials, password, and for all activities that occur under your account.'
  },
  {
    icon: HardDrive,
    title: '2. Acceptable Use',
    content: 'CloudVault is provided for storing personal files, photos, videos, and documents. You agree not to use the service to store, transmit, or share malicious software, unauthorized copyrighted material, or any content that violates applicable local or international laws.'
  },
  {
    icon: Shield,
    title: '3. Data Privacy & Ownership',
    content: 'You retain full ownership of all data and media you store in your cloud drives. Your files are private and accessible only by your account or through specific drive share links you create. We do not sell, rent, or monetize your personal files.'
  },
  {
    icon: FileText,
    title: '4. Service Availability & Disclaimers',
    content: 'CloudVault is provided on an "as-is" and "as-available" basis. While we implement robust streaming and storage infrastructure, we recommend maintaining external backups for essential records. CloudVault is not liable for incidental disruptions or data loss beyond our operational control.'
  }
];

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation & Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-teal-50 text-teal-600 mb-4 border border-teal-100">
              <Cloud className="h-8 w-8 text-teal-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-poppins text-gray-900">
              CloudVault Terms & Privacy
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Simple, transparent guidelines for using your personal cloud vault
            </p>
          </motion.div>
        </div>

        {/* Terms Cards */}
        <div className="space-y-4">
          {termsData.map((term, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <term.icon className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {term.title}
                </h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed pl-11">
                {term.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-10 text-center text-xs text-gray-400 space-y-2">
          <p>
            By accessing or registering with CloudVault, you agree to these terms.
          </p>
          <p>© {new Date().getFullYear()} CloudVault. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
