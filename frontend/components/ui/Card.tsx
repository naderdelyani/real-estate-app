import { type HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

/** Base card container with optional hover elevation. */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }>(
  ({ hoverable = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'bg-white rounded-2xl shadow-card overflow-hidden',
        hoverable && 'transition-shadow hover:shadow-card-hover',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

/** Padded header section inside a Card. */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('px-6 py-4 border-b border-gray-100', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

/** Main content area inside a Card. */
export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('px-6 py-5', className)} {...props} />
  ),
);
CardBody.displayName = 'CardBody';

/** Footer section inside a Card, typically for actions. */
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('px-6 py-4 bg-gray-50 border-t border-gray-100', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
