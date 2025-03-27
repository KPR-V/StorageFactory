import { NextResponse } from "next/server";
import { pinataGroups } from "@/utils/pinataFunctions";

export async function GET() {
  try {
    const groups = await pinataGroups.list();
    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
