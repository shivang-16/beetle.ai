import React from "react";
import { getRepository } from "../../analysis/_actions/getRepository";
import { GithubRepository } from "@/types/types";

export const dynamic = 'force-dynamic';

const models = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

interface PageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

async function fetchRepos(teamSlug?: string): Promise<GithubRepository[]> {
  // TODO: Update getRepository to accept teamSlug/teamId parameter
  const res = await getRepository("");
  console.log(res);
  return res?.data ?? [];
}

const AgentsPage = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  const teamSlug = resolvedParams.teamSlug;
  const repos = await fetchRepos(teamSlug);
  console.log(`Team ${teamSlug} repos:`, repos.length);

  return (
    <div className="h-svh w-full flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold">Team Agents</h1>
          <p className="text-sm text-gray-500">Team: {teamSlug}</p>
        </div>
        
        <div className="border rounded-3xl p-4 shadow-sm bg-background h-32">
          <div className="space-y-3 h-full flex flex-col justify-between">
            
            <div className="w-full flex items-center gap-2">
              <input
                placeholder="Describe what you want the team agent to do"
                className="w-full bg-transparent outline-none border-none px-3 py-2"
              />
              <button
                type="button"
                aria-label="Attach image"
                className="rounded-md px-2 py-2 hover:bg-muted text-muted-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-5-5L5 21"></path></svg>
              </button>
              <button
                type="button"
                aria-label="Send"
                className="rounded-md px-2 py-2 hover:bg-muted text-muted-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select className="bg-transparent text-xs border border-border rounded-md px-2 py-1">
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
                
                <select className="bg-transparent text-xs border border-border rounded-md px-2 py-1">
                  <option value="">Select Repository</option>
                  {repos.map((repo) => (
                    <option key={repo._id} value={repo._id}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>⌘</span>
                <span>Enter</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;