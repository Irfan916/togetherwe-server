import { Schema, model } from 'mongoose';

const eventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  eventType: { 
    type: String, 
    required: true,
    enum: ['Cleanup', 'Plantation', 'Donation', 'Blood Donation', 'Charity', 'Food Distribution', 'Others']
  },
  thumbnail: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  creatorEmail: { type: String, required: true },
  attendees: [{ type: String }], // Array of user emails who joined
  expectedVolunteers: { type: Number, default: 50 } 
}, { timestamps: true });

export const Event = model('Event', eventSchema);