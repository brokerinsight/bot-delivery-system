import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .single();

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new admin
    const { error } = await supabase
      .from('admins')
      .insert({
        email,
        password_hash: hashedPassword
      });

    if (error) {
      throw new Error(`Failed to create admin: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully'
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}