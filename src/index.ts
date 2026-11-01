import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Event } from './models/Event';
import { verifyToken, AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'TogetherWe Server is running!' });
});

// Create Event Route (Private)
app.post('/api/events', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, eventType, thumbnail, location, date, creatorEmail, expectedVolunteers } = req.body;

    // Validation: No past dates allowed
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (eventDate < today) {
      return res.status(400).json({ message: 'Event date must be in the future.' });
    }

    const newEvent = new Event({
      title, description, eventType, thumbnail, location, 
      date: eventDate, creatorEmail, expectedVolunteers
    });

    await newEvent.save();
    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get Upcoming Events 
app.get('/api/events/upcoming', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    
    const events = await Event.find({ date: { $gte: today } })
      .sort({ date: 1 })
      .limit(6);

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get All Events
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const { type, search } = req.query;
    
    let query: any = { date: { $gte: today } };

    if (type && type !== 'All Events') {
      query.eventType = type;
    }
    
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Sort by newest (date ascending)
    const events = await Event.find(query).sort({ date: 1 });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get Single Event Details
app.get('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    if(typeof eventId !== 'string' || !mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ message: 'Invalid Event ID' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Join Event (Private)
app.post('/api/events/:id/join', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    const userEmail = req.body.email;

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already joined
    if (event.attendees.includes(userEmail)) {
      return res.status(400).json({ message: 'You have already joined this event.' });
    }

    event.attendees.push(userEmail);
    await event.save();

    res.status(200).json({ message: 'Successfully joined the event!', event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update Event (Private - Only Creator)
app.put('/api/events/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Validation: Only creator can update
    if (event.creatorEmail !== req.body.creatorEmail) {
       return res.status(403).json({ message: 'You can only update your own events.' });
    }

    // Validation: No past dates
    if (req.body.date) {
      const eventDate = new Date(req.body.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      if (eventDate < today) {
        return res.status(400).json({ message: 'Event date must be in the future.' });
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete Event (Private - Only Creator)
app.delete('/api/events/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Validation: Only creator can delete
    if (event.creatorEmail !== req.body.creatorEmail) {
       return res.status(403).json({ message: 'You can only delete your own events.' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get Events Created by User (Manage Events)
app.get('/api/my-events', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = req.query.email as string;
    const events = await Event.find({ creatorEmail: email }).sort({ date: -1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get Events Joined by User (Joined Events)
app.get('/api/joined-events', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = req.query.email as string;
    const events = await Event.find({ attendees: email }).sort({ date: 1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Dashboard Stats 
app.get('/api/dashboard-stats', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = req.query.email as string;
    
    const eventsCreated = await Event.countDocuments({ creatorEmail: email });
    const eventsJoined = await Event.countDocuments({ attendees: email });
    const upcomingCreated = await Event.countDocuments({ creatorEmail: email, date: { $gte: new Date() } });
    
    const allEvents = await Event.find({});
    const uniqueAttendees = new Set();
    allEvents.forEach(e => e.attendees.forEach(a => uniqueAttendees.add(a)));

    res.status(200).json({
      eventsCreated,
      eventsJoined,
      upcomingCreated,
      communityMembers: uniqueAttendees.size + 250
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
