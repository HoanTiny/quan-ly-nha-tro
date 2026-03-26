import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition min-h-[44px] min-w-[44px]',
        variant === 'primary' && 'bg-primary text-white hover:opacity-90 active:opacity-85',
        variant === 'secondary' && 'bg-secondary text-foreground hover:bg-neutral-300 active:bg-neutral-300',
        variant === 'ghost' && 'bg-transparent text-foreground hover:bg-neutral-300 active:bg-neutral-300/50',
        variant === 'outline' && 'border border-neutral-300 bg-background text-foreground hover:bg-neutral-300',
        className,
      )}
      {...props}
    />
  );
}
