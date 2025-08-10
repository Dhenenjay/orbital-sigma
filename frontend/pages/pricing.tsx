import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "../components/Navbar";

const PricingCheckout = dynamic(() => import("../src/components/PricingCheckout"), { ssr: false });

export default function Pricing() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen w-full bg-white text-gray-900">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
          <p className="mt-2 text-gray-600">Start free, upgrade anytime. Billing is handled securely by Clerk.</p>
        </header>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="mt-1 text-sm text-gray-600">For getting started</p>
            <div className="mt-4 text-4xl font-bold">
              $0<span className="text-base font-medium text-gray-500">/mo</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              <li>• 5 queries/day</li>
              <li>• Access to core features</li>
            </ul>
            <div className="mt-6">
              <a href="#subscribe" className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
                Subscribe
              </a>
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="mt-1 text-sm text-gray-600">For teams and power users</p>
            <div className="mt-4 text-4xl font-bold">
              $<span className="text-base font-medium text-gray-500">/mo</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              <li>• Unlimited queries</li>
              <li>• Everything in Free</li>
            </ul>
            <div className="mt-6">
              <a href="#subscribe" className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
                Subscribe
              </a>
            </div>
          </div>
        </div>

        {/* Clerk Checkout */}
        <div id="subscribe" className="mt-14">
          <div className="mb-4 text-sm text-gray-500 text-center">Checkout securely with Clerk</div>
          <PricingCheckout />
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">
          Problems checking out? <Link href="/sign-in" className="underline">Sign in</Link> first and try again.
        </div>
      </section>
      </main>
    </>
  );
}
