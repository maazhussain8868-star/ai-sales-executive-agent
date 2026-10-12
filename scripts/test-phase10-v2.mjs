/**
 * PRD v2.1 Phase 10 Verification Suite: Regional Languages (Telugu, Tamil, Marathi) & CRM Adapters (HubSpot, Zoho)
 */

import assert from 'node:assert';
import { detectInCallOptOut } from '../src/lib/voice/opt-out-detector.ts';
import { HubSpotCrmAdapter } from '../src/lib/adapters/crm/hubspot-crm.ts';
import { ZohoCrmAdapter } from '../src/lib/adapters/crm/zoho-crm.ts';
import { REGIONAL_LANGUAGES } from '../src/app/actions/crm-integrations-v2.ts';

console.log('Running PRD v2.1 Phase 10 Verification Suite: Regional Languages & CRM Adapters...\n');

// 1. Regional Languages Voice Models & Disclosure
console.log('1. Testing Regional Languages Voice Configuration (Telugu, Tamil, Marathi)...');
assert.strictEqual(REGIONAL_LANGUAGES.length, 6, '6 supported regional languages');
const teLang = REGIONAL_LANGUAGES.find((l) => l.code === 'te');
const taLang = REGIONAL_LANGUAGES.find((l) => l.code === 'ta');
const mrLang = REGIONAL_LANGUAGES.find((l) => l.code === 'mr');

assert.ok(teLang && teLang.aiDisclosureLine.includes('ఆర్టిఫిషియల్ ఇంటెలిజెన్స్'), 'Telugu disclosure present');
assert.ok(taLang && taLang.aiDisclosureLine.includes('AI விற்பனை பிரதிநிதி'), 'Tamil disclosure present');
assert.ok(mrLang && mrLang.aiDisclosureLine.includes('AI सेल्स प्रतिनिधी'), 'Marathi disclosure present');
console.log('✓ Regional languages (Telugu, Tamil, Marathi) configured with native AI disclosures.\n');

// 2. Multilingual In-Call Opt-Out Detection
console.log('2. Testing Multilingual In-Call Opt-Out Refusal Detection across TE, TA, MR...');

// Telugu Tests
const teOptOutNative = detectInCallOptOut('దయచేసి నాకు మళ్ళీ కాల్ చేయకండి');
assert.strictEqual(teOptOutNative.isOptOut, true, 'Telugu native script refusal detected');
assert.strictEqual(teOptOutNative.detectedLanguage, 'te');

const teOptOutLatin = detectInCallOptOut('Malli call cheyakandi please');
assert.strictEqual(teOptOutLatin.isOptOut, true, 'Telugu Latin script refusal detected');
assert.strictEqual(teOptOutLatin.detectedLanguage, 'te');

// Tamil Tests
const taOptOutNative = detectInCallOptOut('எனக்கு கால் பண்ணாதீங்க');
assert.strictEqual(taOptOutNative.isOptOut, true, 'Tamil native script refusal detected');
assert.strictEqual(taOptOutNative.detectedLanguage, 'ta');

const taOptOutLatin = detectInCallOptOut('Please marubadiyum call pannadheenga');
assert.strictEqual(taOptOutLatin.isOptOut, true, 'Tamil Latin script refusal detected');
assert.strictEqual(taOptOutLatin.detectedLanguage, 'ta');

// Marathi Tests
const mrOptOutNative = detectInCallOptOut('मला पुन्हा कॉल करू नका');
assert.strictEqual(mrOptOutNative.isOptOut, true, 'Marathi native script refusal detected');
assert.strictEqual(mrOptOutNative.detectedLanguage, 'mr');

const mrOptOutLatin = detectInCallOptOut('Aamhi interested nahi call karu naka');
assert.strictEqual(mrOptOutLatin.isOptOut, true, 'Marathi Latin script refusal detected');
assert.strictEqual(mrOptOutLatin.detectedLanguage, 'mr');

