import { Cloud, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const navigation = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
  ],
  company: [
    { name: 'About', href: '#' },
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms & Conditions', href: '/terms-conditions' },
  ],
  contact: [
    {
      value: 'hello@cloudvault.com',
      href: 'mailto:hello@cloudvault.com',
      icon: Mail,
    },
    {
      value: '+1 (800) 123-4567',
      href: 'tel:+1 (800) 123-4567',
      icon: Phone,
    },
    {
      value: '123 Main St, Anytown, USA 12345',
      icon: MapPin,
    },
  ],
  legal: [
    { name: 'Privacy', href: '#' },
    { name: 'Terms', href: '#' },
    { name: 'Cookie Policy', href: '#' },
    { name: 'Licenses', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center space-x-2">
              <Cloud className="h-8 w-8 text-teal-400" />
              <span className="font-poppins font-bold text-xl text-white">CloudVault</span>
            </div>
            <p className="mt-4 text-gray-400">
              Secure, unlimited cloud storage for all your needs. Enterprise-grade encryption meets intuitive design.
            </p>
          </div>
          <div>
            <h3 className="font-poppins font-semibold text-white">Product</h3>
            <ul className="mt-4 space-y-2">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} onClick={() => document.getElementById(item.href.substring(1))?.scrollIntoView()} className="text-gray-400 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-poppins font-semibold text-white">Company</h3>
            <ul className="mt-4 space-y-2">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className="text-gray-400 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-poppins font-semibold text-white">Contact</h3>
            <ul className="mt-4 space-y-2">
              {navigation.contact.map((item) => (
                <li key={item.value}>
                  <a href={item.href} className="text-gray-400 hover:text-white transition-colors flex items-start">
                    <item.icon className="h-5 w-5" />
                    <span className="ml-2">{item.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-center">
            © {new Date().getFullYear()} CloudVault. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}