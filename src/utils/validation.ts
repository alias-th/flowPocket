import { TFunction } from "i18next";
import Joi from "joi";
import { AppError } from "./app-error";

const joiMessageKey: Record<string, string> = {
  "any.required": "validation.required",
  "string.empty": "validation.required",
  "string.email": "validation.email",
  "string.min": "validation.minLength",
  "string.max": "validation.maxLength",
  "any.only": "validation.allowedValues",
  "any.unknown": "validation.unknownField",
};

export function validateAndThrowError<T>(
  schema: Joi.ObjectSchema<T>,
  payload: unknown,
  t: TFunction,
): T {
  const { error, value } = schema.validate(payload, {
    abortEarly: false, // แจ้ง error ทั้งหมด
    stripUnknown: false, // แจ้ง field ที่ไม่ อณุญาต
  });

  if (!error) return value;

  const details = error.details.map((detail) => {
    const field = String(detail.context?.field ?? detail.path.join("."));
    const label = String(detail.context?.label ?? field);
    const key = String(
      detail.context?.i18nKey ??
        joiMessageKey[detail.type] ??
        "validation.invalid",
    );

    return {
      field,
      message: t(key, {
        field: t(`fields.${label}`, { defaultValue: label }),
        limit: detail.context?.limit,
      }),
    };
  });

  throw new AppError(400, t("validation.invalidRequest"), details);
}
