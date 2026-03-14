// x402 v2 Payment Verification for Next.js API Routes
import { HTTPFacilitatorClient } from '@x402/core/server';
import { facilitator } from '@coinbase/x402';
import type { PaymentPayload, PaymentRequired, SettleResponse } from '@x402/core/types';
import {
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from '@x402/core/http';

const x402Version = 2;
const facilitatorClient = new HTTPFacilitatorClient(facilitator);

const USDC_BASE_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

export function createPaymentRequirements(
  price: string,
  network: 'base' | 'base-sepolia' | 'eip155:8453' | 'eip155:84532',
  resourceUrl: string,
  description: string,
): PaymentRequired {
  const caip2Network =
    network === 'base' ? 'eip155:8453' : network === 'base-sepolia' ? 'eip155:84532' : network;
  const payTo = process.env.USDC_RECEIVING_WALLET_ADDRESS as `0x${string}`;
  if (!payTo) throw new Error('USDC_RECEIVING_WALLET_ADDRESS not configured');
  const usdcAmount = Math.floor(parseFloat(price.replace('$', '')) * 1_000_000).toString();
  const usdcAsset = caip2Network === 'eip155:8453' ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA;
  return {
    x402Version,
    error: 'Payment required',
    resource: { url: resourceUrl, description, mimeType: 'application/json' },
    accepts: [
      {
        scheme: 'exact',
        network: caip2Network,
        asset: usdcAsset,
        amount: usdcAmount,
        payTo,
        maxTimeoutSeconds: 300,
        extra: { name: 'USD Coin', version: '2' },
      },
    ],
  };
}

export async function verifyPayment(
  paymentSignatureHeader: string | null,
  paymentRequirements: PaymentRequired,
): Promise<{ isValid: boolean; payer?: string; error?: string }> {
  if (!paymentSignatureHeader) return { isValid: false, error: 'No payment signature provided' };
  try {
    const paymentPayload: PaymentPayload = decodePaymentSignatureHeader(paymentSignatureHeader);
    const result = await facilitatorClient.verify(paymentPayload, paymentRequirements.accepts[0]);
    return result.isValid
      ? { isValid: true, payer: result.payer }
      : { isValid: false, error: result.invalidReason || 'Payment verification failed' };
  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : 'Verification failed' };
  }
}

export async function settlePayment(
  paymentSignatureHeader: string,
  paymentRequirements: PaymentRequired,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const paymentPayload: PaymentPayload = decodePaymentSignatureHeader(paymentSignatureHeader);
    const result = await facilitatorClient.settle(paymentPayload, paymentRequirements.accepts[0]);
    return result.success
      ? { success: true, txHash: result.transaction }
      : { success: false, error: result.errorReason || 'Settlement failed' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Settlement failed' };
  }
}

export function create402Response(paymentRequirements: PaymentRequired) {
  return paymentRequirements;
}

export function encodePaymentRequired(paymentRequirements: PaymentRequired): string {
  return encodePaymentRequiredHeader(paymentRequirements);
}
