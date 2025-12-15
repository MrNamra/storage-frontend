'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Share2, Clock, Cloud, Lock } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Military-grade encryption for all your stored files',
    color: 'text-teal-400',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized upload and download speeds worldwide',
    color: 'text-purple-600',
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    description: 'Share files and folders with customizable permissions',
    color: 'text-orange-400',
  },
  {
    icon: Clock,
    title: 'Version History',
    description: 'Track changes and restore previous versions anytime',
    color: 'text-blue-400',
  },
  {
    icon: Cloud,
    title: 'Auto Sync',
    description: 'Real-time synchronization across all your devices',
    color: 'text-purple-600',
  },
  {
    icon: Lock,
    title: 'Access Control',
    description: 'Granular permissions and team management',
    color: 'text-teal-400',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.h2 
            className="text-4xl font-poppins font-bold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Powerful Features for Your Storage Needs
          </motion.h2>
          <motion.p 
            className="mt-4 text-xl text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Everything you need to store, manage, and share your files securely
          </motion.p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="relative group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="h-full bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300">
                <div className={`${feature.color} mb-5`}>
                  <feature.icon className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-poppins font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}