import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  timestamp?: string;
}

interface RecentActivityDropdownProps {
  activity: ActivityItem[];
  loading?: boolean;
}

export function RecentActivityDropdown({ activity, loading = false }: RecentActivityDropdownProps) {
  const [open, setOpen] = useState(false);

  const unreadCount = activity.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-base font-semibold">Recent Activity</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : activity.length > 0 ? (
            activity.slice(0, 10).map((item) => (
              <DropdownMenuItem key={item.id} className="flex-col items-start gap-1 rounded-lg py-2 px-2">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{item.detail}</p>
                {item.timestamp && (
                  <p className="text-xs text-muted-foreground/60">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              No recent activity
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
