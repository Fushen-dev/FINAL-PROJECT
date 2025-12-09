// checkout.js - Realistic Mock Checkout System
class CheckoutSystem {
  constructor() {
    this.cart = [];
    this.isOpen = false;
    this.formData = {
      fullName: '',
      email: '',
      address: '',
      city: '',
      zip: '',
      cardNumber: '',
      expiry: '',
      cvv: ''
    };
    this.errors = {};
    
    this.createCheckoutModal();
  }

  addToCart(product) {
    const item = { ...product, cartId: Date.now() };
    this.cart.push(item);
    this.showNotification(`${product.name} added to cart!`, 'success');
    this.updateCartCount();
  }

  removeFromCart(cartId) {
    this.cart = this.cart.filter(item => item.cartId !== cartId);
    this.updateCartCount();
  }

  getTotal() {
    return this.cart.reduce((sum, item) => sum + item.price, 0);
  }

  updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
      countEl.textContent = this.cart.length;
      countEl.style.display = this.cart.length > 0 ? 'flex' : 'none';
    }
  }

  formatCardNumber(value) {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19);
  }

  formatExpiry(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  }

  validateForm() {
    const errors = {};
    
    if (!this.formData.fullName.trim()) errors.fullName = 'Name is required';
    if (!this.formData.email.includes('@')) errors.email = 'Valid email required';
    if (!this.formData.address.trim()) errors.address = 'Address is required';
    if (!this.formData.city.trim()) errors.city = 'City is required';
    if (this.formData.zip.length < 5) errors.zip = 'Valid ZIP required';
    if (this.formData.cardNumber.replace(/\s/g, '').length < 16) errors.cardNumber = 'Valid card number required';
    if (this.formData.expiry.length < 5) errors.expiry = 'Valid expiry required';
    if (this.formData.cvv.length < 3) errors.cvv = 'Valid CVV required';

    this.errors = errors;
    return Object.keys(errors).length === 0;
  }

  createCheckoutModal() {
    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.className = 'checkout-modal';
    modal.innerHTML = `
      <div class="checkout-overlay"></div>
      <div class="checkout-content">
        <div class="checkout-header">
          <h2>🔒 Secure Checkout</h2>
          <button class="close-checkout" onclick="checkout.closeCheckout()">✕</button>
        </div>
        <div class="checkout-body">
          <div id="checkout-summary"></div>
          <div id="checkout-form"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .checkout-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; }
      .checkout-modal.active { display: flex; align-items: center; justify-content: center; }
      .checkout-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); }
      .checkout-content { position: relative; background: #1a1a1a; border-radius: 16px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; border: 1px solid #333; }
      .checkout-header { background: #111; border-bottom: 1px solid #333; padding: 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
      .checkout-header h2 { margin: 0; font-size: 24px; color: #fff; }
      .close-checkout { background: none; border: none; color: #999; font-size: 32px; cursor: pointer; padding: 0; line-height: 1; }
      .close-checkout:hover { color: #fff; }
      .checkout-body { padding: 24px; }
      .checkout-summary { background: #0f0f10; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
      .checkout-summary h3 { margin: 0 0 16px 0; font-size: 18px; color: #fff; }
      .summary-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #ccc; }
      .summary-total { border-top: 2px solid #333; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; color: #0077c9; }
      .form-section { margin-bottom: 24px; }
      .form-section h3 { margin: 0 0 12px 0; font-size: 16px; color: #fff; }
      .form-field { margin-bottom: 12px; }
      .form-field label { display: block; margin-bottom: 6px; font-size: 13px; color: #aaa; font-weight: 600; }
      .form-field input { width: 100%; padding: 12px; border-radius: 8px; background: #0b0b0b; border: 1px solid #333; color: #fff; font-size: 14px; box-sizing: border-box; }
      .form-field input:focus { outline: none; border-color: #0077c9; }
      .form-field.error input { border-color: #c93030; }
      .form-field .error-msg { color: #c93030; font-size: 12px; margin-top: 4px; }
      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .pay-button { width: 100%; background: linear-gradient(90deg, #00c977, #00d97e); color: #000; padding: 16px; border-radius: 10px; border: none; font-size: 18px; font-weight: 800; cursor: pointer; margin-top: 8px; }
      .pay-button:hover { opacity: 0.9; }
      .pay-button:disabled { background: #333; cursor: not-allowed; }
      .checkout-notice { text-align: center; font-size: 13px; color: #666; margin-top: 16px; }
      .notification { position: fixed; top: 20px; right: 20px; background: #00c977; color: #000; padding: 16px 24px; border-radius: 10px; font-weight: 700; z-index: 10001; animation: slideIn 0.3s ease-out; box-shadow: 0 8px 24px rgba(0,201,119,0.4); }
      .notification.error { background: #c93030; color: #fff; }
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      #cart-count { position: absolute; top: -8px; right: -8px; background: #c93030; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
      @media(max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  openCheckout() {
    if (this.cart.length === 0) {
      this.showNotification('Your cart is empty!', 'error');
      return;
    }

    this.isOpen = true;
    const modal = document.getElementById('checkout-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    this.renderCheckoutContent();
  }

  closeCheckout() {
    this.isOpen = false;
    const modal = document.getElementById('checkout-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }

  renderCheckoutContent() {
    // Render summary
    const summaryEl = document.getElementById('checkout-summary');
    summaryEl.innerHTML = `
      <h3>Order Summary</h3>
      ${this.cart.map(item => `
        <div class="summary-item">
          <span>${item.name}</span>
          <span>$${item.price.toFixed(2)}</span>
        </div>
      `).join('')}
      <div class="summary-total">
        <span>Total:</span>
        <span>$${this.getTotal().toFixed(2)}</span>
      </div>
    `;

    // Render form
    const formEl = document.getElementById('checkout-form');
    formEl.innerHTML = `
      <div class="form-section">
        <h3>Contact Information</h3>
        <div class="form-field ${this.errors.fullName ? 'error' : ''}">
          <label>Full Name *</label>
          <input type="text" id="fullName" placeholder="John Doe" value="${this.formData.fullName}">
          ${this.errors.fullName ? `<div class="error-msg">${this.errors.fullName}</div>` : ''}
        </div>
        <div class="form-field ${this.errors.email ? 'error' : ''}">
          <label>Email Address *</label>
          <input type="email" id="email" placeholder="john@example.com" value="${this.formData.email}">
          ${this.errors.email ? `<div class="error-msg">${this.errors.email}</div>` : ''}
        </div>
      </div>

      <div class="form-section">
        <h3>Shipping Address</h3>
        <div class="form-field ${this.errors.address ? 'error' : ''}">
          <label>Street Address *</label>
          <input type="text" id="address" placeholder="123 Main St" value="${this.formData.address}">
          ${this.errors.address ? `<div class="error-msg">${this.errors.address}</div>` : ''}
        </div>
        <div class="form-row">
          <div class="form-field ${this.errors.city ? 'error' : ''}">
            <label>City *</label>
            <input type="text" id="city" placeholder="Boston" value="${this.formData.city}">
            ${this.errors.city ? `<div class="error-msg">${this.errors.city}</div>` : ''}
          </div>
          <div class="form-field ${this.errors.zip ? 'error' : ''}">
            <label>ZIP Code *</label>
            <input type="text" id="zip" placeholder="02101" value="${this.formData.zip}">
            ${this.errors.zip ? `<div class="error-msg">${this.errors.zip}</div>` : ''}
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>💳 Payment Information</h3>
        <div class="form-field ${this.errors.cardNumber ? 'error' : ''}">
          <label>Card Number *</label>
          <input type="text" id="cardNumber" placeholder="4444 4444 4444 4444" value="${this.formData.cardNumber}" style="font-family: monospace;">
          ${this.errors.cardNumber ? `<div class="error-msg">${this.errors.cardNumber}</div>` : ''}
        </div>
        <div class="form-row">
          <div class="form-field ${this.errors.expiry ? 'error' : ''}">
            <label>Expiry Date *</label>
            <input type="text" id="expiry" placeholder="MM/YY" value="${this.formData.expiry}" style="font-family: monospace;">
            ${this.errors.expiry ? `<div class="error-msg">${this.errors.expiry}</div>` : ''}
          </div>
          <div class="form-field ${this.errors.cvv ? 'error' : ''}">
            <label>CVV *</label>
            <input type="text" id="cvv" placeholder="123" value="${this.formData.cvv}" style="font-family: monospace;">
            ${this.errors.cvv ? `<div class="error-msg">${this.errors.cvv}</div>` : ''}
          </div>
        </div>
      </div>

      <button class="pay-button" onclick="checkout.processPayment()">
        Pay $${this.getTotal().toFixed(2)}
      </button>
      
      <div class="checkout-notice">
        🔒 This is a mock checkout. No real payment will be processed.
      </div>
    `;

    // Attach input listeners
    this.attachFormListeners();
  }

  attachFormListeners() {
    const fields = ['fullName', 'email', 'address', 'city', 'zip', 'cardNumber', 'expiry', 'cvv'];
    
    fields.forEach(field => {
      const input = document.getElementById(field);
      if (input) {
        input.addEventListener('input', (e) => {
          let value = e.target.value;

          if (field === 'cardNumber') {
            value = this.formatCardNumber(value);
            e.target.value = value;
          } else if (field === 'expiry') {
            value = this.formatExpiry(value);
            e.target.value = value;
          } else if (field === 'cvv') {
            value = value.replace(/\D/g, '').slice(0, 3);
            e.target.value = value;
          } else if (field === 'zip') {
            value = value.replace(/\D/g, '').slice(0, 5);
            e.target.value = value;
          }

          this.formData[field] = value;
          
          if (this.errors[field]) {
            delete this.errors[field];
            this.renderCheckoutContent();
          }
        });
      }
    });
  }

  processPayment() {
    if (!this.validateForm()) {
      this.renderCheckoutContent();
      return;
    }

    const button = document.querySelector('.pay-button');
    button.disabled = true;
    button.textContent = 'Processing Payment...';

    setTimeout(() => {
      this.closeCheckout();
      this.showNotification(`✅ Order confirmed! Thank you ${this.formData.fullName}!`, 'success');
      
      this.cart = [];
      this.updateCartCount();
      this.formData = {
        fullName: '', email: '', address: '', city: '', zip: '',
        cardNumber: '', expiry: '', cvv: ''
      };
      this.errors = {};
    }, 2500);
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
  }
}

// Initialize checkout system
const checkout = new CheckoutSystem();
