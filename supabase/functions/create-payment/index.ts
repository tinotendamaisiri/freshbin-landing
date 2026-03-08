import Stripe from 'https://esm.sh/stripe@13.3.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { plan, bins, name, email } = await req.json();

    const prices: Record<string, number> = {
      onetime: 2500,
      monthly: 1800,
      annual: 17000,
    };

    const extraBins = bins > 1 ? (bins - 1) * 1000 : 0;
    const amount = (prices[plan] || 2500) + extraBins;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: plan === 'onetime' ? 'payment' : 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            ...(plan !== 'onetime' && {
              recurring: {
                interval: plan === 'monthly' ? 'month' : 'year',
              },
            }),
            product_data: {
              name: `FreshBin ${plan === 'onetime' ? 'One-Time Clean' : plan === 'monthly' ? 'Monthly Plan' : 'Annual Plan'}`,
              description: `${bins} bin${bins > 1 ? 's' : ''} — Queens, NYC`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: { name, plan, bins: String(bins) },
      success_url: 'https://freshbin.nyc?payment=success',
      cancel_url: 'https://freshbin.nyc?payment=cancelled',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
