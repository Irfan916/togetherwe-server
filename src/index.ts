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

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
