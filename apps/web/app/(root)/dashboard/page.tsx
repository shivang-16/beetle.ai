import { Card, CardContent, CardHeader } from "@/components/ui/card";
import React from "react";

const Page = () => {
  return (
    <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
      <div className="h-full border rounded-3xl p-4 overflow-y-auto scrollBar">
        <div className="flex gap-3">
          <Card className="flex-1">
            <CardHeader className="font-medium">
              No. of Repositories Added
            </CardHeader>
            <CardContent className="text-3xl font-medium">0</CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="font-medium">No. of PRs Reviewed</CardHeader>
            <CardContent className="text-3xl font-medium">0</CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="font-medium">
              No. of Questions Answered
            </CardHeader>
            <CardContent className="text-3xl font-medium">0</CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="font-medium">No. of Comments</CardHeader>
            <CardContent className="text-3xl font-medium">0</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Page;
