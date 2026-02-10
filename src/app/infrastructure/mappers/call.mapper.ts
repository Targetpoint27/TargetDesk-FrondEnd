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
      custom_motif: apiCall.custom_motif,
      object: apiCall.object,
      summary: apiCall.summary,
      status: apiCall.status,
      urgency: apiCall.urgency,
      resolution_summary: apiCall.resolution_summary,
      final_result: apiCall.final_result,
      
      // Callback fields
      scheduled_callback_date: apiCall.scheduled_callback_date,
      scheduled_callback_time: apiCall.scheduled_callback_time,
      callback_reason: apiCall.callback_reason,
      callback_notes: apiCall.callback_notes,
      callback_attempts: apiCall.callback_attempts || 0,
      last_callback_at: apiCall.last_callback_at,
      
      // Outbound fields
      outbound_reason: apiCall.outbound_reason,
      call_result: apiCall.call_result,
      call_duration_seconds: apiCall.call_duration_seconds,
      
      // Related to
      related_to_type: apiCall.related_to_type,
      related_to_id: apiCall.related_to_id,
      
      // Timestamps
      created_by: apiCall.created_by,
      closed_by: apiCall.closed_by,
      closed_at: apiCall.closed_at,
      created_at: apiCall.created_at,
      updated_at: apiCall.updated_at,
      deleted_at: apiCall.deleted_at,
      reopened_at: apiCall.reopened_at,
      
      // Treatment
      treatment_time_seconds: apiCall.treatment_time_seconds,
      reopen_reason: apiCall.reopen_reason,
      
      // Meta
      notes_count: apiCall.notes_count,
      time_elapsed: apiCall.time_elapsed,
      is_active: apiCall.is_active,
      
      // Relationships
      department: apiCall.department,
      assignee: apiCall.assignee,
      assigned_agent: apiCall.assigned_agent,
      client: apiCall.client,
      contact: apiCall.contact,
      creator: apiCall.creator,
      closer: apiCall.closer,
      motif: apiCall.motif,
      notes: apiCall.notes
    };
  }
}