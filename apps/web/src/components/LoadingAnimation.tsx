import React from 'react';
import Lottie from 'lottie-react';
import paperplaneAnimation from '../assets/paperplane-loading.json';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

export default function LoadingAnimation({ 
  size = 'medium', 
  message,
  className = '' 
}: LoadingAnimationProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-16 h-16';
      case 'medium':
        return 'w-24 h-24';
      case 'large':
        return 'w-32 h-32';
      default:
        return 'w-24 h-24';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${getSizeClasses()} mb-4`}>
        <Lottie 
          animationData={paperplaneAnimation}
          loop={true}
          autoplay={true}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </div>
      {message && (
        <p className="text-gray-600 text-center font-medium">
          {message}
        </p>
      )}
    </div>
  );
}
