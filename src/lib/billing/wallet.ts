import { WalletLedger } from '@/types/phase7'

export interface ConsumeMinutesResult {
  success: boolean
  remainingBalance: number
  consumedMinutes: number
  message: string
}

export interface RechargeWalletResult {
  newBalance: number
  rechargeId: string
  totalMinutesPurchased: number
  invoiceSnippet: string
}

/**
 * Deducts consumed minutes from the workspace wallet.
 */
export function consumeMinutes(
  wallet: WalletLedger,
  secondsUsed: number
): { updatedWallet: WalletLedger; result: ConsumeMinutesResult } {
  const minutesToDeduct = Math.ceil(secondsUsed / 60)

  if (wallet.currentMinutesBalance < minutesToDeduct) {
    return {
      updatedWallet: wallet,
      result: {
        success: false,
        remainingBalance: wallet.currentMinutesBalance,
        consumedMinutes: 0,
        message: `Insufficient minutes balance (${wallet.currentMinutesBalance} available, ${minutesToDeduct} needed). Please recharge your wallet.`
      }
    }
  }

  const updatedWallet: WalletLedger = {
    ...wallet,
    currentMinutesBalance: wallet.currentMinutesBalance - minutesToDeduct,
    totalMinutesConsumed: wallet.totalMinutesConsumed + minutesToDeduct
  }

  return {
    updatedWallet,
    result: {
      success: true,
      remainingBalance: updatedWallet.currentMinutesBalance,
      consumedMinutes: minutesToDeduct,
      message: `Successfully deducted ${minutesToDeduct} minutes. Balance remaining: ${updatedWallet.currentMinutesBalance}.`
    }
  }
}

/**
 * Recharges minutes for a workspace.
 */
export function rechargeWallet(
  wallet: WalletLedger,
  minutesToAdd: number,
  amountInr: number,
  paymentReference: string = `pay_${Date.now()}`
): { updatedWallet: WalletLedger; result: RechargeWalletResult } {
  const rechargeId = `rech_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const newBalance = wallet.currentMinutesBalance + minutesToAdd

  const updatedWallet: WalletLedger = {
    ...wallet,
    currentMinutesBalance: newBalance,
    totalMinutesPurchased: wallet.totalMinutesPurchased + minutesToAdd,
    rechargeHistory: [
      {
        id: rechargeId,
        amountInr,
        minutesAdded: minutesToAdd,
        paymentId: paymentReference,
        timestamp: new Date().toISOString()
      },
      ...wallet.rechargeHistory
    ]
  }

  return {
    updatedWallet,
    result: {
      newBalance,
      rechargeId,
      totalMinutesPurchased: updatedWallet.totalMinutesPurchased,
      invoiceSnippet: `Invoice #${rechargeId}: Added ${minutesToAdd} minutes (INR ₹${amountInr.toLocaleString()}) to workspace ${wallet.workspaceId}.`
    }
  }
}
