#!/usr/bin/env node
/**
 * Test Script for Forgot Password Functionality
 * 
 * This script tests the complete forgot password flow:
 * 1. Request password reset
 * 2. Verify OTP
 * 3. Reset password
 * 
 * Run with: node test-forgot-password.js
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/users';
const TEST_EMAIL = 'popatjaydeep21@gmail.com'; // Replace with your test email

// Helper function to make requests
const makeRequest = async (method, endpoint, data = {}) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log(`\n🔄 Making ${method.toUpperCase()} request to: ${endpoint}`);
    console.log('📤 Request data:', JSON.stringify(data, null, 2));

    const response = await axios(config);
    
    console.log('✅ Success Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;

  } catch (error) {
    console.log('❌ Error Response:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    throw error;
  }
};

// Test functions
const testRequestPasswordReset = async () => {
  console.log('\n=== 🔑 TESTING PASSWORD RESET REQUEST ===');
  
  try {
    await makeRequest('POST', '/forgot-password/request', {
      email: TEST_EMAIL
    });
    
    console.log('✅ Password reset request successful!');
    console.log('📧 Check your email for the OTP code');
    
    return true;
  } catch (error) {
    console.log('❌ Password reset request failed');
    return false;
  }
};

const testVerifyOTP = async (otp) => {
  console.log('\n=== 🔍 TESTING OTP VERIFICATION ===');
  
  try {
    await makeRequest('POST', '/forgot-password/verify', {
      email: TEST_EMAIL,
      otp: otp
    });
    
    console.log('✅ OTP verification successful!');
    return true;
  } catch (error) {
    console.log('❌ OTP verification failed');
    return false;
  }
};

const testResetPassword = async (newPassword) => {
  console.log('\n=== 🔒 TESTING PASSWORD RESET ===');
  
  try {
    await makeRequest('POST', '/forgot-password/reset', {
      email: TEST_EMAIL,
      newPassword: newPassword
    });
    
    console.log('✅ Password reset successful!');
    return true;
  } catch (error) {
    console.log('❌ Password reset failed');
    return false;
  }
};

// Test validation errors
const testValidationErrors = async () => {
  console.log('\n=== ⚠️  TESTING VALIDATION ERRORS ===');
  
  const tests = [
    {
      name: 'Invalid email format',
      endpoint: '/forgot-password/request',
      data: { email: 'invalid-email' }
    },
    {
      name: 'Missing email',
      endpoint: '/forgot-password/request',
      data: {}
    },
    {
      name: 'Invalid OTP format',
      endpoint: '/forgot-password/verify',
      data: { email: TEST_EMAIL, otp: '123' }
    },
    {
      name: 'Missing OTP',
      endpoint: '/forgot-password/verify',
      data: { email: TEST_EMAIL }
    },
    {
      name: 'Weak password',
      endpoint: '/forgot-password/reset',
      data: { email: TEST_EMAIL, newPassword: '123' }
    },
    {
      name: 'Missing password',
      endpoint: '/forgot-password/reset',
      data: { email: TEST_EMAIL }
    }
  ];

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    try {
      await makeRequest('POST', test.endpoint, test.data);
      console.log('❌ Expected validation error but got success');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation error correctly caught');
      } else {
        console.log('❓ Unexpected error:', error.message);
      }
    }
  }
};

// Interactive mode
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Main test function
const runTests = async () => {
  console.log('🚀 FORGOT PASSWORD FUNCTIONALITY TEST');
  console.log('=====================================');
  
  try {
    // Test 1: Validation errors
    await testValidationErrors();
    
    // Test 2: Request password reset
    const resetSuccess = await testRequestPasswordReset();
    
    if (resetSuccess) {
      // Test 3: Verify OTP (interactive)
      const otp = await askQuestion('\n📱 Enter the OTP you received: ');
      
      if (otp && otp.length === 6) {
        const verifySuccess = await testVerifyOTP(otp);
        
        if (verifySuccess) {
          // Test 4: Reset password
          const newPassword = await askQuestion('\n🔑 Enter new password (8-15 chars with number & special char): ');
          
          if (newPassword) {
            await testResetPassword(newPassword);
          }
        }
      } else {
        console.log('❌ Invalid OTP format');
      }
    }
    
  } catch (error) {
    console.log('\n💥 Test suite failed:', error.message);
  } finally {
    rl.close();
    console.log('\n✨ Test completed!');
  }
};

// Quick test function for non-interactive mode
const runQuickTest = async () => {
  console.log('🚀 QUICK FORGOT PASSWORD TEST (Validation Only)');
  console.log('===============================================');
  
  await testValidationErrors();
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Update TEST_EMAIL in this script to your email');
  console.log('2. Run: node test-forgot-password.js');
  console.log('3. Follow the interactive prompts');
  console.log('4. Check your email for OTP');
  
  console.log('\n✨ Quick test completed!');
};

// Check if running in quick mode
const args = process.argv.slice(2);
if (args.includes('--quick')) {
  runQuickTest();
} else {
  runTests();
}