"use client";

import React, { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getIntegrationsAction, disconnectIntegrationAction } from "@/_actions/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Link2, Unlink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconBrandBitbucket } from "@tabler/icons-react";
import { InstallationItem } from "./_components/InstallationItem";

interface Installation {
  installationId?: number;
  workspaceSlug?: string;
  login: string;
  avatarUrl?: string;
  type?: string;
  displayName?: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  url: string;
  installations: Installation[];
  count: number;
}

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const result = await getIntegrationsAction();
      console.log(result, "here is the result from action")
      if (result.success) {
        setIntegrations(result.data);
      } else {
        toast.error(result.message || "Failed to fetch integrations");
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast.error("An error occurred while fetching integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      fetchIntegrations();
  }, []);

  const handleConnect = (url: string) => {
    window.open(url, "_blank");
  };

  const handleDisconnectClick = (id: string) => {
    setDisconnectingId(id);
    setIsDialogOpen(true);
  };

  const confirmDisconnect = async () => {
    if (!disconnectingId) return;

    try {
      const result = await disconnectIntegrationAction(disconnectingId);
      if (result.success) {
        toast.success(`${disconnectingId === 'github' ? 'GitHub' : 'Bitbucket'} disconnected`);
        fetchIntegrations();
      } else {
        toast.error(result.message || "Failed to disconnect integration");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("An error occurred");
    } finally {
      setIsDialogOpen(false);
      setDisconnectingId(null);
    }
  };

  return (
    <div className=" mx-auto min-h-svh w-full p-6">
      <div className="flex items-center gap-3 w mb-8">
        <SidebarTrigger className="md:hidden" />
        <div className="flex items-center justify-between w-full gap-2 border-b pb-4">
            <div>
              <h2 className="text-2xl font-medium">Integrations</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Connect your code providers.
              </p>
            </div>
          </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse bg-card/50">
              <div className="h-48"></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="overflow-hidden border-border/50 bg-card hover:bg-card/80 transition-all">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-0 rounded-lg bg-secondary/50">
                  {integration.id === "github" ? (
                    <Github className="h-6 w-6" />
                  ) : (
                    <IconBrandBitbucket className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-sm">{integration.name}</CardTitle>
                  <CardDescription className="line-clamp-1 text-xs">
                    {integration.count > 0 
                      ? `${integration.count} ${integration.count === 1 ? 'installation' : 'installations'}` 
                      : "Not connected"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  {integration.description}
                </p>
                {integration.installations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    {integration.installations.slice(0, 5).map((inst, idx) => (
                      <InstallationItem
                        key={idx}
                        avatarUrl={inst.avatarUrl}
                        login={inst.login}
                        displayName={inst.displayName}
                        profileUrl={integration.id === 'github' 
                          ? `https://github.com/${inst.login}` 
                          : `https://bitbucket.org/${inst.workspaceSlug || inst.login}`}
                      />
                    ))}
                    {integration.installations.length > 5 && (
                      <p className="text-[10px] text-muted-foreground/60 self-center">
                        +{integration.installations.length - 5} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center border-t border-border/50 bg-secondary/20 h-10">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${integration.status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground/30'}`} />
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">
                    {integration.status}
                  </span>
                </div>
                
                {integration.status === 'connected' ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-secondary/20 hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => handleDisconnectClick(integration.id)}
                  >
                    <Unlink className="h-4 w-4" />
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleConnect(integration.url)}
                  >
                    <Link2 className="h-4 w-4" />
                    Connect
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Disconnect Integration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your {disconnectingId === 'github' ? 'GitHub' : 'Bitbucket'} account? 
              This will stop Beetle from accessing your repositories and pull requests for this service.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDisconnect}>Confirm Disconnect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;
