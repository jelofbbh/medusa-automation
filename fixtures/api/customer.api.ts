
import type { APIRequestContext, APIResponse } from '@playwright/test';

// ==========================================
// 1. DATA INTERFACES
// ==========================================

export interface CustomerData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface CustomerUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
}

// API response
export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface AuthResponse {
  token?: string;
  verification_required?: boolean;
}

interface CustomerResponse {
  customer: Customer;
}

// ==========================================
// 2. CUSTOMER API CLASS
// ==========================================

export class CustomerApi {
  private token?: string;
  private readonly baseUrl: string;

  constructor(
    private readonly request: APIRequestContext,
    baseUrl: string,
    private readonly publishableApiKey: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // ==========================================
  // 3. HELPER METHODS
  // ==========================================

  // Generate request headers
  private getHeaders(authenticated = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': this.publishableApiKey,
    };

    if (authenticated) {
      if (!this.token) {
        throw new Error(
          'Customer is not authenticated. Please login first.'
        );
      }

      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Handle API response
  private async handleResponse<T>(response: APIResponse): Promise<T> {
    if (!response.ok()) {
      const errorBody = await response.text();

      throw new Error(
        `API Error: ${response.status()} ${response.statusText()} - ${errorBody}`
      );
    }

    return (await response.json()) as T;
  }

  // ==========================================
  // 4. API METHODS
  // ==========================================

  // Register a new customer
  async createCustomer(data: CustomerData): Promise<Customer> {

    // Step 1: Get registration token
    const registrationResponse = await this.request.post(
      `${this.baseUrl}/auth/customer/emailpass/register`,
      {
        data: {
          email: data.email,
          password: data.password,
        },
        headers: this.getHeaders(),
      }
    );

    const authData = await this.handleResponse<AuthResponse>(
      registrationResponse
    );

    if (!authData.token) {
      throw new Error('Failed to obtain customer registration token');
    }

    // Step 2: Create customer profile using registration token
    const customerResponse = await this.request.post(
      `${this.baseUrl}/store/customers`,
      {
        data: {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        },
        headers: {
          ...this.getHeaders(),
          Authorization: `Bearer ${authData.token}`,
        },
      }
    );

    const result = await this.handleResponse<CustomerResponse>(
      customerResponse
    );

    return result.customer;
  }

  // Customer login
  async loginCustomer(
    email: string,
    password: string
  ): Promise<string> {

    const response = await this.request.post(
      `${this.baseUrl}/auth/customer/emailpass`,
      {
        data: {
          email,
          password,
        },
        headers: this.getHeaders(),
      }
    );

    const result = await this.handleResponse<AuthResponse>(response);

    if (result.verification_required || !result.token) {
      throw new Error(
        'Customer login requires additional verification or returned no token'
      );
    }

    this.token = result.token;

    return this.token;
  }

  // Get logged-in customer
  async getCustomer(): Promise<Customer> {

    const response = await this.request.get(
      `${this.baseUrl}/store/customers/me`,
      {
        headers: this.getHeaders(true),
      }
    );

    const result = await this.handleResponse<CustomerResponse>(response);

    return result.customer;
  }

  // Update logged-in customer
  async updateCustomer(
    data: CustomerUpdateData
  ): Promise<Customer> {

    const response = await this.request.post(
      `${this.baseUrl}/store/customers/me`,
      {
        data,
        headers: this.getHeaders(true),
      }
    );

    const result = await this.handleResponse<CustomerResponse>(response);

    return result.customer;
  }
}
