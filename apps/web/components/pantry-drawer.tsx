'use client';

import { Drawer } from './drawer';
import { useState } from 'react';

type PantryItem = {
  id: string;
  name: string;
  quantity: string;
  category: string;
  expiresIn?: string;
};

type PantryDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Mock data - in production, fetch from database
const MOCK_PANTRY_ITEMS: PantryItem[] = [
  { id: '1', name: 'Chicken Breast', quantity: '2 lbs', category: 'Proteins', expiresIn: '3 days' },
  { id: '2', name: 'Brown Rice', quantity: '1 bag', category: 'Grains', expiresIn: '30 days' },
  { id: '3', name: 'Broccoli', quantity: '2 heads', category: 'Vegetables', expiresIn: '5 days' },
  { id: '4', name: 'Eggs', quantity: '12 count', category: 'Proteins', expiresIn: '2 weeks' },
  { id: '5', name: 'Olive Oil', quantity: '500ml', category: 'Oils & Fats' },
  { id: '6', name: 'Garlic', quantity: '1 bulb', category: 'Aromatics', expiresIn: '2 weeks' },
  { id: '7', name: 'Onions', quantity: '3 medium', category: 'Aromatics', expiresIn: '1 week' },
  { id: '8', name: 'Greek Yogurt', quantity: '32 oz', category: 'Dairy', expiresIn: '7 days' },
  { id: '9', name: 'Spinach', quantity: '1 bunch', category: 'Vegetables', expiresIn: '4 days' },
  { id: '10', name: 'Sweet Potatoes', quantity: '4 medium', category: 'Vegetables', expiresIn: '2 weeks' },
];

const CATEGORIES = ['All', 'Proteins', 'Grains', 'Vegetables', 'Dairy', 'Oils & Fats', 'Aromatics'];

export function PantryDrawer({ isOpen, onClose }: PantryDrawerProps) {
  const [items, setItems] = useState<PantryItem[]>(MOCK_PANTRY_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

  const getExpirationColor = (expiresIn?: string) => {
    if (!expiresIn) return 'text-gray-500';
    if (expiresIn.includes('day') && parseInt(expiresIn) <= 3) return 'text-red-600';
    if (expiresIn.includes('day') && parseInt(expiresIn) <= 7) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Pantry Manager">
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-3xl font-semibold text-teal-900">{items.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Expiring Soon</p>
            <p className="text-3xl font-semibold text-orange-600">
              {items.filter(i => i.expiresIn && i.expiresIn.includes('day') && parseInt(i.expiresIn) <= 7).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Categories</p>
            <p className="text-3xl font-semibold text-teal-900">{CATEGORIES.length - 1}</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Filter by Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === category
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-teal-900">
              {selectedCategory === 'All' ? 'All Items' : selectedCategory} ({filteredItems.length})
            </h3>
            <button className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
              + Add Item
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No items in this category
              </div>
            ) : (
              filteredItems.map(item => (
                <div key={item.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <span className="px-2 py-1 bg-brand-secondary/20 text-brand-primary text-xs font-medium rounded">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          <span className="font-medium">Quantity:</span> {item.quantity}
                        </span>
                        {item.expiresIn && (
                          <span className={`font-medium ${getExpirationColor(item.expiresIn)}`}>
                            Expires in {item.expiresIn}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
