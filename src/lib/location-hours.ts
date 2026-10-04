import { StudyLocation } from '@/types/study-location';

const days = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;

export function isLocationOpen(
  hours: StudyLocation['hours']
): boolean | null {
  if (!hours) {
    return null;
  }

  const now = new Date();
  const day = days[now.getDay()];
  const todayHours = hours[day];

  if (!todayHours) {
    return false;
  }

  if (todayHours === '24h') {
    return true;
  }

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  return todayHours.some(([openTime, closeTime]) => {
    const [openHour, openMinute] =
      openTime.split(':').map(Number);

    const [closeHour, closeMinute] =
      closeTime.split(':').map(Number);

    const openMinutes =
      openHour * 60 + openMinute;

    const closeMinutes =
      closeHour === 24
        ? 24 * 60
        : closeHour * 60 + closeMinute;

    return (
      currentMinutes >= openMinutes &&
      currentMinutes < closeMinutes
    );
  });
}

export function getAverageRating(
  reviews: StudyLocation['reviews']
): number | null {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  const total = reviews.reduce(
    (sum, review) => sum + review.overall_rating,
    0
  );

  return total / reviews.length;
}