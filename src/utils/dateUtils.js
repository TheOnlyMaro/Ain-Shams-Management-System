import { formatDistanceToNow, format } from 'date-fns';

export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatString);
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

export const formatTimeAgo = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'HH:mm');
};

export const isDatePast = (date) => {
  return new Date(date) < new Date();
};

export const isDateToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  );
};

export const daysUntil = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const timeDiff = targetDate - now;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};
