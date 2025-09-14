import React from 'react';
import { useImageUrl } from '../hooks/useImageUrl';
import Spinner from './Spinner';

interface AsyncImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageId: string;
}

const AsyncImage: React.FC<AsyncImageProps> = ({ imageId, className, alt, ...props }) => {
  const imageUrl = useImageUrl(imageId);

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center w-full h-full bg-gray-800 ${className || ''}`}>
        <Spinner className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  return <img src={imageUrl} alt={alt} className={className} {...props} />;
};

export default AsyncImage;
