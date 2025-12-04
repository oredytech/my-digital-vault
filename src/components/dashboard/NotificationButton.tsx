import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect } from "react";

interface NotificationButtonProps {
  variant?: "icon" | "full";
}

export function NotificationButton({ variant = "icon" }: NotificationButtonProps) {
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
  };

  const Icon = permission === "granted" ? BellRing : permission === "denied" ? BellOff : Bell;
  const label = permission === "granted" ? "Notifications actives" : "Activer les notifications";

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
