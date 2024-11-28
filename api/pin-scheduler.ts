import type { VercelRequest, VercelResponse } from '@vercel/node';
import { addMinutes, isBefore } from 'date-fns';

interface ScheduledPin {
  id: string;
  title: string;
  description: string;
  link?: string;
  imageUrl: string;
  boardId: string;
  scheduledTime: string;
  status: 'pending' | 'scheduled' | 'published' | 'failed';
}

let scheduledPins: ScheduledPin[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return res.status(204).json({});
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ pins: scheduledPins });
    }

    if (req.method === 'POST') {
      const pin = JSON.parse(req.body);
      
      const scheduledTime = new Date(pin.scheduledTime);
      const minScheduleTime = addMinutes(new Date(), 5);
      
      if (isBefore(scheduledTime, minScheduleTime)) {
        return res.status(400).json({
          error: 'Scheduled time must be at least 5 minutes in the future'
        });
      }

      const updatedPins = [...scheduledPins, { ...pin, status: 'scheduled' }];
      scheduledPins = updatedPins;

      return res.status(200).json({
        message: 'Pin scheduled successfully',
        pin: { ...pin, status: 'scheduled' }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Scheduler error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}