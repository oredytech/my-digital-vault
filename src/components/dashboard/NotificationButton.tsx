import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect } from "react";

interface NotificationButtonProps {
  variant?: "icon" | "full" | "menu" | "drawer";
  onAction?: () => void;
}

export function NotificationButton({ variant = "icon", onAction }: NotificationButtonProps) {
  const { permission, isSupported, requestPermission, checkUrgentReminders } = useNotifications();

  useEffect(() => {
    if (permission === "granted") {
      // Check immediately
      checkUrgentReminders();
      
      // Check every 5 minutes
      const interval = setInterval(checkUrgentReminders, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [permission]);

  if (!isSupported) return null;

  const handleClick = async () => {
    if (permission !== "granted") {
      await requestPermission();
    } else {
      checkUrgentReminders();
    }
    onAction?.();
  };

  const Icon = permission === "granted" ? BellRing : permission === "denied" ? BellOff : Bell;
  const label = permission === "granted" ? "Notifications" : "Notifications";

  if (variant === "drawer") {
    return (
      <button
        onClick={handleClick}
        className="flex flex-col items-center justify-center p-4 rounded-xl bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all"
      >
        <Icon className={`w-6 h-6 mb-2 ${permission === "granted" ? "text-primary" : ""}`} />
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <div
        onClick={handleClick}
        className="flex items-center px-2 py-1.5 cursor-pointer w-full"
      >
        <Icon className={`w-4 h-4 mr-2 ${permission === "granted" ? "text-primary" : ""}`} />
        {label}
      </div>
    );
  }

  if (variant === "full") {
    return (
      <Button
        variant="ghost"
        onClick={handleClick}
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
        disabled={permission === "denied"}
      >
        <Icon className="w-5 h-5 mr-3" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={permission === "granted" ? "text-primary" : "text-sidebar-foreground"}
      title={label}
      disabled={permission === "denied"}
    >
      <Icon className="w-5 h-5" />
    </Button>
  );
}
