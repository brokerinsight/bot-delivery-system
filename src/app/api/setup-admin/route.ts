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

    // Check if admin credentials already exist
    const { data: existingSettings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['adminEmail', 'adminPassword']);

    const existingMap = Object.fromEntries((existingSettings || []).map(s => [s.key, s.value]));
    
    if (existingMap.adminEmail && existingMap.adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Admin credentials already exist' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert or update admin credentials
    const settingsToUpsert = [
      { key: 'adminEmail', value: email },
      { key: 'adminPassword', value: hashedPassword }
    ];

    const { error } = await supabase
      .from('settings')
      .upsert(settingsToUpsert, { onConflict: 'key' });

    if (error) {
      throw new Error(`Failed to save admin credentials: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Admin credentials set up successfully'
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}