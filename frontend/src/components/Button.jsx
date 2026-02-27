import React from 'react';
import { Link } from 'react-router-dom';

const VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
};

const SIZE_CLASS = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

/**
 * Reusable button component that keeps styling consistent.
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'danger'
 * - size: 'sm' | 'md' | 'lg'
 * - loading: boolean (disables + aria-busy)
 * - loadingText: string
 * - to: string (renders a react-router Link)
 * - href: string (renders an anchor)
 * - fullWidth: boolean
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  disabled = false,
  type = 'button',
  onClick,
  to,
  href,
  fullWidth = false,
  className = '',
  style,
  ...rest
}) {
  const isDisabled = disabled || loading;
  const classes = [
    'btn',
    VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
    SIZE_CLASS[size] ?? '',
    fullWidth ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = loading ? (loadingText ?? children) : children;

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        style={style}
        onClick={handleClick}
        aria-disabled={isDisabled || undefined}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        style={style}
        onClick={handleClick}
        aria-disabled={isDisabled || undefined}
        {...rest}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      style={style}
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}

