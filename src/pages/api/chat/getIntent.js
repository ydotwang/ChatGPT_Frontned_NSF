import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { user } = await getSession(req, res);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { chatId } = req.body;
      if (!chatId) {
        return res.status(400).json({ message: 'Chat ID is required' });
      }

      const client = await clientPromise;
      const db = client.db('NsfDatabase');
      const chat = await db.collection('chats').findOne({
        _id: new ObjectId(chatId),
        userId: user.sub,
      });

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      res.status(200).json({ intent: chat.intent });
    } catch (e) {
      console.error('An error occurred in getIntent API: ', e);
      res.status(500).json({ message: 'Failed to fetch intent' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
