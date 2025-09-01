"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";

export const analyzeRepo = async (repoName: string) => {
  try {
    const { token } = await getAuthToken();

    const repoUrl = `https://github.com/${repoName}.git`;

    const res = await fetch(`${_config.API_BASE_URL}/api/analysis/execute`, {
      method: "POST",
      body: JSON.stringify({ repoUrl }),
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const reader = res.body?.getReader();
    let receivedData = "";

    function read() {
      reader
        ?.read()
        .then(({ done, value }) => {
          if (done) {
            console.log("====Stream finished=====");

            console.log("Full Data====> ", receivedData);
            return;
          }

          receivedData += new TextDecoder().decode(value);
          read();
        })
        .catch((error) => {
          console.log("Error reading stream: ", error);
        });
    }

    read();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${error.message}`);
    } else {
      throw new Error(
        `An unexpected error occurred while analyzing the repo ${repoName}.`
      );
    }
  }
};
