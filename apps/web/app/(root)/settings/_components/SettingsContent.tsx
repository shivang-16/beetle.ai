"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { _config } from "@/lib/_config";
import { toast } from "sonner";
 

type Scope = "user" | "team";

export interface SettingsContentProps {
  scope?: Scope;
  teamSlug?: string;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ scope = "user", teamSlug }) => {
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const { orgId, orgRole, getToken } = useAuth();
  const storageKey = useMemo(() => `settings:allowAllPRs:${scope === "team" ? teamSlug ?? "team" : "user"}`, [scope, teamSlug]);
  const [bulkSettings, setBulkSettings] = useState<{
    trackGithubPullRequests: boolean;
    trackGithubIssues: boolean;
    analysisRequired: boolean;
    raiseIssues: boolean;
    autoFixBugs: boolean;
  }>({
    trackGithubPullRequests: false,
    trackGithubIssues: false,
    analysisRequired: true,
    raiseIssues: false,
    autoFixBugs: false,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repoModel, setRepoModel] = useState<string>("");
  const [prModel, setPrModel] = useState<string>("");
  const [repoModelName, setRepoModelName] = useState<string>("");
  const [prModelName, setPrModelName] = useState<string>("");
  const [availableRepoModels, setAvailableRepoModels] = useState<Array<{ _id: string; name: string; provider: string }>>([]);
  const [availablePrModels, setAvailablePrModels] = useState<Array<{ _id: string; name: string; provider: string }>>([]);
  const [loadingRepoModels, setLoadingRepoModels] = useState<boolean>(false);
  const [loadingPrModels, setLoadingPrModels] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        setBulkSettings((prev) => ({ ...prev, trackGithubPullRequests: raw === "true" }));
      }
    } catch (_) {}
  }, [storageKey]);


  useEffect(() => {
    const initUserModels = async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        };
        if (scope === "team" && orgId) {
          headers["X-Team-Id"] = orgId;
        }

        // Fetch settings and available models in parallel
        const settingsUrl = scope === "team"
          ? `${_config.API_BASE_URL}/api/team/settings`
          : `${_config.API_BASE_URL}/api/user/settings`;
        
        const [settingsRes, repoModelsRes, prModelsRes] = await Promise.all([
          fetch(settingsUrl, { headers }),
          fetch(`${_config.API_BASE_URL}/api/ai/models?mode=full_repo_analysis`, { headers }),
          fetch(`${_config.API_BASE_URL}/api/ai/models?mode=pr_analysis`, { headers }),
        ]);

        // Process settings
        if (settingsRes.ok) {
          const settingsJson = await settingsRes.json();
          const s = (settingsJson?.data || {}) as any;
          
          // Extract model IDs and names from settings
          const repoModelId = typeof s.defaultModelRepo === "string" ? s.defaultModelRepo : "";
          const prModelId = typeof s.defaultModelPr === "string" ? s.defaultModelPr : "";
          const repoModelName = typeof s.defaultModelRepoName === "string" ? s.defaultModelRepoName : "";
          const prModelName = typeof s.defaultModelPrName === "string" ? s.defaultModelPrName : "";
          
          setRepoModel(repoModelId);
          setPrModel(prModelId);
          setRepoModelName(repoModelName);
          setPrModelName(prModelName);
        }

        // Process available models
        if (repoModelsRes.ok) {
          const repoModelsJson = await repoModelsRes.json();
          const repoModels = Array.isArray(repoModelsJson?.data) ? repoModelsJson.data : [];
          setAvailableRepoModels(repoModels);
        }

        if (prModelsRes.ok) {
          const prModelsJson = await prModelsRes.json();
          const prModels = Array.isArray(prModelsJson?.data) ? prModelsJson.data : [];
          setAvailablePrModels(prModels);
        }
      } catch (_) {}
    };
    initUserModels();
  }, [getToken, scope, orgId]);

  const fetchAvailableRepoModels = async () => {
    try {
      setLoadingRepoModels(true);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
      if (scope === "team" && orgId) {
        headers["X-Team-Id"] = orgId;
      }
      const res = await fetch(`${_config.API_BASE_URL}/api/ai/models?mode=full_repo_analysis`, { headers });
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];
        setAvailableRepoModels(arr);
      }
    } catch (_) {}
    finally {
      setLoadingRepoModels(false);
    }
  };

  const fetchAvailablePrModels = async () => {
    try {
      setLoadingPrModels(true);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
      if (scope === "team" && orgId) {
        headers["X-Team-Id"] = orgId;
      }
      const res = await fetch(`${_config.API_BASE_URL}/api/ai/models?mode=pr_analysis`, { headers });
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];
        setAvailablePrModels(arr);
      }
    } catch (_) {}
    finally {
      setLoadingPrModels(false);
    }
  };

  const handleToggle = (key: keyof typeof bulkSettings, checked: boolean) => {
    setBulkSettings((prev) => ({ ...prev, [key]: checked }));
    setDirty(true);
    if (key === "trackGithubPullRequests") {
      try {
        localStorage.setItem(storageKey, String(checked));
      } catch (_) {}
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
      if (scope === "team" && orgId) {
        headers["X-Team-Id"] = orgId;
      }
      const settingsUrl = scope === "team"
        ? `${_config.API_BASE_URL}/api/team/settings`
        : `${_config.API_BASE_URL}/api/user/settings`;
      const payload = {
        ...(repoModel ? { defaultModelRepoId: repoModel } : {}),
        ...(prModel ? { defaultModelPrId: prModel } : {}),
      };
      const settingsRes = await fetch(settingsUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!settingsRes.ok) {
        const err = await settingsRes.json().catch(() => ({}));
        toast.error(err.message || "Failed to save model settings");
        return;
      }
      const body = {
        scope,
        settings: {
          trackGithubPullRequests: bulkSettings.trackGithubPullRequests,
          trackGithubIssues: bulkSettings.trackGithubIssues,
          analysisRequired: bulkSettings.analysisRequired,
          raiseIssues: bulkSettings.raiseIssues,
          autoFixBugs: bulkSettings.autoFixBugs,
        },
      };
      const res = await fetch(`${_config.API_BASE_URL}/api/github/repository/settings/bulk`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to save settings");
      } else {
        const data = await res.json();
        toast.success(data.message || "Settings updated");
        setDirty(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-svh max-w-8xl w-full mx-auto p-5">
      <div className="h-full">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-2xl font-medium">Settings</h2>
        </div>

        <div className="grid grid-row-1 lg:grid-row-2 gap-6 mt-4 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{user?.fullName || user?.username || "—"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.primaryEmailAddress?.emailAddress || "—"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user?.id || "—"}</span>
              </div>
           
            </CardContent>
          </Card>

             {scope === "team" && (
                <Card>
                     <CardHeader>
              <CardTitle className="text-lg">Team Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Team Name</span>
                    <span className="font-medium">{organization?.name || teamSlug || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Team Slug</span>
                    <span className="font-mono text-xs">{organization?.slug || teamSlug || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Team ID</span>
                    <span className="font-mono text-xs">{organization?.id || orgId || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Your Role</span>
                    <span className="font-medium">{membership?.role || orgRole || "—"}</span>
                  </div>
          </CardContent>
          </Card>
              )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pull Request Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="allow-all-repos-pr-analysis"
                  checked={bulkSettings.trackGithubPullRequests}
                  onCheckedChange={(v: boolean) => handleToggle("trackGithubPullRequests", Boolean(v))}
                />
                <Label htmlFor="allow-all-repos-pr-analysis" className="cursor-pointer">
                  {scope === "team" ? "Allow PR analysis for all team repositories" : "Allow PR analysis for all personal repositories"}
                </Label>
              </div>
              {/* <div className="flex items-center gap-3">
                <Checkbox
                  id="track-github-issues"
                  checked={bulkSettings.trackGithubIssues}
                  onCheckedChange={(v: boolean) => handleToggle("trackGithubIssues", Boolean(v))}
                />
                <Label htmlFor="track-github-issues" className="cursor-pointer">
                  {scope === "team" ? "Track GitHub issues across team repositories" : "Track GitHub issues across personal repositories"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="analysis-required"
                  checked={bulkSettings.analysisRequired}
                  onCheckedChange={(v: boolean) => handleToggle("analysisRequired", Boolean(v))}
                />
                <Label htmlFor="analysis-required" className="cursor-pointer">
                  {scope === "team" ? "Require analysis before merges (team)" : "Require analysis before merges (personal)"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="raise-issues"
                  checked={bulkSettings.raiseIssues}
                  onCheckedChange={(v: boolean) => handleToggle("raiseIssues", Boolean(v))}
                />
                <Label htmlFor="raise-issues" className="cursor-pointer">
                  {scope === "team" ? "Automatically create issues (team)" : "Automatically create issues (personal)"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="auto-fix-bugs"
                  checked={bulkSettings.autoFixBugs}
                  onCheckedChange={(v: boolean) => handleToggle("autoFixBugs", Boolean(v))}
                />
                <Label htmlFor="auto-fix-bugs" className="cursor-pointer">
                  {scope === "team" ? "Automatically open PRs for simple fixes (team)" : "Automatically open PRs for simple fixes (personal)"}
                </Label>
              </div> */}
             
            
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             
                <div className="space-y-2">
                  <Label htmlFor="pr-model">Model for Pull Request Analysis</Label>
                  <Select value={prModel} onValueChange={(v) => { setPrModel(v); const found = availablePrModels.find((x) => x._id === v); if (found) setPrModelName(found.name); setDirty(true); }} onOpenChange={(open) => { if (open && availablePrModels.length === 0) { fetchAvailablePrModels(); } }}>
                    <SelectTrigger id="pr-model">
                      <SelectValue placeholder={prModelName || "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingPrModels && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                      {!loadingPrModels && availablePrModels.length === 0 && (
                        <SelectItem value="none" disabled>No models available</SelectItem>
                      )}
                      {availablePrModels.map((m) => (
                        <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo-model">Model for Repo Analysis</Label>
                  <Select value={repoModel} onValueChange={(v) => { setRepoModel(v); const found = availableRepoModels.find((x) => x._id === v); if (found) setRepoModelName(found.name); setDirty(true); }} onOpenChange={(open) => { if (open && availableRepoModels.length === 0) { fetchAvailableRepoModels(); } }}>
                    <SelectTrigger id="repo-model">
                      <SelectValue placeholder={repoModelName || "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingRepoModels && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                      {!loadingRepoModels && availableRepoModels.length === 0 && (
                        <SelectItem value="none" disabled>No models available</SelectItem>
                      )}
                      {availableRepoModels.map((m) => (
                        <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
            <div className="flex items-center justify-center pt-2">
                <Button onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
              <p className="text-xs m-auto text-muted-foreground">
                {scope === "team"
                  ? "This applies to the current team’s repositories."
                  : "This applies to your personal repositories."}
              </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;