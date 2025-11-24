/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SparklesIcon, BoltIcon } from '@heroicons/react/24/solid';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

/**
 * Renders a pricing modal for upgrading plans.
 *
 * The component checks if the modal is open and displays the pricing options. It includes a button to upgrade to the Pro plan, which triggers an asynchronous function to create a checkout session with Stripe. The function handles various scenarios, including missing configuration and response errors, to ensure a smooth user experience.
 *
 * @param {PricingModalProps} props - The properties for the PricingModal component.
 * @param {boolean} props.isOpen - Indicates if the modal is currently open.
 * @param {function} props.onClose - Callback function to close the modal.
 * @param {function} props.onUpgrade - Callback function to handle upgrade actions.
 * @returns {JSX.Element | null} The rendered modal or null if not open.
 */
export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  /**
   * Handles the click event for upgrading a plan by initiating a checkout session.
   *
   * This function retrieves the Stripe publishable key from the environment variables and checks its presence.
   * It constructs the API URL for creating a checkout session and sends a POST request with the plan details.
   * Depending on the response, it either redirects to the Stripe checkout or alerts the user of any issues encountered.
   *
   * @returns {Promise<void>} A promise that resolves when the checkout process is initiated.
   * @throws {Error} If there is an issue with the checkout process or network request.
   */
  const handleUpgradeClick = async () => {
      try {
          const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
          if (!publishableKey) {
              alert('Stripe is not configured. Missing publishable key.');
              return;
          }
          const base = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
          const url = base ? `${base}/api/create-checkout-session` : '/api/create-checkout-session';
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: 'creator' })
          });
          if (!resp.ok) { alert('Failed to start checkout.'); return; }
          const data = await resp.json();
          const stripe = await loadStripe(publishableKey);
          if (stripe && data.id) {
              await stripe.redirectToCheckout({ sessionId: data.id });
          } else if (data.url) {
              window.location.href = data.url;
          } else {
              alert('Unable to redirect to Stripe Checkout.');
          }
      } catch (e) {
          alert('Checkout failed.');
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 perspective-1000">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-[#0E0E10] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col md:flex-row max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"><XMarkIcon className="w-5 h-5" /></button>
        <div className="p-8 bg-zinc-900/30 border-b md:border-b-0 md:border-r border-zinc-800 md:w-64 flex flex-col justify-between shrink-0">
            <div>
                <div className="flex items-center gap-2 text-blue-500 mb-6"><SparklesIcon className="w-6 h-6" /><span className="font-bold tracking-tight">PRO</span></div>
                <h2 className="text-2xl font-bold text-white mb-2">Upgrade Plan</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">Push the limits of what's possible with advanced generation models and dedicated processing power.</p>
            </div>
            <div className="hidden md:block text-xs text-zinc-600 mt-8">Questions? <br/> support@gemini-demo.com</div>
        </div>
        <div className="flex-1 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
            <div className="p-8 flex flex-col h-full hover:bg-zinc-900/20 transition-colors">
                <div className="mb-6">
                    <h3 className="text-lg font-medium text-zinc-200">Hobbyist</h3>
                    <div className="mt-2 flex items-baseline gap-1"><span className="text-3xl font-bold text-white">$0</span><span className="text-zinc-500">/mo</span></div>
                    <p className="text-xs text-zinc-500 mt-2">For casual experimentation</p>
                </div>
                <ul className="space-y-4 flex-1 mb-8">
                    <li className="flex items-start gap-3 text-sm text-zinc-300"><CheckIcon className="w-5 h-5 text-zinc-600 shrink-0" /><span>Standard Generation Speed</span></li>
                    <li className="flex items-start gap-3 text-sm text-zinc-300"><CheckIcon className="w-5 h-5 text-zinc-600 shrink-0" /><span>3 Projects History</span></li>
                     <li className="flex items-start gap-3 text-sm text-zinc-300"><CheckIcon className="w-5 h-5 text-zinc-600 shrink-0" /><span>Basic HTML Export</span></li>
                </ul>
                <button className="w-full py-2.5 rounded-lg border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white transition-all">Current Plan</button>
            </div>
            <div className="p-8 flex flex-col h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="mb-6 relative">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">Creator <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wide">Popular</span></h3>
                    <div className="mt-2 flex items-baseline gap-1"><span className="text-3xl font-bold text-white">$12</span><span className="text-zinc-500">/mo</span></div>
                    <p className="text-xs text-zinc-500 mt-2">For power users & designers</p>
                </div>
                <ul className="space-y-4 flex-1 mb-8 relative">
                    <li className="flex items-start gap-3 text-sm text-white"><BoltIcon className="w-5 h-5 text-blue-400 shrink-0" /><span>Fast Generation (Priority Queue)</span></li>
                    <li className="flex items-start gap-3 text-sm text-white"><CheckIcon className="w-5 h-5 text-blue-400 shrink-0" /><span>Unlimited History</span></li>
                    <li className="flex items-start gap-3 text-sm text-white"><CheckIcon className="w-5 h-5 text-blue-400 shrink-0" /><span>Advanced Code Editor</span></li>
                    <li className="flex items-start gap-3 text-sm text-white"><CheckIcon className="w-5 h-5 text-blue-400 shrink-0" /><span>Export to React / Vue</span></li>
                </ul>
                <button onClick={handleUpgradeClick} className="relative w-full py-2.5 rounded-lg bg-white text-black font-bold hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">Upgrade to Pro</button>
            </div>
        </div>
      </div>
    </div>
  );
};
