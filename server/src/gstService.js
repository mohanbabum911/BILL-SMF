import { config } from './config.js';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/;

const mockGstinData = {
  legalName: 'SMF FABRICATIONS PRIVATE LIMITED',
  tradeName: 'SMF',
  status: 'Active',
  registrationDate: '2019-05-12',
  taxpayerType: 'Regular',
  state: 'Karnataka',
  address: 'Peenya 2nd Stage, Bengaluru, Karnataka, India',
};

export function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') return false;
  const normalized = gstin.trim().toUpperCase();
  return GSTIN_PATTERN.test(normalized);
}

async function callExternalApi(gstin) {
  if (!config.gstApiUrl || !config.gstApiKey) {
    throw new Error('GST API credentials are not configured.');
  }

  const response = await fetch(config.gstApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.gstApiKey,
    },
    body: JSON.stringify({ gstin }),
  });

  if (!response.ok) {
    throw new Error('GST verification API request failed');
  }

  const result = await response.json();
  return result;
}

export async function verifyGSTIN(gstin) {
  const normalized = gstin.trim().toUpperCase();

  if (!validateGSTIN(normalized)) {
    throw new Error('Invalid GSTIN format. Example: 29ABCDE1234F1Z5');
  }

  if (!config.gstApiUrl || !config.gstApiKey) {
    return {
      success: true,
      source: 'mock',
      data: {
        gstin: normalized,
        legalName: mockGstinData.legalName,
        tradeName: mockGstinData.tradeName,
        status: mockGstinData.status,
        registrationDate: mockGstinData.registrationDate,
        taxpayerType: mockGstinData.taxpayerType,
        state: mockGstinData.state,
        address: mockGstinData.address,
      },
    };
  }

  try {
    const result = await callExternalApi(normalized);
    return {
      success: true,
      source: 'api',
      data: {
        gstin: normalized,
        legalName: result.legalName || result.name || '',
        tradeName: result.tradeName || '',
        status: result.status || result.gstStatus || '',
        registrationDate: result.registrationDate || '',
        taxpayerType: result.taxpayerType || '',
        state: result.state || '',
        address: result.address || result.registeredAddress || '',
      },
    };
  } catch (error) {
    return {
      success: false,
      source: 'api',
      error: error.message || 'GSTIN verification failed',
    };
  }
}
