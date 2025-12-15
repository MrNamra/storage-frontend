'use client';

import { motion } from 'framer-motion';
import { Upload, Cloud, Share2 } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload Your Files',
    description: 'Drag and drop files or use our intuitive file picker',
    color: 'text-teal-400',
  },
  {
    icon: Cloud,
    title: 'Secure Storage',
    description: 'Files are encrypted and stored across multiple secure locations',
    color: 'text-purple-600',
  },
  {
    icon: Share2,
    title: 'Share & Collaborate',
    description: 'Share files with anyone and work together in real-time',
    color: 'text-orange-400',
  },
];

export function Process() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-poppins font-bold text-gray-900">
            How It Works
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Get started with CloudVault in three simple steps
          </p>
        </motion.div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="text-center">
                <div className={`${step.color} mx-auto mb-6`}>
                  <step.icon className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-2xl font-poppins font-semibold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
              
              {/* {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-gray-200 to-gray-300 transform -translate-y-1/2" />
              )} */}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}