'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { notificationManager } from '@/lib/notifications';
import { useFormContext } from 'react-hook-form';
import { VisitFeeItem } from '@/lib/fee-utils';

interface ServiceFee {
  id: string;
  name: string;
  amount: number;
}

interface SimplifiedVisitFeeFormProps {
  onFeesChange?: (fees: VisitFeeItem[], total: number) => void;
  /** @deprecated Use initialFees instead — notes-based fee storage is removed */
  initialNotes?: string;
  /** Pre-existing fees loaded from the VisitFee table (edit mode) */
  initialFees?: VisitFeeItem[];
}

export function VisitFeeForm({ onFeesChange, initialNotes, initialFees }: SimplifiedVisitFeeFormProps) {
  const [fees, setFees] = useState<VisitFeeItem[]>([]);
  const [serviceFees, setServiceFees] = useState<ServiceFee[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [discount, setDiscount] = useState('0');
  
  // Get form context to update parent form
  const formContext = useFormContext();
  const { setValue } = formContext || {};

  useEffect(() => {
    try {
      const stored = localStorage.getItem('clinic_fees');
      if (stored) {
        setServiceFees(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load service fees:', error);
    }

    // Load fees from initialFees prop (edit mode — data from VisitFee table)
    if (initialFees && initialFees.length > 0) {
      setFees(initialFees);
      if (setValue) {
        setValue('visitFees', initialFees);
        setValue('totalFeeAmount', initialFees.reduce((s, f) => s + f.total, 0));
      }
    }
    // Legacy fallback: if only initialNotes provided, try extracting old-format fees
    // This path is kept only for visits saved before the migration.
    else if (initialNotes) {
      const { extractFeesFromNotes } = require('@/lib/fee-utils');
      const feesData = extractFeesFromNotes(initialNotes);
      if (feesData) {
        setFees(feesData.fees);
        if (setValue) {
          setValue('visitFees', feesData.fees);
          setValue('totalFeeAmount', feesData.total);
        }
      }
    }
  }, [initialNotes, initialFees, setValue]);

  // Update parent form whenever fees change
  const updateParentForm = useCallback((updatedFees: VisitFeeItem[]) => {
    if (setValue) {
      setValue('visitFees', updatedFees);
      const totalAmount = updatedFees.reduce((sum, f) => sum + f.total, 0);
      setValue('totalFeeAmount', totalAmount);
    }
    if (onFeesChange) {
      const totalAmount = updatedFees.reduce((sum, f) => sum + f.total, 0);
      onFeesChange(updatedFees, totalAmount);
    }
  }, [setValue, onFeesChange]);

  const handleAddFee = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedService) {
      notificationManager.error('Error', 'Please select a service');
      return;
    }

    const service = serviceFees.find(f => f.id === selectedService);
    if (!service) return;

    const qty = parseInt(quantity) || 1;
    const disc = parseInt(discount) || 0;
    const subtotal = service.amount * qty;
    const discountAmount = (subtotal * disc) / 100;
    const total = subtotal - discountAmount;

    const newFee: VisitFeeItem = {
      id: Date.now().toString(),
      serviceName: service.name,
      amount: service.amount,
      quantity: qty,
      discount: disc,
      total,
    };

    const updatedFees = [...fees, newFee];
    setFees(updatedFees);
    setSelectedService('');
    setQuantity('1');
    setDiscount('0');

    updateParentForm(updatedFees);
  };

  const handleRemoveFee = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const updatedFees = fees.filter(f => f.id !== id);
    setFees(updatedFees);

    updateParentForm(updatedFees);
  };

  const totalAmount = fees.reduce((sum, fee) => sum + fee.total, 0);

  return (
    <div className="space-y-4">
      <Card className="p-6 border-2 border-brand-teal/20">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-brand-teal" />
          <h3 className="text-lg font-bold text-gray-900">Visit Fees</h3>
        </div>

        {/* Add Fee Section */}
        <div className="space-y-3 mb-6 pb-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand-teal focus:outline-none text-sm"
              >
                <option value="">Select Service</option>
                {serviceFees.map(fee => (
                  <option key={fee.id} value={fee.id}>
                    {fee.name} - ₹{fee.amount}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qty
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand-teal focus:outline-none text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                min="0"
                max="100"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand-teal focus:outline-none text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid By
              </label>
              <select
                value={formContext?.watch?.('paidBy') || ''}
                onChange={(e) => setValue?.('paidBy', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand-teal focus:outline-none text-sm"
              >
                <option value="">Select Mode</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleAddFee}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-teal text-white rounded-lg font-medium hover:bg-brand-teal/90 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Fees List */}
        {fees.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-sm">No fees added yet</p>
        ) : (
          <div className="space-y-2">
            {fees.map(fee => (
              <div key={fee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{fee.serviceName}</p>
                  <p className="text-xs text-gray-600">
                    ₹{fee.amount} × {fee.quantity} = ₹{(fee.amount * fee.quantity).toFixed(2)}
                    {fee.discount > 0 && <span className="ml-2 text-orange-600">({fee.discount}% off)</span>}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right min-w-20">
                    <p className="font-bold text-brand-teal text-sm">₹{fee.total.toFixed(2)}</p>
                  </div>

                  <button
                    onClick={(e) => handleRemoveFee(fee.id, e)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-lg font-bold text-brand-teal">
                <span>Total:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
