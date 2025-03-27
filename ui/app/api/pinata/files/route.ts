import { NextResponse } from 'next/server';
import { pinataFiles } from '@/utils/pinataFunctions';

export async function GET() {
  try {
    const files = await pinataFiles.list();
    return NextResponse.json(files);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { fileIds } = await request.json();
    await pinataFiles.delete(fileIds);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
