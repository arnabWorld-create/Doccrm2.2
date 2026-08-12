'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Plus, Filter, User, Phone, CalendarCheck } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { PageHero } from '@/components/ui/page-hero';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, upcoming, past
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, [filter, statusFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = '/api/appointments?';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filter === 'today') {
        url += `date=${today.toISOString().split('T')[0]}`;
      } else if (filter === 'upcoming') {
        url += `startDate=${today.toISOString().split('T')[0]}`;
      } else if (filter === 'past') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        url += `endDate=${yesterday.toISOString().split('T')[0]}`;
      }
      
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      // API returns { data: [], pagination: {} } — unwrap accordingly
      // Guard against any unexpected shape to prevent .map() crash
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      }
      // Filter out any null/undefined entries that could crash .map()
      setAppointments(list.filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'Scheduled':  return 'info';
      case 'Confirmed':  return 'success';
      case 'Completed':  return 'muted';
      case 'Cancelled':  return 'danger';
      case 'No-Show':    return 'warning';
      default:           return 'muted';
    }
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Schedule"
        eyebrowIcon={<CalendarCheck className="h-3.5 w-3.5" />}
        title="Appointments"
        subtitle="Manage patient appointments and schedules"
        stats={[
          { label: 'Showing', value: appointments.length },
        ]}
        actions={
          <Link href="/appointments/new">
            <button className="flex items-center gap-2 rounded-xl bg-white/20 border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition-all">
              <Plus className="h-4 w-4" />
              Book
            </button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              <Filter className="h-3.5 w-3.5 inline mr-1" />
              Time Period
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none bg-white"
            >
              <option value="all">All Appointments</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No-Show">No-Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-teal border-b-transparent"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No appointments found</p>
            <Link href="/appointments/new" className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-teal hover:bg-brand-teal/90 rounded-lg transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Book First Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/appointments/${appointment.id}`}
                className="block"
              >
                <div className="border border-gray-200 rounded-xl p-4 hover:border-brand-teal/50 hover:shadow-sm transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getStatusVariant(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <span className="text-xs font-medium text-gray-500">
                          {appointment.appointmentType}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5">
                        <User className="h-4 w-4 text-brand-teal flex-shrink-0" />
                        <span className="font-semibold text-gray-900">
                          {appointment.patient ? appointment.patient.name : appointment.tempPatientName}
                        </span>
                        {appointment.patient && (
                          <span className="text-xs text-gray-400">
                            ({appointment.patient.patientId})
                          </span>
                        )}
                        {!appointment.patient && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                            Walk-in
                          </span>
                        )}
                      </div>

                      {(appointment.patient?.contact || appointment.tempPatientContact) && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{appointment.patient?.contact || appointment.tempPatientContact}</span>
                        </div>
                      )}

                      {appointment.reason && (
                        <p className="text-sm text-gray-500 mt-1.5">
                          <span className="font-medium text-gray-600">Reason:</span> {appointment.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5">
                      <div className="flex items-center gap-1.5 text-brand-teal">
                        <Calendar className="h-4 w-4" />
                        <span className="font-semibold text-sm">
                          {appointment.appointmentDate ? formatDate(appointment.appointmentDate) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{appointment.appointmentTime ?? '—'}</span>
                        <span className="text-xs text-gray-400">({appointment.duration ?? 0}m)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
