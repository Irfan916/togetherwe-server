import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Event, EVENT_TYPES } from './models/Event';
import { verifyToken, AuthRequest } from './middleware/auth';

dotenv.config();

const requiredEnv = ['MONGODB_URI', 'JWKS_URL', 'AUTH_ISSUER'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''));

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ---------- Helpers ----------

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const isValidId = (id: unknown): id is string =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const serverError = (res: Response, error: unknown, context: string) => {
  console.error(context, error);
  return res.status(500).json({ message: 'Server error' });
};

type EventInput = {
  title?: string;
  description?: string;
  eventType?: string;
  thumbnail?: string;
  location?: string;
  date?: Date;
  expectedVolunteers?: number;
};

const validateEventInput = (body: any, partial = false): { data?: EventInput; error?: string } => {
  const data: EventInput = {};
  const has = (key: string) => body?.[key] !== undefined;

  if (!partial) {
    for (const key of ['title', 'description', 'eventType', 'thumbnail', 'location', 'date']) {
      if (!has(key) || body[key] === '') return { error: `${key} is required.` };
    }
  }

  if (has('title')) {
    const value = typeof body.title === 'string' ? body.title.trim() : '';
    if (value.length < 3 || value.length > 100) {
      return { error: 'Title must be between 3 and 100 characters.' };
    }
    data.title = value;
  }

  if (has('description')) {
    const value = typeof body.description === 'string' ? body.description.trim() : '';
    if (value.length < 10 || value.length > 1000) {
      return { error: 'Description must be between 10 and 1000 characters.' };
    }
    data.description = value;
  }

  if (has('eventType')) {
    if (typeof body.eventType !== 'string' || !(EVENT_TYPES as readonly string[]).includes(body.eventType)) {
      return { error: 'Please choose a valid event type.' };
    }
    data.eventType = body.eventType;
  }

  if (has('thumbnail')) {
    const value = typeof body.thumbnail === 'string' ? body.thumbnail.trim() : '';
    if (!isHttpUrl(value)) return { error: 'Thumbnail must be a valid image URL.' };
    data.thumbnail = value;
  }

  if (has('location')) {
    const value = typeof body.location === 'string' ? body.location.trim() : '';
    if (value.length < 3 || value.length > 150) {
      return { error: 'Location must be between 3 and 150 characters.' };
    }
    data.location = value;
  }

  if (has('date')) {
    const eventDate = parseDate(body.date);
    if (!eventDate) return { error: 'Please provide a valid event date.' };
    if (eventDate < startOfToday()) return { error: 'Event date must be in the future.' };
    data.date = eventDate;
  }

  if (has('expectedVolunteers')) {
    const value = Number(body.expectedVolunteers);
    if (!Number.isInteger(value) || value < 1 || value > 100000) {
      return { error: 'Expected volunteers must be a whole number of at least 1.' };
    }
    data.expectedVolunteers = value;
  }

  return { data };
};

// ---------- Routes ----------

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'TogetherWe Server is running!' });
});

// Create Event Route (Private)
app.post('/api/events', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = validateEventInput(req.body);
    if (error || !data) {
      return res.status(400).json({ message: error });
    }

    // The creator always comes from the verified token, never from the request body
    const newEvent = new Event({ ...data, creatorEmail: req.user!.email });

    await newEvent.save();
    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    serverError(res, error, 'Create event failed:');
  }
});

// Get Upcoming Events (home page, 6 most recent upcoming)
app.get('/api/events/upcoming', async (req: Request, res: Response) => {
  try {
    const events = await Event.find({ date: { $gte: startOfToday() } })
      .sort({ date: 1 })
      .limit(6);

    res.status(200).json(events);
  } catch (error) {
    serverError(res, error, 'Get upcoming events failed:');
  }
});

