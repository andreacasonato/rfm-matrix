// Display formats shared by screens. Dates spell the month out so 3/4 cannot be misread.

export const formatDay = (utcMs: number) =>
  Number.isNaN(utcMs)
    ? 'not a date'
    : new Date(utcMs).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });

export const formatAmount = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
