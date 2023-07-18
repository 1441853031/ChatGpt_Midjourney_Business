import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestOpenai } from "../../common";
import { getServerSideConfig } from "@/app/config/server";

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenAI Route] params ", params);
  const freeCount = process.env.FREE_COUNT;
  const apiKey = process.env.OPENAI_API_KEY;
  if (freeCount != null && parseInt(freeCount) > 0) {
    process.env.FREE_COUNT = "" + (parseInt(freeCount) - 1);
    console.log("[OpenAI Route] freeCount ", freeCount);
    req.headers.set("Authorization", `Bearer ${apiKey}`);
  } else {
    const authResult = auth(req);
    if (authResult.error) {
      return NextResponse.json(authResult, {
        status: 401,
      });
    }
  }
  try {
    return await requestOpenai(req);
  } catch (e) {
    console.error("[OpenAI] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