console.log('✓ In-call opt-out engine accurately recognizes refusal across Telugu, Tamil, and Marathi.\n');

// 3. HubSpot CRM Adapter Verification
console.log('3. Testing HubSpot CRM Adapter (Contact & Deal Pipeline Sync)...');
const hubspot = new HubSpotCrmAdapter('test_hubspot_token');

// Test A: Qualified Lead sync (creates contact + deal)
const hsQualifiedResult = await hubspot.syncLead({
  leadId: 'lead_hs_01',
  phone: '+919876543210',
  name: 'Vikram Mehta',
  company: 'Mehta Logistics India',
  status: 'QUALIFIED',
  summary: 'Handles 500 leads/mo in logistics operations.',
  score: 85,
  meetingTime: 'Tomorrow 11:30 AM IST',
});

assert.strictEqual(hsQualifiedResult.success, true);
assert.ok(hsQualifiedResult.providerRecordId.includes('|'), 'Qualified lead creates both contact and deal ID');

const contacts = hubspot.getSyncedContacts();
assert.strictEqual(contacts.length, 1);
assert.strictEqual(contacts[0].firstname, 'Vikram');
assert.strictEqual(contacts[0].lifecyclestage, 'salesqualifiedlead');

const deals = hubspot.getSyncedDeals();
assert.strictEqual(deals.length, 1);
assert.strictEqual(deals[0].dealstage, 'appointmentscheduled');
assert.ok(deals[0].dealname.includes('Mehta Logistics India'));

// Test B: Unqualified Lead sync (creates contact only, no deal)
const hsUnqualifiedResult = await hubspot.syncLead({
  leadId: 'lead_hs_02',
  phone: '+919876543211',
  name: 'Pooja Verma',
  company: 'UrbanStyle B2C',
  status: 'DISQUALIFIED_B2C',
  summary: 'B2C eCommerce retail store.',
  score: 20,
});

assert.strictEqual(hsUnqualifiedResult.success, true);
assert.strictEqual(hubspot.getSyncedDeals().length, 1, 'No new deal created for unqualified lead');
console.log('✓ HubSpot adapter created Contact and associated Pipeline Deal for qualified prospect.\n');

// 4. Zoho CRM Adapter Verification
console.log('4. Testing Zoho CRM Adapter (Lead Status & Activity Sync)...');
const zoho = new ZohoCrmAdapter('test_zoho_token');

const zohoResult = await zoho.syncLead({
  leadId: 'lead_zoho_01',
  phone: '+919876543212',
  name: 'Amit Patel',
  company: 'FinServe Advisors',
  status: 'QUALIFIED',
  summary: 'Financial consulting firm looking for AI outreach.',
  score: 80,
  nextAction: 'Product Walkthrough',
});

assert.strictEqual(zohoResult.success, true);
assert.ok(zohoResult.providerRecordId.startsWith('zoho_lead_'));

const zohoLeads = zoho.getSyncedLeads();
assert.strictEqual(zohoLeads.length, 1);
assert.strictEqual(zohoLeads[0].Last_Name, 'Patel');
assert.strictEqual(zohoLeads[0].Lead_Status, 'Qualified');
assert.ok(zohoLeads[0].Company.includes('FinServe Advisors'));
console.log('✓ Zoho CRM adapter synced lead record with mapped Lead_Status and call notes.\n');

// 5. CRM Input Validation & Error Handling
console.log('5. Testing CRM Provider Missing Field Validation...');
const emptyResult = await hubspot.syncLead({
  leadId: 'lead_empty',
  phone: '',
  name: '',
  status: 'NEW',
});

assert.strictEqual(emptyResult.success, false);
assert.ok(emptyResult.error.includes('Name and Phone are missing'));
console.log('✓ CRM adapters cleanly reject incomplete leads without throwing exceptions.\n');

console.log('========================================================================');
console.log('ALL PRD V2.1 PHASE 10 LOCALIZATION & CRM ADAPTER CHECKS PASSED!');
console.log('========================================================================\n');
