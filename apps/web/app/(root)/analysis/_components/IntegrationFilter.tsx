"use client";

import React, { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter, useSearchParams } from "next/navigation";
import { getIntegrationsAction } from "@/_actions/integrations";

interface Integration {
  id: string;
  name: string;
  status: string;
  count: number;
}

export default function IntegrationFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentIntegration = searchParams.get("integration") || "all";

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const result = await getIntegrationsAction();
        if (result.success) {
          setIntegrations(result.data.filter((int: any) => int.status === 'connected'));
        }
      } catch (error) {
        console.error("Error fetching integrations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "all") {
      params.delete("integration");
    } else {
      params.set("integration", value);
    }
    
    // Reset orgSlug when changing integration
    params.delete("orgSlug");
    
    router.push(`/analysis?${params.toString()}`);
    setOpen(false);
  };

  const options = [
    { value: "all", label: "All Integrations" },
    ...integrations.map(int => ({
      value: int.id,
      label: `${int.name} (${int.count})`
    }))
  ];

  const selectedLabel = options.find(opt => opt.value === currentIntegration)?.label || "All Integrations";

  if (loading || integrations.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between text-xs"
        >
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search integration..." className="h-9" />
          <CommandList>
            <CommandEmpty>No integration found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentIntegration === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
