import { NextResponse } from "next/server";
import { pinata, } from "../../../utils/config";

export async function GET() {
  try {
    
    const url = await pinata.upload.public.createSignedURL({
      expires: 300, 
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return NextResponse.json(
      { error: "Failed to create signed URL" },
      { status: 500 }
    );
  }
}
