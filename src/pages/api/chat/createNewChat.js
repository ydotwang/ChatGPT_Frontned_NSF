import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req, res) {
  try {
    // Check the HTTP method
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getSession(req, res);
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { user } = session;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const newUserMessage = {
      role: 'user',
      content: message,
    };

    const client = await clientPromise;
    const db = client.db('NsfDatabase');
    const chat = await db.collection('chats').insertOne({
      userId: user.sub,
      messages: [newUserMessage],
      title: message,
      createdAt: new Date(),
    });

    res.status(200).json({
      _id: chat.insertedId.toString(),
      messages: [newUserMessage],
      title: message,
    });
  } catch (e) {
    console.error('Error occurred in create new chat: ', e);
    res.status(500).json({ message: e });
  }
}
