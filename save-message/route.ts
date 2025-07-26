import { saveAISearchResponse } from "@/app/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { id, message } = await req.json();
  const response = await saveAISearchResponse(id, message);

  return NextResponse.json(response);
}
