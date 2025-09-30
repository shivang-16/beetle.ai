"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { getRepoSettings } from "./_actions/getRepoSettings";
import { updateRepoSettings } from "./_actions/updateSetting";

interface RepoSettings {
  _id: string;
  fullName: string;
  analysisType: string;
  analysisFrequency: string;
  analysisIntervalDays?: number;
  analysisRequired: boolean;
  raiseIssues: boolean;
  autoFixBugs: boolean;
  trackGithubIssues: boolean;
  trackGithubPullRequests: boolean;
  customSettings: Record<string, unknown>;
}

export default function RepositorySettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoId = params.repoId as string;
  const teamId = searchParams.get("teamId");

  const [settings, setSettings] = useState<RepoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getRepoSettings(repoId);
        setSettings(data.data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load repository settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [repoId]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await updateRepoSettings(repoId, {
        analysisType: settings.analysisType,
        analysisFrequency: settings.analysisFrequency,
        analysisIntervalDays: settings.analysisIntervalDays,
        analysisRequired: settings.analysisRequired,
        raiseIssues: settings.raiseIssues,
        autoFixBugs: settings.autoFixBugs,
        trackGithubIssues: settings.trackGithubIssues,
        trackGithubPullRequests: settings.trackGithubPullRequests,
        customSettings: settings.customSettings,
      });

      toast.success('Repository settings saved successfully');
      
      // Navigate back to analysis page
      const backUrl = `/analysis`;
      router.push(backUrl);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save repository settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof RepoSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Repository not found</h1>
          <p className="text-gray-600 mt-2">The repository settings could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/analysis`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analysis
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Repository Settings</h1>
          <p className="text-gray-600">{settings.fullName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Analysis Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Configuration</CardTitle>
            <CardDescription>
              Configure how and when analysis should be performed on this repository.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="analysisType" className="block text-sm font-medium text-gray-700">Analysis Type</label>
                <select
                  id="analysisType"
                  value={settings.analysisType}
                  onChange={(e) => updateSetting('analysisType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="security">Security</option>
                  <option value="quality">Quality</option>
                  <option value="performance">Performance</option>
                  <option value="style">Style</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="analysisFrequency" className="block text-sm font-medium text-gray-700">Analysis Frequency</label>
                <select
                  id="analysisFrequency"
                  value={settings.analysisFrequency}
                  onChange={(e) => updateSetting('analysisFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="on_push">On Push</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {settings.analysisFrequency === 'custom' && (
              <div className="space-y-2">
                <label htmlFor="analysisIntervalDays" className="block text-sm font-medium text-gray-700">Analysis Interval (Days)</label>
                <input
                  id="analysisIntervalDays"
                  type="number"
                  min="1"
                  value={settings.analysisIntervalDays || ''}
                  onChange={(e) => updateSetting('analysisIntervalDays', parseInt(e.target.value) || undefined)}
                  placeholder="Enter number of days"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="analysisRequired"
                checked={settings.analysisRequired}
                onChange={(e) => updateSetting('analysisRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="analysisRequired" className="text-sm font-medium text-gray-700">Analysis Required Before Merge</label>
            </div>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Settings</CardTitle>
            <CardDescription>
              Configure automated actions that can be performed based on analysis results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="raiseIssues"
                checked={settings.raiseIssues}
                onChange={(e) => updateSetting('raiseIssues', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="raiseIssues" className="text-sm font-medium text-gray-700">Automatically Create GitHub Issues</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoFixBugs"
                checked={settings.autoFixBugs}
                onChange={(e) => updateSetting('autoFixBugs', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoFixBugs" className="text-sm font-medium text-gray-700">Attempt Automatic Bug Fixes via Pull Requests</label>
            </div>
          </CardContent>
        </Card>

        {/* Tracking Settings */}
        <Card>
          <CardHeader>
            <CardTitle>GitHub Integration</CardTitle>
            <CardDescription>
              Configure which GitHub activities to track and monitor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="trackGithubIssues"
                checked={settings.trackGithubIssues}
                onChange={(e) => updateSetting('trackGithubIssues', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="trackGithubIssues" className="text-sm font-medium text-gray-700">Track GitHub Issues</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="trackGithubPullRequests"
                checked={settings.trackGithubPullRequests}
                onChange={(e) => updateSetting('trackGithubPullRequests', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="trackGithubPullRequests" className="text-sm font-medium text-gray-700">Track GitHub Pull Requests</label>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}