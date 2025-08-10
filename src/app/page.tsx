import Link from 'next/link';
import { ArrowRightIcon, ShieldCheckIcon, TrophyIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { StatsSection } from '@/components/landing/stats-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { CTASection } from '@/components/landing/cta-section';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* Stats Section */}
      <StatsSection />
      
      {/* Testimonials Section */}
      <TestimonialsSection />
      
      {/* Call to Action Section */}
      <CTASection />
      
      <EnhancedFooter />
    </main>
  );
}