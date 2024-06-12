import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { user } = await getSession(req, res);
    const { chatId, annotation } = req.body;

    if (!chatId || !annotation) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const client = await clientPromise;
    const db = client.db('NsfDatabase');

    const result = await db.collection('chats').updateOne(
      { userId: user.sub, _id: new ObjectId(chatId) },
      {
        $push: {
          messages: {
            _id: new ObjectId(),
            role: 'annotation',
            content: annotation,
            messageTime: new Date(),
          },
        },
      },
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: 'Annotation saved successfully' });
    } else {
      res.status(500).json({ message: 'Failed to save annotation' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