// Get All Upcoming Events (with optional type filter and title search)
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const { type, search } = req.query;

    const query: Record<string, unknown> = { date: { $gte: startOfToday() } };

    if (typeof type === 'string' && (EVENT_TYPES as readonly string[]).includes(type)) {
      query.eventType = type;
    }

    if (typeof search === 'string' && search.trim()) {
      query.title = { $regex: escapeRegex(search.trim().slice(0, 100)), $options: 'i' };
    }

    // Soonest event first
    const events = await Event.find(query).sort({ date: 1 });

    res.status(200).json(events);
  } catch (error) {
    serverError(res, error, 'Get events failed:');
  }
});

// Get Events Created by User (Manage Events)
app.get('/api/my-events', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const events = await Event.find({ creatorEmail: req.user!.email }).sort({ date: -1 });
    res.status(200).json(events);
  } catch (error) {
    serverError(res, error, 'Get my events failed:');
  }
});

// Get Events Joined by User (Joined Events)
app.get('/api/joined-events', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const events = await Event.find({ attendees: req.user!.email }).sort({ date: 1 });
    res.status(200).json(events);
  } catch (error) {
    serverError(res, error, 'Get joined events failed:');
  }
});

// Dashboard Stats
app.get('/api/dashboard-stats', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = req.user!.email;

    const [eventsCreated, eventsJoined, upcomingCreated, attendeeEmails] = await Promise.all([
      Event.countDocuments({ creatorEmail: email }),
      Event.countDocuments({ attendees: email }),
      Event.countDocuments({ creatorEmail: email, date: { $gte: startOfToday() } }),
      Event.distinct('attendees'),
    ]);

    res.status(200).json({
      eventsCreated,
      eventsJoined,
      upcomingCreated,
      communityMembers: attendeeEmails.length,
    });
  } catch (error) {
    serverError(res, error, 'Dashboard stats failed:');
  }
});

// Get Single Event Details
app.get('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    if (!isValidId(eventId)) {
      return res.status(400).json({ message: 'Invalid Event ID' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(200).json(event);
  } catch (error) {
    serverError(res, error, 'Get event failed:');
  }
});

// Join Event (Private)
app.post('/api/events/:id/join', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    if (!isValidId(eventId)) {
      return res.status(400).json({ message: 'Invalid Event ID' });
    }

    const userEmail = req.user!.email;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.date < startOfToday()) {
      return res.status(400).json({ message: 'This event has already taken place.' });
    }

    // Check if already joined
    if (event.attendees.includes(userEmail)) {
      return res.status(400).json({ message: 'You have already joined this event.' });
    }

    // $addToSet is atomic, so two quick clicks can never add the same email twice
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $addToSet: { attendees: userEmail } },
      { new: true }
    );

    res.status(200).json({ message: 'Successfully joined the event!', event: updatedEvent });
  } catch (error) {
    serverError(res, error, 'Join event failed:');
  }
});

// Update Event (Private - Only Creator)
app.put('/api/events/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    if (!isValidId(eventId)) {
      return res.status(400).json({ message: 'Invalid Event ID' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Only the creator (identified by the verified token) can update
    if (event.creatorEmail !== req.user!.email) {
      return res.status(403).json({ message: 'You can only update your own events.' });
    }

    // Only whitelisted fields are accepted: attendees and creatorEmail can never be overwritten
    const { data, error } = validateEventInput(req.body, true);
    if (error || !data) {
      return res.status(400).json({ message: error });
    }

    event.set(data);
    await event.save();

    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    serverError(res, error, 'Update event failed:');
  }
});

// Delete Event (Private - Only Creator)
app.delete('/api/events/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    if (!isValidId(eventId)) {
      return res.status(400).json({ message: 'Invalid Event ID' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Only the creator (identified by the verified token) can delete
    if (event.creatorEmail !== req.user!.email) {
      return res.status(403).json({ message: 'You can only delete your own events.' });
    }

    await Event.findByIdAndDelete(eventId);
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    serverError(res, error, 'Delete event failed:');
  }
});

// Unknown routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
