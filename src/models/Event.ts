import { Schema, model } from 'mongoose';

export const EVENT_TYPES = [
  'Cleanup',
  'Plantation',
  'Donation',
  'Blood Donation',
  'Charity',
  'Food Distribution',
  'Others',
] as const;

const eventSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  eventType: {
    type: String,
    required: true,
    enum: [...EVENT_TYPES]
  },
  thumbnail: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  creatorEmail: { type: String, required: true },
  attendees: [{ type: String }], // Array of user emails who joined
  expectedVolunteers: { type: Number, default: 50 }
}, { timestamps: true });

eventSchema.index({ date: 1 });
eventSchema.index({ creatorEmail: 1 });
eventSchema.index({ attendees: 1 });

export const Event = model('Event', eventSchema);
