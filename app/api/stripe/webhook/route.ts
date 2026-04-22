import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

/**
 * POST /api/stripe/webhook
 *
 * Empfängt Stripe Webhook Events und aktualisiert den User-Plan in Supabase.
 *
 * Entscheidung: Admin-Client ohne RLS für direkte Profile-Updates.
 * Wichtig: Raw Body für Stripe Signature Verification erforderlich.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const adminSupabase = createAdminSupabase()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan
        const customerId = session.customer as string

        if (userId && plan) {
          await adminSupabase
            .from('profiles')
            .update({
              plan,
              stripe_customer_id: customerId,
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Plan auf free zurücksetzen
        await adminSupabase
          .from('profiles')
          .update({ plan: 'free' })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const plan = subscription.metadata?.plan

        if (plan && subscription.status === 'active') {
          await adminSupabase
            .from('profiles')
            .update({ plan })
            .eq('stripe_customer_id', customerId)
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await adminSupabase
            .from('profiles')
            .update({ plan: 'free' })
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      default:
        // Unbekannte Events ignorieren
        break
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
