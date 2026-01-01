import { WifiOff } from "lucide-react";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";

export function OfflineIndicator() {
  const { isOnline } = useLocalDatabase();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-amber-500 text-amber-950 rounded-full p-3 shadow-lg animate-pulse">
        <WifiOff className="w-5 h-5" />
      </div>
    </div>
  );
}
