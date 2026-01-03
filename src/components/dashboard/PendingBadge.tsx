import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface PendingBadgeProps {
  isPending: boolean;
}

export function PendingBadge({ isPending }: PendingBadgeProps) {
  if (!isPending) return null;
  
  return (
    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500 bg-amber-500/10 px-1.5 py-0 gap-1">
      <Clock className="w-2.5 h-2.5" />
      En attente
    </Badge>
  );
}
