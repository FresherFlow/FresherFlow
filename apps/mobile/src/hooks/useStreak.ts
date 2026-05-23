import { useEffect, useState } from 'react';
import { MMKV } from 'react-native-mmkv';

const streakStorage = new MMKV({ id: 'user-streak-storage' });

export function useStreak() {
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = streakStorage.getString('lastLoginDate');
    let currentStreak = streakStorage.getNumber('currentStreak') || 0;

    if (lastLogin !== today) {
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastLoginDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1) {
          // Logged in yesterday, increment streak
          currentStreak += 1;
        } else if (diffDays > 1) {
          // Missed a day, reset streak
          currentStreak = 1;
        }
      } else {
        // First time logging in
        currentStreak = 1;
      }

      // Save new state
      streakStorage.set('lastLoginDate', today);
      streakStorage.set('currentStreak', currentStreak);
    }

    setStreakCount(currentStreak);
  }, []);

  return { streakCount };
}
