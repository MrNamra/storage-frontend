'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2" role='button' onClick={() => window.location.href = '/'}>
            <Cloud className="h-8 w-8 text-teal-400" />
            <span className="font-poppins font-bold text-xl">CloudVault</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="#features" onClick={() => document.getElementById('features')?.scrollIntoView()} className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link to="#how-it-works" onClick={() => document.getElementById('how-it-works')?.scrollIntoView()} className="text-gray-600 hover:text-gray-900 transition-colors">How it Works</Link>
            <Link to="#pricing" onClick={() => document.getElementById('pricing')?.scrollIntoView()} className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup" className='bg-purple-600 hover:bg-purple-700'>Sign up</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}