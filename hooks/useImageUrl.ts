import { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';

export const useImageUrl = (imageId: string | null | undefined): string | null => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      setImageUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let isMounted = true;

    dbService.getImage(imageId)
      .then(blob => {
        if (isMounted && blob) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        } else if (isMounted) {
          setImageUrl(null);
        }
      })
      .catch(error => {
        console.error(`Error fetching image ${imageId} from DB:`, error);
        if (isMounted) {
            setImageUrl(null);
        }
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageId]);

  return imageUrl;
};
