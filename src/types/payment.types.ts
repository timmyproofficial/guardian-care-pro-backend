/**
 * Type definitions for payment-related entities
 * Includes enums and interfaces for payment processing
 */

/**
 * Payment status enumeration
 * Defines the possible status values for payments
 */
export enum PaymentStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    CANCELLED = 'cancelled'
  }
  
  /**
   * Payment type enumeration
   * Types of payments processed in the system
   */
  export enum PaymentType {
    ONBOARDING_FEE = 'onboardingFee',   // Worker onboarding fee
    SUBSCRIPTION = 'subscription',       // Participant subscription
    SERVICE_PAYMENT = 'servicePayment'   // Payment for support service (not processed through platform)
  }
  
  /**
   * Payment method enumeration
   */
  export enum PaymentMethod {
    CREDIT_CARD = 'creditCard',
    DIRECT_DEBIT = 'directDebit',
    BANK_TRANSFER = 'bankTransfer',
    PAYPAL = 'paypal',
    NDIS = 'ndis'
  }
  
  /**
   * Subscription tier enumeration
   * Pricing tiers for participants
   */
  export enum SubscriptionTier {
    BASIC = 'basic',         // $20/month with usage cap
    STANDARD = 'standard',   // Intermediate tier
    PREMIUM = 'premium'      // $50/month unlimited
  }
  
  /**
   * Payment input interface
   * Data required for processing a payment
   */
  export interface PaymentInput {
    userId: string;
    amount: number;
    paymentType: PaymentType;
    paymentMethod: PaymentMethod;
    currency: string;
    description: string;
    metadata?: Record<string, any>;
  }
  
  /**
   * Onboarding fee payment input
   * Specific data for worker onboarding fee
   */
  export interface OnboardingFeeInput {
    workerId: string;
    paymentMethod: PaymentMethod;
    // Payment provider specific data (e.g., Stripe token)
    paymentToken?: string;
  }
  
  /**
   * Subscription payment input
   * Data for processing subscription payments
   */
  export interface SubscriptionInput {
    participantId: string;
    tier: SubscriptionTier;
    paymentMethod: PaymentMethod;
    autoRenew: boolean;
    paymentToken?: string;
  }
  
  /**
   * Payment response interface
   * Data returned after payment processing
   */
  export interface PaymentResponse {
    paymentId: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    transactionId?: string;
    receiptUrl?: string;
    timestamp: Date;
  }
  
  /**
   * Invoice interface
   * Structure for generated invoices
   */
  export interface Invoice {
    invoiceNumber: string;
    issuedDate: Date;
    dueDate: Date;
    userId: string;
    userType: string;
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[];
    subtotal: number;
    tax?: number;
    total: number;
    status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
    notes?: string;
  }