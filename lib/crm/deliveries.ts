export const DELIVERY_CHANNELS = [
  "email",
  "whatsapp",
  "sms",
  "call",
  "push",
  "other",
] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export const DELIVERY_CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  call: "Llamada",
  push: "Push notification",
  other: "Otro",
};

export const DELIVERY_STATUSES = [
  "pending",
  "scheduled",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "opened",
  "clicked",
  "replied",
  "unsubscribed",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pendiente",
  scheduled: "Programado",
  sent: "Enviado",
  delivered: "Entregado",
  failed: "Fallado",
  bounced: "Rebotó",
  opened: "Abierto",
  clicked: "Click",
  replied: "Respondido",
  unsubscribed: "Desuscrito",
};

// Qué estados bloquean agregar otra vez al contacto en la misma campaña.
export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  "pending",
  "scheduled",
];
