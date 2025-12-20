import { NextRequest, NextResponse } from 'next/server';
import { updatePunchById, deletePunchById } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { timestamp } = body;

    if (!timestamp) {
      return NextResponse.json({ error: 'Missing timestamp' }, { status: 400 });
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
    }

    const updated = await updatePunchById(parseInt(id), date);
    
    if (!updated) {
      return NextResponse.json({ error: 'Punch not found' }, { status: 404 });
    }

    return NextResponse.json({ punch: updated });
  } catch (error) {
    console.error('Error updating punch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deletePunchById(parseInt(id));

    if (!deleted) {
      return NextResponse.json({ error: 'Punch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting punch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
