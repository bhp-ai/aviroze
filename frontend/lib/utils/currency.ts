/**
 * Format number to Indonesian Rupiah format with dots as thousand separators
 * Example: 1500000 -> "1.500.000"
 */
export function formatIDR(amount: number): string {
  // Round to nearest integer (no decimals for IDR)
  const rounded = Math.round(amount);

  // Convert to string and add dots as thousand separators
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format number to Indonesian Rupiah with "Rp" prefix
 * Example: 1500000 -> "Rp 1.500.000"
 */
export function formatRupiah(amount: number): string {
  return `Rp ${formatIDR(amount)}`;
}

/**
 * Format number to Indonesian Rupiah with "IDR" prefix
 * Example: 1500000 -> "IDR 1.500.000"
 */
export function formatCurrency(amount: number): string {
  return `IDR ${formatIDR(amount)}`;
}

/**
 * Calculate discounted price for a product
 * Returns null if no discount is applied
 */
export function calculateDiscountedPrice(price: number, discount?: any): number | null {
  if (!discount || !discount.enabled) return null;

  if (discount.type === 'percentage') {
    return price - (price * (discount.value / 100));
  } else if (discount.type === 'fixed') {
    return Math.max(0, price - discount.value); // Ensure price doesn't go negative
  }
  return null;
}

/**
 * Get the final price of a product (discounted if applicable, otherwise original price)
 */
export function getFinalPrice(price: number, discount?: any): number {
  const discountedPrice = calculateDiscountedPrice(price, discount);
  return discountedPrice !== null ? discountedPrice : price;
}
