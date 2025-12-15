import React from 'react';
import { motion } from 'framer-motion';
import { Cloud } from 'lucide-react';

const termsData = [
  {
    title: 'User Account',
    content: 'By creating an account with CloudVault, you agree to provide accurate and current information. You are responsible for maintaining the confidentiality of your account credentials and all activities under your account.'
  },
  {
    title: 'Data Storage and Privacy',
    content: 'CloudVault ensures the highest standards of data protection. We encrypt all stored files and guarantee that your data will not be shared with third parties without your explicit consent.'
  },
  {
    title: 'Usage Restrictions',
    content: 'Users are prohibited from storing illegal, harmful, or copyrighted content without proper authorization. CloudVault reserves the right to suspend or terminate accounts that violate these terms.'
  },
  {
    title: 'Service Limitations',
    content: 'While we strive to provide uninterrupted service, CloudVault is not liable for any data loss, service interruptions, or temporary unavailability of the platform.'
  },
  {
    title: 'Subscription and Billing',
    content: 'Subscription fees are charged monthly or annually based on your selected plan. Users can upgrade, downgrade, or cancel their subscription at any time through their account settings.'
  }
];

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center items-center mb-4">
            <Cloud className="h-12 w-12 text-teal-400 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">CloudVault Terms & Conditions</h1>
          </div>
          <p className="mt-4 text-xl text-gray-600">
            Last Updated: January 2025
          </p>
        </motion.div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {termsData.map((term, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2, duration: 0.5 }}
              className={`p-6 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                {term.title}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {term.content}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-gray-500">
            By using CloudVault, you acknowledge that you have read, understood, and agree to these Terms and Conditions.
          </p>
          <p className="mt-4 text-sm text-gray-400">
            2025 CloudVault. All Rights Reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsPage;