import { Moon, Monitor, Sun } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground outline-none ring-sidebar-ring transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
            "group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
          )}
          aria-label="Cambiar tema"
        >
          <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="right"
        sideOffset={8}
        className="min-w-[10rem]"
      >
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light" className="gap-2">
            <Sun className="h-4 w-4" />
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="gap-2">
            <Moon className="h-4 w-4" />
            Oscuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="gap-2">
            <Monitor className="h-4 w-4" />
            Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
