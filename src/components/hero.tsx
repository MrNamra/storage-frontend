'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Cloud, Upload, Lock } from 'lucide-react';

export function Hero() {
  return (
    <div className="relative min-h-screen flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-purple-50 -z-10" />
      
      {/* Floating background elements */}
      <motion.div
        className="absolute inset-0 overflow-hidden -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-400/10 rounded-full"
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full"
          animate={{
            y: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-poppins font-bold text-5xl lg:text-6xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-purple-600">
              Unlimited Storage for Your Digital World
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              Store, share, and secure your files with enterprise-grade encryption. 
              No limits, no compromises.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline">
                See How It Works
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-purple-400/20 rounded-2xl transform rotate-3" />
              <div className="relative bg-white p-8 rounded-2xl shadow-xl">
                <div className="flex items-center justify-center space-x-6">
                  <motion.div
                    className="flex flex-col items-center"
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Upload className="h-12 w-12 text-teal-400" />
                    <span className="mt-2 text-sm text-gray-600">Upload</span>
                  </motion.div>
                  <motion.div
                    className="flex flex-col items-center"
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: 0.3,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Cloud className="h-12 w-12 text-purple-400" />
                    <span className="mt-2 text-sm text-gray-600">Store</span>
                  </motion.div>
                  <motion.div
                    className="flex flex-col items-center"
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: 0.6,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Lock className="h-12 w-12 text-orange-400" />
                    <span className="mt-2 text-sm text-gray-600">Secure</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}