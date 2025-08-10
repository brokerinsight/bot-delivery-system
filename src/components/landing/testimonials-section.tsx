'use client';

import { motion } from 'framer-motion';
import { StarIcon } from '@heroicons/react/24/solid';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Professional Trader',
      image: '👩‍💼',
      content: 'These trading bots have completely transformed my trading strategy. The results speak for themselves - consistent profits with minimal risk.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Forex Enthusiast',
      image: '👨‍💻',
      content: 'Incredible automation and performance. I can now trade 24/7 without constantly monitoring the markets. Highly recommended!',
      rating: 5,
    },
    {
      name: 'Emma Rodriguez',
      role: 'Investment Advisor',
      image: '👩‍🏫',
      content: 'The AI-powered features are exceptional. My clients are seeing better returns than ever before with these sophisticated algorithms.',
      rating: 5,
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-800 dark:text-secondary-200 mb-6">
            What Our <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">Traders Say</span>
          </h2>
          <p className="text-lg text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto">
            Join thousands of satisfied traders who have transformed their trading experience with our premium bots.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-8 rounded-2xl hover-lift"
            >
              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-secondary-600 dark:text-secondary-300 mb-6 leading-relaxed italic">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-2xl mr-4">
                  {testimonial.image}
                </div>
                <div>
                  <div className="font-semibold text-secondary-800 dark:text-secondary-200">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-secondary-500 dark:text-secondary-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}