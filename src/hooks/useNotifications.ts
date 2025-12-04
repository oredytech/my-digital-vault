import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("Les notifications ne sont pas supportées par votre navigateur");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Notifications activées");
        return true;
      } else if (result === "denied") {
        toast.error("Notifications refusées");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== "granted") return;

    try {
      const notification = new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  const checkUrgentReminders = async () => {
    if (permission !== "granted") return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const { data: reminders, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", session.session.user.id)
        .eq("is_completed", false)
        .lte("remind_at", oneHourLater.toISOString())
        .gte("remind_at", now.toISOString());

      if (error) {
        console.error("Error fetching reminders:", error);
        return;
      }

      reminders?.forEach((reminder) => {
        const notifiedKey = `notified_${reminder.id}`;
        const alreadyNotified = localStorage.getItem(notifiedKey);

        if (!alreadyNotified) {
          showNotification(`⏰ Rappel urgent: ${reminder.title}`, {
            body: reminder.description || "Ce rappel arrive bientôt!",
            tag: reminder.id,
            requireInteraction: true,
          });
          localStorage.setItem(notifiedKey, "true");
        }
      });
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    checkUrgentReminders,
  };
}
