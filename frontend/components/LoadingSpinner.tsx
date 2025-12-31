interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'black' | 'white' | 'gray' | 'blue';
  text?: string;
  subText?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  color = 'black',
  text,
  subText,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  const colorClasses = {
    black: 'border-gray-200 border-t-black',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-300 border-t-gray-600',
    blue: 'border-blue-200 border-t-blue-600',
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
      ></div>
      {text && (
        <p className={`mt-3 font-medium ${color === 'white' ? 'text-white' : 'text-gray-900'}`}>
          {text}
        </p>
      )}
      {subText && (
        <p className={`mt-2 text-sm ${color === 'white' ? 'text-white/80' : 'text-gray-500'}`}>
          {subText}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Skeleton loader variants
export function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`}></div>;
}

export function SkeletonImage({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`}></div>;
}

export function SkeletonButton({ className = '' }: { className?: string }) {
  return <div className={`h-10 bg-gray-200 rounded-lg animate-pulse ${className}`}></div>;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        <SkeletonImage className="w-full h-48" />
        <SkeletonText className="w-3/4" />
        <SkeletonText className="w-1/2" />
        <SkeletonButton className="w-full" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="animate-pulse">
        {/* Table header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
            ))}
          </div>
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-gray-200 px-6 py-4">
            <div className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="h-8 bg-gray-200 rounded flex-1"
                  style={{ width: colIndex === 0 ? '80px' : 'auto' }}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
