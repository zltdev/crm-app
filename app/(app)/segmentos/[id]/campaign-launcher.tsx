"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCampaignDialog } from "@/components/crm/new-campaign-dialog";

export function SegmentCampaignLauncher({
  contactIds,
  totalMembers,
  campaigns,
}: {
  contactIds: string[];
  totalMembers: number;
  campaigns: { id: string; name: string; status: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Megaphone className="h-4 w-4" />
        Crear campaña con este segmento
      </Button>
      <NewCampaignDialog
        open={open}
        onClose={() => setOpen(false)}
        source="contacts"
        scope="ids"
        ids={contactIds}
        estimatedContacts={totalMembers}
        campaigns={campaigns}
      />
    </>
  );
}
