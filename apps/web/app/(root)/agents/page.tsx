import React from "react";
import { getRepository } from "../analysis/_actions/getRepository";
import { GithubRepository } from "@/types/types";

export const dynamic = 'force-dynamic';

const models = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

async function fetchRepos(): Promise<GithubRepository[]> {
  const res = await getRepository("");
  return res?.data ?? [];
}

const AgentsPage = async () => {
  const repos = await fetchRepos();

  return (
    <div className="h-svh w-full flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="border rounded-3xl p-4 shadow-sm bg-background h-32">
          <div className="space-y-3 h-full flex flex-col justify-between">
            
            <div className="w-full flex items-center gap-2">
              <input
                placeholder="Describe what you want the agent to do"
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


            <div className="flex items-start gap-2 px-2 text-sm">
            {/* Model selector inline with the input */}
            <div className=" ">
                <select className="bg-transparent outline-none">
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

            

            {/* Repository selector under the input */}
            <div className="">
              <select className=" bg-transparent outline-none">
                {repos.map((repo) => (
                  <option key={repo._id} value={repo.fullName}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
            </div>
</div>
        
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;