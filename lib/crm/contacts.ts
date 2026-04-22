import { z } from "zod";
import { normalizeEmail, normalizePhone } from "./normalize";

export const CONTACT_STATUSES = ["active", "blocked", "deleted", "merged"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const contactFormSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .min(1, "Ingresá un teléfono"),
    email: z
      .string()
      .trim()
      .email("Email inválido")
      .or(z.literal(""))
      .optional(),
    first_name: z.string().trim().max(120).optional(),
    last_name: z.string().trim().max(120).optional(),
    status: z.enum(CONTACT_STATUSES).default("active"),
  })
  .transform((data) => ({
    phone: data.phone,
    email: data.email && data.email.length > 0 ? data.email : null,
    first_name: data.first_name && data.first_name.length > 0 ? data.first_name : null,
    last_name: data.last_name && data.last_name.length > 0 ? data.last_name : null,
    status: data.status,
  }));

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormData = z.output<typeof contactFormSchema>;

export function contactFingerprint(input: ContactFormData) {
  return {
    phone_normalized: normalizePhone(input.phone),
    email_normalized: normalizeEmail(input.email ?? undefined),
  };
}
