import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = `
    w-full sm:w-auto px-6 py-3 rounded-full text-center text-lg font-semibold transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-opacity-75
  `;

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg
      focus:ring-purple-500
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gradient-to-r from-gray-500 to-gray-600' : ''}
    `,
    secondary: `
      bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 shadow-md
      focus:ring-gray-500
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''}
    `,
    tertiary: `
      bg-yellow-500 hover:bg-yellow-600 text-gray-900 shadow-md
      focus:ring-yellow-400
      ${disabled ? 'opacity-50 cursor-not-allowed bg-yellow-700' : ''}
    `,
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };