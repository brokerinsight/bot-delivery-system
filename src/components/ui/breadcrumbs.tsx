import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index === 0 && (
            <HomeIcon className="w-4 h-4 text-secondary-400" />
          )}
          {index > 0 && (
            <ChevronRightIcon className="w-4 h-4 text-secondary-400" />
          )}
          {index === items.length - 1 ? (
            <span className="text-secondary-600 dark:text-secondary-400 font-medium">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="text-secondary-500 hover:text-primary-600 dark:text-secondary-500 dark:hover:text-primary-400 transition-colors duration-200"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}