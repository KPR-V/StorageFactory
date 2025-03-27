import { NextResponse } from 'next/server';
import { pinataGroups } from '@/utils/pinataFunctions';

export async function POST(request: Request) {
  try {
    const { groupId, files } = await request.json();
    await pinataGroups.addFiles({ groupId, files });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { groupId, files } = await request.json();
    await pinataGroups.removeFiles({ groupId, files });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
