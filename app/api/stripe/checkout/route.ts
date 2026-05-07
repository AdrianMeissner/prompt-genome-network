import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  })

  const PRICE_IDS: Record<string, string> = {
    pro: process.env.STRIPE_PRO_PRICE_ID!,
    team: process.env.STRIPE_TEAM_PRICE_ID!,
  }
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan')

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Ungültiger Plan' }, { status: 400 })
    }

    const priceId = PRICE_IDS[plan]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    // Bestehende Stripe Customer ID laden (falls vorhanden)
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, name')
      .eq('id', user.id)
      .single()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/einstellungen?checkout=success`,
      cancel_url: `${appUrl}/einstellungen?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    })

    return NextResponse.redirect(session.url!)
  } catch (error) {
    console.error('[/api/stripe/checkout]', error)
    return NextResponse.json({ error: 'Checkout fehlgeschlagen' }, { status: 500 })
  }
}
