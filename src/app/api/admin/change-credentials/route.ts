import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { username, oldPassword, newPassword } = await request.json();

    if (!username || !oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Get current admin from database
    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('username', session.username)
      .single();

    if (fetchError || !admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isOldPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new username already exists (if different from current)
    if (username !== admin.username) {
      const { data: existingAdmin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('username', username)
        .single();

      if (existingAdmin) {
        return NextResponse.json(
          { success: false, error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update admin credentials
    const { error: updateError } = await supabaseAdmin
      .from('admins')
      .update({
        username: username,
        password: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    if (updateError) {
      console.error('Error updating admin credentials:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update credentials' },
        { status: 500 }
      );
    }

    // If username changed, we need to invalidate current session
    if (username !== admin.username) {
      // Clear the session cookie
      const response = NextResponse.json({
        success: true,
        message: 'Credentials updated successfully. Please log in again with your new credentials.',
        requireReauth: true
      });

      response.cookies.set('admin-session', '', {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      return response;
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials updated successfully'
    });

  } catch (error: any) {
    console.error('Error changing admin credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}