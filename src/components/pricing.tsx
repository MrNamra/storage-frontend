'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Personal',
    price: '$9.99',
    period: 'per month',
    description: 'Perfect for individual users',
    features: [
      'Unlimited storage',
      'Basic file sharing',
      'Mobile access',
      'Standard support',
      'Basic encryption',
    ],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$24.99',
    period: 'per month',
    description: 'Ideal for professionals and small teams',
    features: [
      'Everything in Personal, plus:',
      'Advanced sharing controls',
      'Version history',
      'Priority support',
      'Advanced encryption',
      'Team collaboration tools',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$49.99',
    period: 'per month',
    description: 'For large organizations',
    features: [
      'Everything in Professional, plus:',
      'Custom security policies',
      'Admin dashboard',
      '24/7 premium support',
      'API access',
      'Custom integration',
    ],
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-poppins font-bold text-gray-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Choose the perfect plan for your storage needs
          </p>
        </motion.div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
            >
              <div className={`h-full rounded-2xl border ${
                plan.highlighted 
                  ? 'border-purple-600 shadow-xl' 
                  : 'border-gray-200 shadow-sm'
              } p-8 bg-white`}>
                <h3 className="text-2xl font-poppins font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="ml-2 text-gray-600">{plan.period}</span>
                </div>
                <p className="mt-4 text-gray-600">{plan.description}</p>
                
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-teal-400 mr-3" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`mt-8 w-full ${
                    plan.highlighted 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : ''
                  }`}
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  Get Started
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}