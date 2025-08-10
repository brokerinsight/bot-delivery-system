'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { StarIcon, UserIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  content: string;
  verified: boolean;
}

// Mock reviews data (replace with real data from database)
const mockReviews: Review[] = [
  {
    id: '1',
    author: 'TradingPro247',
    rating: 5,
    date: '2024-01-15',
    content: 'Excellent bot! Made consistent profits since day one. The risk management is superb and the setup was incredibly easy.',
    verified: true
  },
  {
    id: '2',
    author: 'BinaryMaster',
    rating: 4,
    date: '2024-01-10',
    content: 'Good performance overall. Had some losses initially but once I understood the settings, it became very profitable.',
    verified: true
  },
  {
    id: '3',
    author: 'DerivTrader99',
    rating: 5,
    date: '2024-01-08',
    content: 'Best trading bot I\'ve ever used! Customer support is amazing and the documentation is very detailed.',
    verified: false
  }
];

export function ProductReviews() {
  const [reviews] = useState<Review[]>(mockReviews);
  const [sortBy, setSortBy] = useState<'newest' | 'rating'>('newest');

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const totalReviews = reviews.length;

  const ratingDistribution = Array.from({ length: 5 }, (_, i) => {
    const stars = 5 - i;
    const count = reviews.filter(review => review.rating === stars).length;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { stars, count, percentage };
  });

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return b.rating - a.rating;
  });

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star}>
            {star <= rating ? (
              <StarIcon className={`${sizeClass} text-yellow-400`} />
            ) : (
              <StarOutlineIcon className={`${sizeClass} text-gray-300 dark:text-gray-600`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Reviews Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
          Customer Reviews
        </h2>
        
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            {renderStars(Math.round(averageRating), 'md')}
            <span className="text-xl font-bold text-secondary-800 dark:text-secondary-200">
              {averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-secondary-600 dark:text-secondary-400">
            Based on {totalReviews} reviews
          </span>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="font-semibold text-secondary-800 dark:text-secondary-200">
            Rating Breakdown
          </h3>
          {ratingDistribution.map(({ stars, count, percentage }) => (
            <div key={stars} className="flex items-center space-x-3">
              <span className="text-sm text-secondary-600 dark:text-secondary-400 w-8">
                {stars}★
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-secondary-600 dark:text-secondary-400 w-8">
                {count}
              </span>
            </div>
          ))}
        </div>

        {/* Review Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-secondary-800 dark:text-secondary-200">
              Reviews ({totalReviews})
            </h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'rating')}
              className="px-3 py-1 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-800 dark:text-secondary-200 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {sortedReviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold text-secondary-800 dark:text-secondary-200">
                      {review.author}
                    </h4>
                    {review.verified && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-secondary-500 dark:text-secondary-500">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="mb-3">
                  {renderStars(review.rating)}
                </div>
                
                <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                  {review.content}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Review CTA */}
      <div className="text-center pt-8 border-t border-secondary-200 dark:border-secondary-700">
        <p className="text-secondary-600 dark:text-secondary-400 mb-4">
          Have you used this bot? Share your experience!
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105">
          Write a Review
        </button>
      </div>
    </motion.div>
  );
}