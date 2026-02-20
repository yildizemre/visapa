import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useStoreChange = () => {
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const checkStoreChange = async () => {
      const currentStoreId = await AsyncStorage.getItem('selectedStoreId');
      setStoreId(currentStoreId);
    };

    checkStoreChange();
    const interval = setInterval(checkStoreChange, 1000);
    return () => clearInterval(interval);
  }, []);

  return storeId;
};
