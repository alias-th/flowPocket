import { TFunction } from "i18next";
import { AppError } from "./app-error";

// business timezone เวลาไทย
export const APP_TIME_ZONE = "Asia/Bangkok";

// แปลง UTC+7 เป็น milliseconds เพื่อใช้คำนวณกลับจากเวลาไทยเป็น UTC
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
  // แยก year/month/day ออกมา
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
  t: TFunction,
): DateRange => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new AppError(400, t("dateFilter.invalidYearOrMonth"));
  }

  // start = 2026-07-31T17:00:00Z
  // end   = 2026-08-31T17:00:00Z
  // ไทยเร็วกว่า 7 ชั่วโมง
  return {
    startDate: new Date(Date.UTC(year, month - 1, 1) - BANGKOK_UTC_OFFSET_MS),
    endDate: new Date(Date.UTC(year, month, 1) - BANGKOK_UTC_OFFSET_MS),
  };
};
