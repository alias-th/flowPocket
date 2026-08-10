export const APP_TIME_ZONE = "Asia/Bangkok";

const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

interface BangkokDateParts {
  year: number;
  month: number;
  day: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const getBangkokDateParts = (
  date: Date = new Date(),
): BangkokDateParts => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
};

export const getBangkokMonthRange = (
  year: number,
  month: number,
): DateRange => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Invalid year or month");
  }

  return {
    startDate: new Date(
      Date.UTC(year, month - 1, 1) - BANGKOK_UTC_OFFSET_MS,
    ),
    endDate: new Date(Date.UTC(year, month, 1) - BANGKOK_UTC_OFFSET_MS),
  };
};
