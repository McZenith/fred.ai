import * as React from 'react';

// Card Components
const Card = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm ${className}`}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 p-6 ${className}`}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(
  ({ className = '', ...props }, ref) => (
    <p ref={ref} className={`text-sm text-gray-500 ${className}`} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center p-6 pt-0 ${className}`}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Progress Component
const Progress = React.forwardRef(
  ({ value = 0, className = '', ...props }, ref) => {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
      const timeout = setTimeout(() => setProgress(value), 100);
      return () => clearTimeout(timeout);
    }, [value]);

    return (
      <div
        ref={ref}
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}
        {...props}
      >
        <div
          className='h-full w-full flex-1 bg-blue-600 transition-all'
          style={{
            transform: `translateX(-${100 - progress}%)`,
          }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Progress,
};
