'use client';

import { Check, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import Modal from './Modal';
import { PlanConfig } from '@/lib/stripe/plans';

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: PlanConfig | null;
  newPlan: PlanConfig;
  isLoading?: boolean;
}

export default function PlanChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isLoading = false
}: PlanChangeModalProps) {
  const isUpgrade = currentPlan && newPlan.price > currentPlan.price;
  const isDowngrade = currentPlan && newPlan.price < currentPlan.price;
  const priceDiff = currentPlan ? Math.abs(newPlan.price - currentPlan.price) : newPlan.price;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Subscription Plan" size="lg">
      <div className="space-y-6">
        {/* Plan Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Plan */}
          {currentPlan && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm text-gray-600 mb-1">Current Plan</div>
              <div className="font-semibold text-lg">{currentPlan.name}</div>
              <div className="text-gray-600">${currentPlan.price}/month</div>
              <div className="text-sm text-gray-500 mt-2">
                {currentPlan.credits.toLocaleString()} credits/month
              </div>
            </div>
          )}

          {/* New Plan */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-blue-600">New Plan</div>
              {isUpgrade && <TrendingUp className="h-4 w-4 text-green-600" />}
              {isDowngrade && <TrendingDown className="h-4 w-4 text-orange-600" />}
            </div>
            <div className="font-semibold text-lg">{newPlan.name}</div>
            <div className="text-gray-600">${newPlan.price}/month</div>
            <div className="text-sm text-blue-600 mt-2">
              {newPlan.credits.toLocaleString()} credits/month
            </div>
          </div>
        </div>

        {/* What's Changing */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3 flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            What happens next:
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <Check className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              Your plan will be changed immediately
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              You'll get {newPlan.credits.toLocaleString()} credits for this billing period
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              {isUpgrade && `You'll be charged a prorated amount of $${priceDiff.toFixed(2)} today`}
              {isDowngrade && `You'll receive a prorated credit of $${priceDiff.toFixed(2)}`}
              {!currentPlan && `You'll be charged $${newPlan.price} today`}
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              Future billing will be ${newPlan.price}/month
            </li>
          </ul>
        </div>

        {/* New Plan Features */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            {newPlan.name} Plan Features:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {newPlan.features.map((feature, index) => (
              <div key={index} className="flex items-start text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating Plan...
              </div>
            ) : (
              `Switch to ${newPlan.name}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}