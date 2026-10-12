import {
  CalendarProvider,
  CalendarSlot,
  BookMeetingRequest,
  BookMeetingResult
} from '@/types/adapters'

export class FakeCalendarProvider implements CalendarProvider {
  name = 'fake-calendar'

  async getAvailableSlots(
    startDate: string,
    endDate: string,
    timeZone: string
  ): Promise<CalendarSlot[]> {
    return [
      {
        startTime: `${startDate}T10:00:00.000Z`,
        endTime: `${startDate}T10:30:00.000Z`,
        timeZone
      },
      {
        startTime: `${startDate}T14:30:00.000Z`,
        endTime: `${startDate}T15:00:00.000Z`,
        timeZone
      }
    ]
  }

  async bookMeeting(request: BookMeetingRequest): Promise<BookMeetingResult> {
    const providerEventId = `fake_cal_evt_${Date.now()}`
    return {
      providerEventId,
      meetingUrl: `https://meet.google.com/fake-${Math.random().toString(36).substring(2, 6)}`,
      confirmed: true,
      scheduledAt: request.startTime
    }
  }
}
