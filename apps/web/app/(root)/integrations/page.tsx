"use client";

import React, { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getIntegrationsAction, disconnectInstallationAction, reconnectIntegrationAction, reconnectInstallationAction, getAvailableBitbucketWorkspacesAction, connectBitbucketWorkspaceAction } from "@/_actions/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Link2, Unlink, Plus, Loader2, Plug } from "lucide-react";
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
  status?: 'connected' | 'disconnected';
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

interface AvailableWorkspace {
  uuid: string;
  slug: string;
  name: string;
  avatarUrl?: string;
  type: string;
}

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<AvailableWorkspace[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isConnectingNew, setIsConnectingNew] = useState<string | null>(null);

  // Check for error query params - RUNS ONCE ON MOUNT
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('bitbucket_error') === 'no_workspaces') {
         // Use setTimeout to ensure toast library is ready/mounted if needed, though usually not required
         setTimeout(() => {
             toast.warning("No workspaces found. Please create a new workspace in Bitbucket and try again.");
         }, 100);
         
         const newUrl = window.location.pathname;
         window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Check for auto-open query param - RUNS WHEN INTEGRATIONS LOAD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('open_bitbucket_manage') === 'true' && integrations.length > 0) {
        const bitbucketIntegration = integrations.find(i => i.id === 'bitbucket');
        if (bitbucketIntegration) {
            setSelectedIntegration(bitbucketIntegration);
            setIsDialogOpen(true);
            
            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }
  }, [integrations]);

  // Clear available when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
        setAvailableWorkspaces([]);
        setIsLoadingAvailable(false);
    }
  }, [isDialogOpen]);

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

  const handleConnect = async (integrationId: string, url: string) => {
    try {
      setReconnectingId(integrationId);
      const result = await reconnectIntegrationAction(integrationId);
      
      if (result.success) {
        if (result.restored) {
          toast.success("Successfully reconnected previous installations");
          fetchIntegrations();
        } else {
          // Redirect to new connection flow
          window.location.href = result.redirectUrl || url;
        }
      } else {
        toast.error(result.message || "Connection check failed");
        // Fallback to direct URL
        window.open(url, "_blank");
      }
    } catch (error) {
       console.error("Connection error:", error);
       window.open(url, "_blank");
    } finally {
      setReconnectingId(null);
    }
  };

  const handleManageClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsDialogOpen(true);
  };

  const handleDisconnectItem = async (type: string, id: string | number) => {
    try {
      const result = await disconnectInstallationAction(type, id);
      if (result.success) {
        toast.success("Disconnected successfully");
        
        if (selectedIntegration) {
          const updatedInstallations = selectedIntegration.installations.map(inst => {
             const instId = type === 'github' ? inst.installationId : inst.workspaceSlug;
             if (instId === id) {
                 return { ...inst, status: 'disconnected' as const };
             }
             return inst;
          });
          
          setSelectedIntegration({
            ...selectedIntegration,
            installations: updatedInstallations,
            count: updatedInstallations.filter(i => i.status === 'connected').length,
            status: updatedInstallations.some(i => i.status === 'connected') ? 'connected' : 'disconnected'
          });
          
          // Refresh main list
          fetchIntegrations();
        }
      } else {
        toast.error(result.message || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("An error occurred");
    }
  };

  const handleReconnectItem = async (type: string, id: string | number) => {
    try {
        const result = await reconnectInstallationAction(type, id);
        if (result.success) {
            toast.success("Reconnected successfully");
            
            if (selectedIntegration) {
                const updatedInstallations = selectedIntegration.installations.map(inst => {
                     const instId = type === 'github' ? inst.installationId : inst.workspaceSlug;
                     if (instId === id) {
                         return { ...inst, status: 'connected' as const };
                     }
                     return inst;
                });
                
                setSelectedIntegration({
                    ...selectedIntegration,
                    installations: updatedInstallations,
                    count: updatedInstallations.filter(i => i.status === 'connected').length,
                    status: 'connected'
                });
                fetchIntegrations();
            }
        } else {
            toast.error(result.message || "Failed to reconnect");
        }
    } catch (error) {
        console.error("Error reconnecting:", error);
        toast.error("An error occurred");
    }
  };

  const handleAddNew = async () => {
    if (!selectedIntegration) return;

    if (selectedIntegration.id === 'github') {
         window.location.href = selectedIntegration.url;
         return;
    }

    if (selectedIntegration.id === 'bitbucket') {
        setIsLoadingAvailable(true);
        // Clean previous
        setAvailableWorkspaces([]);
        
        const result = await getAvailableBitbucketWorkspacesAction();
        setIsLoadingAvailable(false);
        
        if (result.success) {
            setAvailableWorkspaces(result.data);
            if (result.data.length === 0) {
                 toast.info("No additional workspaces found.");
            }
        } else if (result.needAuth) {
             // Redirect to OAuth if we can't fetch (token expired or no token)
             window.location.href = selectedIntegration.url;
        } else {
            toast.error(result.message);
        }
    }
  };

  const handleConnectWorkspace = async (slug: string) => {
    setIsConnectingNew(slug);
    const result = await connectBitbucketWorkspaceAction(slug);
    setIsConnectingNew(null);

    if (result.success) {
        toast.success("Workspace connected");
        // Remove from available and close dialog to force refresh
        setAvailableWorkspaces(prev => prev.filter(w => w.slug !== slug));
        setIsDialogOpen(false);
        fetchIntegrations();
    } else {
        toast.error(result.message);
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
                    className="gap-2 border-secondary/20 hover:bg-secondary/30"
                    onClick={() => handleManageClick(integration)}
                  >
                    <Unlink className="h-4 w-4" />
                    Manage
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm" 
                    disabled={reconnectingId === integration.id}
                    className="gap-2"
                    onClick={() => handleConnect(integration.id, integration.url)}
                  >
                    {reconnectingId === integration.id ? (
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"/>
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Connect
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Manage {selectedIntegration?.name} Connections
            </DialogTitle>
            <DialogDescription className="text-xs">
              View and manage your active connections. Disconnecting will stop Beetle from accessing repositories associated with that connection.
            </DialogDescription>
          </DialogHeader>
            
          <div className="mt-4 flex flex-col gap-3 max-h-[400px] overflow-y-auto">
             {selectedIntegration?.installations.map((inst, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                    <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary">
                            {inst.avatarUrl ? (
                                <img src={inst.avatarUrl} alt={inst.login} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs font-bold">
                                    {inst.login.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                         </div>
                         <div>
                            <p className="font-medium text-sm">{inst.displayName || inst.login}</p>
                            <p className="text-xs text-muted-foreground">
                                {inst.type || 'Account'} 
                                {inst.status === 'disconnected' && <span className="ml-2 text-red-700">(Disconnected)</span>}
                            </p>
                         </div>
                    </div>
                    {inst.status === 'disconnected' ? (
                        <Button 
                            variant="default" 
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => handleReconnectItem(
                                selectedIntegration.id, 
                                selectedIntegration.id === 'github' ? inst.installationId! : inst.workspaceSlug!
                            )}
                        >
                            Connect
                        </Button>
                    ) : (
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="border-red-700 text-red-700 hover:bg-transparent hover:text-red-800"
                            onClick={() => handleDisconnectItem(
                                selectedIntegration.id, 
                                selectedIntegration.id === 'github' ? inst.installationId! : inst.workspaceSlug!
                            )}
                        >
                            Disconnect
                        </Button>
                    )}
                </div>
             ))}
             {selectedIntegration?.installations.length === 0 && (
                 <p className="text-center text-muted-foreground py-4">No connections found.</p>
             )}
          </div>
          
          <div className="mt-4 border-t pt-4">
              {availableWorkspaces.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto animate-in slide-in-from-top-2">
                       <p className="text-xs font-medium text-muted-foreground uppercase">Available Workspaces</p>
                       {availableWorkspaces.map((ws, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                                <div className="flex items-center gap-3">
                                     <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary">
                                        {ws.avatarUrl ? (
                                            <img src={ws.avatarUrl} alt={ws.slug} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs font-bold">
                                                {ws.slug.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                     </div>
                                     <div>
                                        <p className="font-medium text-sm">{ws.name || ws.slug}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {ws.type || 'workspace'}
                                        </p>
                                     </div>
                                </div>
                                <Button 
                                    size="sm"
                                    onClick={() => handleConnectWorkspace(ws.slug)}
                                    disabled={isConnectingNew !== null}
                                >
                                    {isConnectingNew === ws.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                                </Button>
                           </div>
                       ))}
                  </div>
              )}
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button 
                variant="default" // Changed to default for emphasis
                className="gap-2"
                onClick={handleAddNew}
                disabled={isLoadingAvailable}
            >
                  {isLoadingAvailable ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add New Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;
