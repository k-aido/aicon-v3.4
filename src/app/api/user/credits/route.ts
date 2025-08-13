import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a hardcoded user ID since authentication isn't fully implemented
    // In a real app, you'd extract this from session/JWT token
    const userId = '5cedf725-3b56-4764-bbe0-0117a0ba7f49'; // Default user ID
    
    // Query database for user credits
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user credits:', error);
      // Return default credits if user doesn't exist or error occurs
      return NextResponse.json({ credits: 1000 });
    }
    
    return NextResponse.json({ 
      credits: data?.credits || 1000,
      userId: userId
    });
    
  } catch (error) {
    console.error('Unexpected error fetching credits:', error);
    return NextResponse.json({ 
      credits: 1000,
      error: 'Failed to fetch credits' 
    }, { status: 500 });
  }
}

// Optional: Add POST endpoint to update credits
export async function POST(request: NextRequest) {
  try {
    const { amount, operation } = await request.json();
    const userId = '5cedf725-3b56-4764-bbe0-0117a0ba7f49'; // Default user ID
    
    if (!amount || !operation || !['add', 'subtract', 'set'].includes(operation)) {
      return NextResponse.json({ 
        error: 'Invalid request. Provide amount and operation (add/subtract/set)' 
      }, { status: 400 });
    }
    
    // Get current credits
    const { data: currentData } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
    
    const currentCredits = currentData?.credits || 1000;
    let newCredits = currentCredits;
    
    switch (operation) {
      case 'add':
        newCredits = currentCredits + amount;
        break;
      case 'subtract':
        newCredits = Math.max(0, currentCredits - amount);
        break;
      case 'set':
        newCredits = Math.max(0, amount);
        break;
    }
    
    // Update credits in database
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ credits: newCredits })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user credits:', error);
      return NextResponse.json({ 
        error: 'Failed to update credits' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      credits: newCredits,
      previousCredits: currentCredits,
      operation: operation,
      amount: amount
    });
    
  } catch (error) {
    console.error('Unexpected error updating credits:', error);
    return NextResponse.json({ 
      error: 'Failed to update credits' 
    }, { status: 500 });
  }
}