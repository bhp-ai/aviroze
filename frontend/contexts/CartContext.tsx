'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/lib/services/products';
import { getFinalPrice } from '@/lib/utils/currency';
import { authService } from '@/lib/services/auth';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, size?: string, color?: string) => boolean;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
      }
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes (but skip initial load)
  useEffect(() => {
    if (isClient && isInitialized) {
      localStorage.setItem('cart', JSON.stringify(items));
      // Dispatch custom event for cart updates
      window.dispatchEvent(new Event('cartUpdate'));
    }
  }, [items, isClient, isInitialized]);

  const addToCart = (product: Product, quantity = 1, size?: string, color?: string): boolean => {
    // Check if user is logged in
    const user = authService.getUser();
    if (!user) {
      // User not logged in
      return false;
    }

    // Normalize empty strings to undefined for consistent matching
    const normalizedSize = size || undefined;
    const normalizedColor = color || undefined;

    setItems((prevItems) => {
      // Check if product already exists in cart
      const existingItemIndex = prevItems.findIndex(
        (item) =>
          item.product.id === product.id &&
          (item.selectedSize || undefined) === normalizedSize &&
          (item.selectedColor || undefined) === normalizedColor
      );

      if (existingItemIndex > -1) {
        // Update quantity if item exists
        const newItems = [...prevItems];
        const newQuantity = newItems[existingItemIndex].quantity + quantity;
        newItems[existingItemIndex] = { ...newItems[existingItemIndex], quantity: newQuantity };
        return newItems;
      } else {
        // Add new item
        return [
          ...prevItems,
          {
            product,
            quantity,
            selectedSize: normalizedSize,
            selectedColor: normalizedColor,
          },
        ];
      }
    });

    return true;
  };

  const removeFromCart = (index: number) => {
    setItems((prevItems) =>
      prevItems.filter((_, i) => i !== index)
    );
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item, i) =>
        i === index ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      // Use discounted price if available, otherwise use original price
      const price = getFinalPrice(item.product.price, item.product.discount);
      return total + price * item.quantity;
    }, 0);
  };

  const getCartCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
