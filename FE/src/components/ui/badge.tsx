import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'secondary' | 'success' | 'warning' | 'destructive';
};

export function Badge({
  className,
  variant = 'secondary',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variant === 'secondary' && 'bg-neutral-300 text-neutral-700',
        variant === 'success' && 'bg-success-light text-success-dark',
        variant === 'warning' && 'bg-warning-pale text-warning',
        variant === 'destructive' && 'bg-error-pale text-error',
        className,
      )}
      {...props}
    />
  );
}
