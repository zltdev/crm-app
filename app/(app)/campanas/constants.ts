export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "closed",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_CHANNELS = [
  "meta_ads",
  "google_ads",
  "email",
  "event",
  "landing",
  "whatsapp",
  "direct",
  "referral",
  "other",
] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  paused: "Pausada",
  closed: "Cerrada",
};

export const CAMPAIGN_CHANNEL_LABELS: Record<CampaignChannel, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  email: "Email",
  event: "Evento",
  landing: "Landing",
  whatsapp: "WhatsApp",
  direct: "Directo",
  referral: "Referido",
  other: "Otro",
};
