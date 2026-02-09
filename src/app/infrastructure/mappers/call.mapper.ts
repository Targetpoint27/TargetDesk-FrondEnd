import { Injectable } from '@angular/core';
import { Call } from '../../domain/models/call.model';

@Injectable()
export class CallMapper {
  toDomain(apiCall: any): Call {
    return {
      id: apiCall.id,
      call_id: apiCall.call_id,
      type: apiCall.type,
      phone_number: apiCall.phone_number,
      caller_name: apiCall.caller_name,
      caller_email: apiCall.caller_email,
      client_id: apiCall.client_id,
      contact_id: apiCall.contact_id,
      department_id: apiCall.department_id,
      assigned_to: apiCall.assigned_to,
      motif_id: apiCall.motif_id,
      object: apiCall.object,
      summary: apiCall.summary,
      status: apiCall.status,
      urgency: apiCall.urgency,
      resolution_summary: apiCall.resolution_summary,
      scheduled_callback_date: apiCall.scheduled_callback_date,
      scheduled_callback_time: apiCall.scheduled_callback_time,
      callback_reason: apiCall.callback_reason,
      callback_notes: apiCall.callback_notes,
      callback_attempts: apiCall.callback_attempts || 0,
      last_callback_at: apiCall.last_callback_at,
      call_duration: apiCall.call_duration,
      notes_count: apiCall.notes_count,
      created_by: apiCall.created_by,
      closed_by: apiCall.closed_by,
      closed_at: apiCall.closed_at,
      created_at: apiCall.created_at,
      updated_at: apiCall.updated_at,
      department: apiCall.department,
      assignee: apiCall.assignee,
      client: apiCall.client,
      creator: apiCall.creator,
      motif: apiCall.motif
    };
  }
}