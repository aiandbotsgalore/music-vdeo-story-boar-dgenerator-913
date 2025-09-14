import { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';

export const useAudioUrl = (audioId: string | null | undefined): string | null => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audioId) {
      setAudioUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let isMounted = true;

    dbService.getImage(audioId) // The same DB service can be used for any blob
      .then(blob => {
        if (isMounted && blob) {
          objectUrl = URL.createObjectURL(blob);
          setAudioUrl(objectUrl);
        } else if (isMounted) {
          setAudioUrl(null);
        }
      })
      .catch(error => {
        console.error(`Error fetching audio ${audioId} from DB:`, error);
        if (isMounted) {
            setAudioUrl(null);
        }
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioId]);

  return audioUrl;
};
