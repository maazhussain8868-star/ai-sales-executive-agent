/**
 * PRD v2.1 Phase 5: Follow-Up Scheduler
 * Stores callback times, time zones, reasons, and prior conversation context.
 * Gated strictly by canContact before triggering callbacks. Supports edit & cancel.
 */

import { FollowUpTask } from '@/types/booking-followup-v2';
import { canContact } from '@/lib/safety/can-contact';

const FOLLOW_UP_STORE = new Map<string, FollowUpTask>();

export class FollowUpScheduler {
  /**
   * Schedules a future callback task with preserved conversation context.
   */
  public createFollowUp(params: {
    workspaceId: string;
    leadId: string;
    leadPhone: string;
    leadName: string;
    scheduledAt: string;
    timeZone?: string;
    reason: string;
    priorContext: string;
  }): FollowUpTask {
    const taskId = `fup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const task: FollowUpTask = {
      id: taskId,
      workspaceId: params.workspaceId,
      leadId: params.leadId,
      leadPhone: params.leadPhone,
      leadName: params.leadName,
      scheduledAt: params.scheduledAt,
      timeZone: params.timeZone || 'Asia/Kolkata',
      reason: params.reason,
      priorContext: params.priorContext,
      status: 'PENDING',
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    FOLLOW_UP_STORE.set(taskId, task);
    return task;
  }

  /**
   * Updates an existing follow-up schedule or prior context.
   */
  public updateFollowUp(
    taskId: string,
    updates: Partial<Pick<FollowUpTask, 'scheduledAt' | 'reason' | 'priorContext' | 'timeZone'>>
  ): FollowUpTask | undefined {
    const task = FOLLOW_UP_STORE.get(taskId);
    if (!task) return undefined;

    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }

  /**
   * Cancels a pending follow-up task.
   */
  public cancelFollowUp(taskId: string): boolean {
    const task = FOLLOW_UP_STORE.get(taskId);
    if (!task) return false;

    task.status = 'CANCELLED';
    task.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Processes all due follow-ups through the canContact safety gate.
   */
  public async processDueFollowUps(currentTime: Date = new Date()): Promise<{
    triggered: FollowUpTask[];
    blocked: Array<{ task: FollowUpTask; reason: string }>;
    deferred: FollowUpTask[];
  }> {
    const triggered: FollowUpTask[] = [];
    const blocked: Array<{ task: FollowUpTask; reason: string }> = [];
    const deferred: FollowUpTask[] = [];

    for (const task of FOLLOW_UP_STORE.values()) {
      if (task.status !== 'PENDING') continue;

      const scheduleTime = new Date(task.scheduledAt);
      if (scheduleTime > currentTime) {
        deferred.push(task);
        continue;
      }

      // MANDATORY SAFETY GATE: canContact right before triggering follow-up
      const contactGate = await canContact(
        {
          id: task.leadId,
          workspaceId: task.workspaceId,
          phone: task.leadPhone,
          timeZone: task.timeZone,
        },
        'voice',
        currentTime
      );

      if (!contactGate.allowed) {
        blocked.push({ task, reason: contactGate.reason });
        // If outside approved hours or Sunday, keep pending for next window
        continue;
      }

      task.status = 'TRIGGERED';
      task.attemptCount += 1;
      task.updatedAt = currentTime.toISOString();
      triggered.push(task);
    }

    return { triggered, blocked, deferred };
  }

  public getTask(taskId: string): FollowUpTask | undefined {
    return FOLLOW_UP_STORE.get(taskId);
  }

  public getAllTasks(workspaceId?: string): FollowUpTask[] {
    const list = Array.from(FOLLOW_UP_STORE.values());
    if (workspaceId) return list.filter((t) => t.workspaceId === workspaceId);
    return list;
  }

  public clearStore(): void {
    FOLLOW_UP_STORE.clear();
  }
}
