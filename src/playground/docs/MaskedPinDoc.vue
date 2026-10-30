<script setup>
import { ref } from 'vue';
import NuPinInput from '../../components/NuPinInput.vue';
import NuMaskedInput from '../../components/NuMaskedInput.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { t } from '../../locales.js';

const pinValue = ref('637');
const pinStatus = ref('normal');
const pinMasked = ref(false);
const lastSubmittedPin = ref('');

const cardMaskValue = ref('42424242');
const macMaskValue = ref('001B638445E6');
const licenseMaskValue = ref('NANO2026PRO');

const handlePinSubmit = (payload) => {
  lastSubmittedPin.value = payload.unmasked;
  pinStatus.value = payload.unmasked === '637420' ? 'success' : 'error';
};

const usageSnippet = `<script setup>
import { ref } from 'vue';
import { NuPinInput, NuMaskedInput } from '@gkucmierz/nano-ui';

const otpCode = ref('');
const macAddress = ref('');
<\/script>

<template>
  <!-- 6-digit 2FA PIN with 120s countdown timer -->
  <NuPinInput
    v-model="otpCode"
    :length="6"
    :expires-in="120"
    action-label="Verify"
  />

  <!-- Declarative HEX MAC Address Mask -->
  <NuMaskedInput
    v-model="macAddress"
    mask="HH:HH:HH:HH:HH:HH"
    action-label="Bind MAC"
  />
</template>`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('maskedInput.title') }}</h2>
    <p>{{ t('maskedInput.desc') }}</p>

    <!-- SECTION 1: NuPinInput -->
    <div class="demo-section">
      <h3>{{ t('maskedInput.sec1Title') }}</h3>
      <p class="demo-desc">
        {{ t('maskedInput.sec1Desc') }} (Try typing <code>637420</code> for valid state!)
      </p>

      <div class="pin-stage">
        <NuPinInput
          v-model="pinValue"
          :length="6"
          :masked="pinMasked"
          :status="pinStatus"
          :expires-in="180"
          action-label="Verify 2FA"
          @submit="handlePinSubmit"
        />

        <div class="pin-controls">
          <label class="toggle-item">
            <NanoSwitch v-model="pinMasked" size="compact" />
            <span>Mask digits (•)</span>
          </label>
          <button type="button" class="nano-btn nano-btn-secondary nano-btn-sm" @click="pinValue = '637420'; pinStatus = 'success'">
            Fill Valid (637-420)
          </button>
          <button type="button" class="nano-btn nano-btn-secondary nano-btn-sm" @click="pinValue = ''; pinStatus = 'normal'">
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- SECTION 2: NuMaskedInput Gallery -->
    <div class="demo-section">
      <h3>{{ t('maskedInput.sec2Title') }}</h3>
      <p class="demo-desc">{{ t('maskedInput.sec2Desc') }}</p>

      <div class="mask-grid">
        <div class="mask-card">
          <span class="mask-label">Payment Card (<code>#### #### #### ####</code>)</span>
          <NuMaskedInput v-model="cardMaskValue" mask="#### #### #### ####" />
        </div>

        <div class="mask-card">
          <span class="mask-label">MAC Address HEX (<code>HH:HH:HH:HH:HH:HH</code>)</span>
          <NuMaskedInput v-model="macMaskValue" mask="HH:HH:HH:HH:HH:HH" />
        </div>

        <div class="mask-card">
          <span class="mask-label">License Key (<code>XXXX-XXXX-XXXX</code>)</span>
          <NuMaskedInput v-model="licenseMaskValue" mask="XXXX-XXXX-XXXX" action-label="Activate" />
        </div>
      </div>
    </div>

    <NanoCodeBlock :code="usageSnippet" lang="vue" title="Usage & API Example" />
  </div>
</template>

<style scoped>
.pin-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 28px;
  border-radius: 10px;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
}

.pin-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  cursor: pointer;
}

.mask-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.mask-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-radius: 10px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.mask-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
}
</style>
