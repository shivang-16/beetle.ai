import { suggestQuestions } from "@/app/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { history } = await req.json();
  const response = await suggestQuestions(history);

  return NextResponse.json(response);
}
