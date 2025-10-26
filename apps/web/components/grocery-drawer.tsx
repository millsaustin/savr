'use client';

import { Drawer } from './drawer';
import { useState } from 'react';

type GroceryItem = {
  id: string;
  name: string;
  quantity: string;
  category: string;
  estimatedPrice: number;
  checked: boolean;
  notes?: string;
};

type GroceryDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Mock data - in production, fetch from database
const MOCK_GROCERY_ITEMS: GroceryItem[] = [
  { id: '1', name: 'Salmon Fillets', quantity: '2 lbs', category: 'Seafood', estimatedPrice: 18.99, checked: false },
  { id: '2', name: 'Quinoa', quantity: '1 bag', category: 'Grains', estimatedPrice: 6.49, checked: false },
  { id: '3', name: 'Cherry Tomatoes', quantity: '1 pint', category: 'Produce', estimatedPrice: 3.99, checked: false },
  { id: '4', name: 'Greek Yogurt', quantity: '32 oz', category: 'Dairy', estimatedPrice: 5.99, checked: false },
  { id: '5', name: 'Avocados', quantity: '4 count', category: 'Produce', estimatedPrice: 4.99, checked: true },
  { id: '6', name: 'Almond Butter', quantity: '16 oz', category: 'Pantry', estimatedPrice: 9.99, checked: false },
  { id: '7', name: 'Bell Peppers', quantity: '3 count', category: 'Produce', estimatedPrice: 4.49, checked: false },
  { id: '8', name: 'Ground Turkey', quantity: '2 lbs', category: 'Meat', estimatedPrice: 8.99, checked: true },
  { id: '9', name: 'Oat Milk', quantity: '64 oz', category: 'Dairy', estimatedPrice: 4.49, checked: false },
  { id: '10', name: 'Mixed Greens', quantity: '1 bag', category: 'Produce', estimatedPrice: 3.99, checked: false },
];

const CATEGORIES = ['All', 'Produce', 'Meat', 'Seafood', 'Dairy', 'Grains', 'Pantry'];

export function GroceryDrawer({ isOpen, onClose }: GroceryDrawerProps) {
  const [items, setItems] = useState<GroceryItem[]>(MOCK_GROCERY_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showChecked, setShowChecked] = useState(true);

  const filteredItems = items.filter(item => {
    const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
    const checkedMatch = showChecked || !item.checked;
    return categoryMatch && checkedMatch;
  });

  const toggleItem = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const totalItems = items.length;
  const checkedItems = items.filter(i => i.checked).length;
  const uncheckedItems = totalItems - checkedItems;
  const totalCost = items.reduce((acc, item) => acc + item.estimatedPrice, 0);
  const remainingCost = items.filter(i => !i.checked).reduce((acc, item) => acc + item.estimatedPrice, 0);

  // Group items by category for better organization
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Grocery List">
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-3xl font-semibold text-teal-900">{totalItems}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Remaining</p>
            <p className="text-3xl font-semibold text-orange-600">{uncheckedItems}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Cost</p>
            <p className="text-3xl font-semibold text-teal-900">${totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Still to Buy</p>
            <p className="text-3xl font-semibold text-orange-600">${remainingCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Shopping Progress</p>
            <p className="text-sm font-semibold text-brand-primary">
              {Math.round((checkedItems / totalItems) * 100)}%
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-brand-primary to-brand-dark h-3 rounded-full transition-all duration-500"
              style={{ width: `${(checkedItems / totalItems) * 100}%` }}
            />
          </div>
        </div>

        {/* Category Filter & Options */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
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

          <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
            <input
              type="checkbox"
              id="showChecked"
              checked={showChecked}
              onChange={(e) => setShowChecked(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
            />
            <label htmlFor="showChecked" className="text-sm font-medium text-gray-700 cursor-pointer">
              Show checked items
            </label>
          </div>
        </div>

        {/* Items List by Category */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-teal-900">
              Items ({filteredItems.length})
            </h3>
            <button className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
              + Add Item
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {Object.keys(itemsByCategory).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No items to display
              </div>
            ) : (
              Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                <div key={category} className="p-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-1 bg-brand-primary rounded" />
                    <h4 className="font-semibold text-gray-900">{category}</h4>
                    <span className="text-sm text-gray-500">
                      ({categoryItems.filter(i => !i.checked).length} remaining)
                    </span>
                  </div>

                  {/* Category Items */}
                  <div className="space-y-2 ml-3">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition ${
                          item.checked ? 'opacity-60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(item.id)}
                          className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className={`font-medium ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {item.name}
                            </h5>
                            <span className={`font-semibold ${item.checked ? 'text-gray-400' : 'text-brand-primary'}`}>
                              ${item.estimatedPrice.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{item.quantity}</p>
                        </div>
                      </div>
                    ))}
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
