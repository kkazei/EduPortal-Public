import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../utils/cn';

// Define the badge variants using class-variance-authority
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800",
        primary: "bg-blue-100 text-blue-800",
        secondary: "bg-purple-100 text-purple-800",
        success: "bg-green-100 text-green-800",
        warning: "bg-orange-100 text-orange-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-cyan-100 text-cyan-800",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
      outline: {
        true: "bg-transparent border",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        outline: true,
        className: "border-blue-500 text-blue-500",
      },
      {
        variant: "secondary",
        outline: true,
        className: "border-purple-500 text-purple-500",
      },
      {
        variant: "success",
        outline: true,
        className: "border-green-500 text-green-500",
      },
      {
        variant: "warning",
        outline: true,
        className: "border-orange-500 text-orange-500",
      },
      {
        variant: "danger",
        outline: true,
        className: "border-red-500 text-red-500",
      },
      {
        variant: "info",
        outline: true,
        className: "border-cyan-500 text-cyan-500",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

/**
 * Badge Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.variant - Badge variant (default, primary, secondary, success, warning, danger, info)
 * @param {string} props.size - Badge size (sm, md, lg)
 * @param {boolean} props.outline - Whether to show badge with outline style
 * @param {React.ReactNode} props.icon - Optional icon to display before badge text
 * @param {string} props.className - Additional CSS classes
 */
const Badge = ({ 
  children, 
  variant = "default", 
  size = "md",
  outline = false,
  icon,
  className,
  ...props 
}) => {
  return (
    <span 
      className={cn(
        badgeVariants({ variant, size, outline }), 
        className
      )}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;