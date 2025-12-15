'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Subscribe:', email);
    setEmail('');
  };

  return (
    <footer className="bg-footer text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold tracking-tight mb-4">AVIROZE</h3>
            <p className="text-sm text-foreground/70 leading-relaxed mb-6">
              Timeless elegance for the modern professional. Crafted with care, designed to empower.
            </p>
            <div className="flex gap-4">
              <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-serif text-sm uppercase tracking-widest mb-4">Shop</h4>
            <ul className="space-y-3 text-sm text-foreground/70">
              <li><Link href="/products?category=new" className="hover:text-foreground transition-colors">New Arrivals</Link></li>
              <li><Link href="/products?category=bestsellers" className="hover:text-foreground transition-colors">Bestsellers</Link></li>
              <li><Link href="/collections/blazers" className="hover:text-foreground transition-colors">Blazers</Link></li>
              <li><Link href="/collections/trousers" className="hover:text-foreground transition-colors">Trousers</Link></li>
              <li><Link href="/collections/dresses" className="hover:text-foreground transition-colors">Dresses</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-serif text-sm uppercase tracking-widest mb-4">About</h4>
            <ul className="space-y-3 text-sm text-foreground/70">
              <li><Link href="/about" className="hover:text-foreground transition-colors">Our Story</Link></li>
              <li><Link href="/sustainability" className="hover:text-foreground transition-colors">Sustainability</Link></li>
              <li><Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
              <li><Link href="/press" className="hover:text-foreground transition-colors">Press</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-serif text-sm uppercase tracking-widest mb-4">Help</h4>
            <ul className="space-y-3 text-sm text-foreground/70">
              <li><Link href="/shipping" className="hover:text-foreground transition-colors">Shipping & Returns</Link></li>
              <li><Link href="/size-guide" className="hover:text-foreground transition-colors">Size Guide</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQs</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-foreground/10 pt-12 pb-8">
          <div className="max-w-md">
            <h4 className="font-serif text-lg font-semibold mb-2">Join the Aviroze world</h4>
            <p className="text-sm text-foreground/70 mb-4">
              Subscribe to receive updates, access to exclusive deals, and more.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:border-foreground transition-colors"
                required
              />
              <button
                type="submit"
                className="px-6 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-foreground/60">
          <p>&copy; 2025 Aviroze. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
